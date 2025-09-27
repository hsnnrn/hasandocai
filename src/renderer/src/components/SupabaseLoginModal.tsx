import { useEffect, useState } from 'react'
import { ArrowLeft, X, CheckCircle, Loader2 } from 'lucide-react'
import { auth } from '@/lib/supabase'

// Extend Window interface to include supabaseAPI
declare global {
  interface Window {
    supabaseAPI: {
      startSupabaseAuth: (options: { method?: 'local' | 'custom'; preferExternal?: boolean }) => Promise<any>
      getAuthStatus: () => Promise<any>
      logoutSupabase: () => Promise<any>
    }
  }
}

interface SupabaseLoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SupabaseLoginModal({ isOpen, onClose }: SupabaseLoginModalProps) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [showLoginForm, setShowLoginForm] = useState<boolean>(false)
  const [, setEmail] = useState<string>('')
  const [, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [projects, setProjects] = useState<any[]>([])
  const [, setSelectedProject] = useState<any>(null)
  const [showProjectSelection, setShowProjectSelection] = useState<boolean>(false)

  // Check if user is already logged in from localStorage
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Önce localStorage'dan kontrol et
        const storedLogin = localStorage.getItem('supabase-login')
        if (storedLogin) {
          const loginData = JSON.parse(storedLogin)
          const now = Date.now()
          const oneDay = 24 * 60 * 60 * 1000 // 24 saat
          
          // 24 saat geçmemişse kullanıcı hala giriş yapmış sayılır
          if (loginData.timestamp && (now - loginData.timestamp) < oneDay) {
            setIsLoggedIn(true)
            setUserInfo(loginData)
            console.log('User session restored from localStorage')
            return
          } else {
            // Süresi dolmuş, temizle
            localStorage.removeItem('supabase-login')
          }
        }
        
        // localStorage'da yoksa veya süresi dolmuşsa, Supabase session kontrol et
        const { session, error } = await auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
          // Hata durumunda da temizle
          setIsLoggedIn(false)
          setUserInfo(null)
          return
        }
        
        if (session) {
          // Session varsa ama localStorage'da yoksa, yeni session oluştur
          setIsLoggedIn(true)
          const userData = {
            user: session.user,
            session: session,
            timestamp: Date.now()
          }
          setUserInfo(userData)
          // localStorage'a kaydet
          localStorage.setItem('supabase-login', JSON.stringify(userData))
        } else {
          // Session yoksa, tamamen temizle
          setIsLoggedIn(false)
          setUserInfo(null)
          // localStorage'ı da temizle
          localStorage.removeItem('supabase-login')
        }
      } catch (error) {
        console.error('Error checking auth status:', error)
        setIsLoggedIn(false)
        setUserInfo(null)
      }
    }

    checkAuthStatus()
  }, [])

  useEffect(() => {
    console.log('Modal opened, isLoggedIn:', isLoggedIn)
    if (isOpen) {
      if (isLoggedIn) {
        // Already logged in, show user info
        console.log('Already logged in, showing user info')
        return
      } else {
        // Show login form
        console.log('Showing login form')
        setShowLoginForm(true)
        setError('')
      }
    }
  }, [isOpen, isLoggedIn])

  const handleBack = () => {
    onClose()
  }

  const handleClose = () => {
    onClose()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Supabase OAuth akışını başlat
      console.log('Starting Supabase OAuth flow...')
      
      const result = await window.supabaseAPI.startSupabaseAuth({
        method: 'local',
        preferExternal: false
      })

      if (result.ok) {
        console.log('OAuth successful:', result)
        
        // Gerçek kullanıcı bilgilerini kullan
        const userInfo = {
          user: result.user || {
            email: 'user@supabase.com',
            user_metadata: {
              full_name: 'Supabase User'
            }
          },
          session: {
            access_token: 'authenticated',
            refresh_token: 'authenticated'
          },
          timestamp: Date.now()
        }
        
        // Projeleri al ve göster
        if (result.projects) {
          setProjects(result.projects)
          setShowProjectSelection(true)
          setUserInfo(userInfo)
        } else {
          // Proje yoksa direkt giriş yap
          setIsLoggedIn(true)
          setUserInfo(userInfo)
          
          // Save to localStorage
          localStorage.setItem('supabase-login', JSON.stringify(userInfo))
          
          // Dispatch custom event
          window.dispatchEvent(new CustomEvent('supabase-login-changed', {
            detail: { isLoggedIn: true, userInfo: userInfo }
          }))
          
          console.log('OAuth login successful')
          onClose()
        }
      } else {
        setError(result.error || 'OAuth authentication failed')
      }
    } catch (error) {
      console.error('OAuth error:', error)
      setError('OAuth failed: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProjectSelect = (project: any) => {
    setSelectedProject(project)
    
    // Seçilen proje ile birlikte kullanıcı bilgilerini güncelle
    const updatedUserInfo = {
      ...userInfo,
      selectedProject: project
    }
    
    setIsLoggedIn(true)
    setUserInfo(updatedUserInfo)
    setShowProjectSelection(false)
    
    // Save to localStorage
    localStorage.setItem('supabase-login', JSON.stringify(updatedUserInfo))
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('supabase-login-changed', {
      detail: { isLoggedIn: true, userInfo: updatedUserInfo }
    }))
    
    if (project) {
      console.log('Project selected:', project)
    } else {
      console.log('Continuing without selecting a project')
    }
    onClose()
  }

  const handleLogout = async () => {
    console.log('Logging out...')
    setIsLoading(true)
    
    try {
      // OAuth logout
      const result = await window.supabaseAPI.logoutSupabase()
      if (!result.ok) {
        console.error('OAuth logout failed:', result.error)
        setError('Logout failed: ' + result.error)
        return
      }
      
      // Tüm authorization çerezlerini temizle
      try {
        // Supabase session'ı temizle
        await auth.signOut()
        
        // Tüm localStorage'ı temizle
        localStorage.clear()
        console.log('All localStorage cleared')
        
        // Session storage'ı da temizle
        sessionStorage.clear()
        console.log('All sessionStorage cleared')
        
        // Çerezleri temizle - daha kapsamlı
        const cookies = document.cookie.split(";");
        const domains = [
          window.location.hostname,
          `.${window.location.hostname}`,
          'supabase.com',
          '.supabase.com',
          'api.supabase.com',
          '.api.supabase.com',
          'frontend-assets.supabase.com',
          '.frontend-assets.supabase.com',
          'ph.supabase.com',
          '.ph.supabase.com',
          'configcat.supabase.com',
          '.configcat.supabase.com'
        ];
        
        const paths = ['/', '/dashboard', '/auth', '/api'];
        
        for (let cookie of cookies) {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          
          if (name) {
            // Her domain ve path kombinasyonu için çerez sil
            for (const domain of domains) {
              for (const path of paths) {
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain}`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain};secure`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain};httponly`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain};secure;httponly`;
              }
            }
          }
        }
        console.log('All cookies cleared')
        
        // IndexedDB'yi temizle
        if ('indexedDB' in window) {
          try {
            const databases = await indexedDB.databases();
            for (const db of databases) {
              if (db.name) {
                indexedDB.deleteDatabase(db.name);
              }
            }
            console.log('IndexedDB cleared')
          } catch (idbError) {
            console.warn('IndexedDB clear error:', idbError)
          }
        }
        
        // Cache API'yi temizle
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('Cache API cleared')
          } catch (cacheError) {
            console.warn('Cache clear error:', cacheError)
          }
        }
        
      } catch (clearError) {
        console.warn('Error clearing storage:', clearError)
      }
      
      // Reset modal state
      setIsLoggedIn(false)
      setUserInfo(null)
      setShowLoginForm(false)
      setEmail('')
      setPassword('')
      setError('')
      console.log('Modal state reset')
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('supabase-login-changed', {
        detail: { isLoggedIn: false, userInfo: null }
      }))
      console.log('Custom event dispatched')
      
      // Also dispatch a storage event manually to ensure all listeners are notified
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'supabase-login',
        newValue: null,
        oldValue: null,
        storageArea: localStorage,
        url: window.location.href
      }))
      console.log('Storage event dispatched')
      
      console.log('OAuth logout completed, closing modal')
      
      // Close modal
      onClose()
    } catch (error) {
      console.error('Logout error:', error)
      setError('Logout failed: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-md mx-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20">
        {/* Custom Header with Buttons */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Geri</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-md">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
                <path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.281l-.401.562a1.04 1.04 0 0 0 .836 1.659H12v8.959a.396.396 0 0 0 .716.233l9.081-12.118.401-.562a1.04 1.04 0 0 0-.836-1.66z"/>
              </svg>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
              supabase
            </span>
          </div>
          
          <button
            onClick={handleClose}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="text-sm font-medium">Kapat</span>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-8 text-center">
          {showProjectSelection ? (
            /* Project Selection State */
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                  <h2 className="text-2xl font-bold">Select Project</h2>
                </div>
                <p className="text-gray-600 text-sm">
                  Choose a project from your Supabase organization
                </p>
              </div>
              
              
              {/* Project Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Available Projects:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {projects.length > 0 ? (
                    projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleProjectSelect(project)}
                        className="w-full p-3 text-left bg-white border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{project.name}</div>
                        <div className="text-sm text-gray-500">ID: {project.ref}</div>
                        <div className="text-sm text-gray-500">Status: {project.status}</div>
                        {project.organization_name && (
                          <div className="text-sm text-gray-500">Organization: {project.organization_name}</div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="w-full p-4 text-center bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-yellow-800 font-medium">No Projects Found</div>
                      <div className="text-yellow-600 text-sm mt-1">
                        You don't have any Supabase projects yet. Create a project in your Supabase dashboard first.
                      </div>
                      <div className="mt-3 flex flex-col gap-2">
                        <button
                          onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                          className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-md transition-colors"
                        >
                          Open Supabase Dashboard
                        </button>
                        <button
                          onClick={() => handleProjectSelect(null)}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-colors"
                        >
                          Continue without selecting project
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : isLoggedIn ? (
            /* Logged In State */
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                  <h2 className="text-2xl font-bold">Successfully Connected!</h2>
                </div>
                <p className="text-gray-600 text-sm">
                  You are now logged in to Supabase
                </p>
              </div>
              
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <span>Logout</span>
                )}
              </button>
            </div>
          ) : showLoginForm ? (
            /* Login Form State */
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Sign in to Supabase</h2>
                <p className="text-gray-600 text-sm">
                  Enter your credentials to connect to Supabase
                </p>
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              
              {/* OAuth Login Button */}
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-center space-y-2">
                    <div className="h-12 w-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-md mx-auto">
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                        <path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.281l-.401.562a1.04 1.04 0 0 0 .836 1.659H12v8.959a.396.396 0 0 0 .716.233l9.081-12.118.401-.562a1.04 1.04 0 0 0-.836-1.66z"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Connect to Supabase</h3>
                    <p className="text-sm text-gray-600">
                      Click the button below to open Supabase's official OAuth page where you can sign in with your account.
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Opening Supabase OAuth...</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                        <path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.281l-.401.562a1.04 1.04 0 0 0 .836 1.659H12v8.959a.396.396 0 0 0 .716.233l9.081-12.118.401-.562a1.04 1.04 0 0 0-.836-1.66z"/>
                      </svg>
                      <span>Sign in with Supabase</span>
                    </>
                  )}
                </button>
                
                <div className="text-xs text-gray-500 text-center">
                  This will open Supabase's official OAuth page in a secure popup window.
                </div>
              </div>
            </div>
          ) : (
            /* Loading State */
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Connecting to Supabase</h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Checking authentication status...
                </p>
              </div>
              
              {/* Modern Loading Animation */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="h-12 w-12 border-4 border-green-100 rounded-full"></div>
                  <div className="absolute top-0 left-0 h-12 w-12 border-4 border-transparent border-t-green-500 rounded-full animate-spin"></div>
                </div>
                
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
              
              {/* Modern Status */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-center space-x-2 text-green-700">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Checking authentication...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
