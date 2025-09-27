// File: src/renderer/components/SupabaseConnectModal.tsx
import { useState } from 'react'
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

interface SupabaseConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function SupabaseConnectModal({ isOpen, onClose, onSuccess }: SupabaseConnectModalProps) {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleTestConnection = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setError('Please enter both Project URL and Anon Key')
      return
    }

    setIsTesting(true)
    setError('')
    setSuccess(false)

    try {
      // Create Supabase client
      const supabase = createClient(url.trim(), anonKey.trim())
      
      // Test connection by getting session
      const { data, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw new Error('Invalid URL or Anon Key. Please check your credentials.')
      }

      // Optional: Test reachability
      try {
        const response = await fetch(`${new URL(url.trim()).origin}/auth/v1`)
        // 404 is normal for auth endpoint, we just check if server is reachable
      } catch (reachError) {
        console.warn('Reachability check failed, but connection test passed')
      }

      // Save configuration via IPC
      const result = await window.electron.ipcRenderer.invoke('save-supabase-config', {
        url: url.trim(),
        anonKey: anonKey.trim()
      })

      if (result.ok) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 1500)
      } else {
        throw new Error(result.error || 'Failed to save configuration')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed')
    } finally {
      setIsTesting(false)
    }
  }

  const handleClose = () => {
    setUrl('')
    setAnonKey('')
    setError('')
    setSuccess(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-md mx-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-md">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
                <path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.281l-.401.562a1.04 1.04 0 0 0 .836 1.659H12v8.959a.396.396 0 0 0 .716.233l9.081-12.118.401-.562a1.04 1.04 0 0 0-.836-1.66z"/>
              </svg>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
              Supabase Configuration
            </span>
          </div>
          
          <button
            onClick={handleClose}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="text-sm font-medium">Close</span>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <CheckCircle className="h-8 w-8" />
                <h2 className="text-xl font-bold">Configuration Saved!</h2>
              </div>
              <p className="text-gray-600 text-sm">
                Supabase connection has been configured successfully.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-gray-900">Connect to Supabase</h2>
                <p className="text-gray-600 text-sm">
                  Enter your Supabase project credentials to get started.
                </p>
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              
              {/* Form */}
              <div className="space-y-4">
                <div className="text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    disabled={isTesting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                
                <div className="text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anon Key
                  </label>
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="Your anon/public key"
                    disabled={isTesting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleClose}
                    disabled={isTesting}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting || !url.trim() || !anonKey.trim()}
                    className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Testing...</span>
                      </>
                    ) : (
                      <span>Test & Save</span>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Security Note */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-xs">
                  <strong>Security Note:</strong> Only use your anon/public key. Never share your service_role key.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
