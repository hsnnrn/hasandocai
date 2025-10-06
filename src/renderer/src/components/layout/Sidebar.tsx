import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  FileText,
  History,
  Layers,
  Settings,
  RefreshCw,
  Database,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  HardDrive,
  FolderOpen,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { SupabaseLoginModal } from '@/components/SupabaseLoginModal'
import { LocalStorageModal } from '@/components/LocalStorageModal'
import { StorageCleanupModal } from '@/components/StorageCleanupModal'
import { useNavigate } from 'react-router-dom'

const navItems = [
  {
    name: 'Converter',
    href: '/',
    icon: FileText,
  },
  {
    name: 'Groups',
    href: '/groups',
    icon: FolderOpen,
  },
  {
    name: 'History',
    href: '/history',
    icon: History,
  },
  {
    name: 'Templates',
    href: '/templates',
    icon: Layers,
  },
  {
    name: 'AI Chat',
    href: '/ai-chat',
    icon: MessageSquare,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const navigate = useNavigate()
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false)
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false)
  const [isLocalStorageModalOpen, setIsLocalStorageModalOpen] = useState(false)
  const [isStorageCleanupModalOpen, setIsStorageCleanupModalOpen] = useState(false)
  const [isLocalStorageDropdownOpen, setIsLocalStorageDropdownOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isLocalStorageEnabled, setIsLocalStorageEnabled] = useState<boolean>(false)

  // Check login status and local storage status on component mount
  useEffect(() => {
    const savedLogin = localStorage.getItem('supabase-login')
    if (savedLogin) {
      try {
        const loginData = JSON.parse(savedLogin)
        setIsLoggedIn(true)
        setUserInfo(loginData)
      } catch (error) {
        console.error('Error parsing saved login data:', error)
        localStorage.removeItem('supabase-login')
      }
    }

    // Check local storage status
    const localStorageEnabled = localStorage.getItem('local-storage-enabled')
    setIsLocalStorageEnabled(localStorageEnabled === 'true')
  }, [])

  // Listen for storage changes and custom events (when login status changes)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Handle supabase-login changes
      if (event.key === 'supabase-login') {
        console.log('Storage change detected for supabase-login:', event.newValue)
        if (event.newValue) {
          try {
            const loginData = JSON.parse(event.newValue)
            setIsLoggedIn(true)
            setUserInfo(loginData)
          } catch (error) {
            console.error('Error parsing saved login data:', error)
            localStorage.removeItem('supabase-login')
            setIsLoggedIn(false)
            setUserInfo(null)
          }
        } else {
          setIsLoggedIn(false)
          setUserInfo(null)
        }
      }
      
      // Handle local-storage-enabled changes
      if (event.key === 'local-storage-enabled') {
        console.log('Storage change detected for local-storage-enabled:', event.newValue)
        setIsLocalStorageEnabled(event.newValue === 'true')
      }
    }

    const handleLoginChange = (event: CustomEvent) => {
      console.log('Login status changed:', event.detail)
      setIsLoggedIn(event.detail.isLoggedIn)
      setUserInfo(event.detail.userInfo)
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('supabase-login-changed', handleLoginChange as EventListener)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('supabase-login-changed', handleLoginChange as EventListener)
    }
  }, [])

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-bold">Document Converter</h1>
            <p className="text-xs text-muted-foreground">AI-powered conversion</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </NavLink>
          ))}
          
          {/* Integrations Section */}
          <div className="pt-4">
            <button
              onClick={() => setIsIntegrationsOpen(!isIntegrationsOpen)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent w-full transition-colors"
            >
              <Database className="h-4 w-4" />
              <span>Integrations</span>
              {isIntegrationsOpen ? (
                <ChevronDown className="h-4 w-4 ml-auto" />
              ) : (
                <ChevronRight className="h-4 w-4 ml-auto" />
              )}
            </button>
            
            {isIntegrationsOpen && (
              <div className="ml-6 mt-2 space-y-1">
                <button 
                  onClick={() => setIsSupabaseModalOpen(true)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent w-full transition-colors"
                >
                  <div className="h-4 w-4 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-500" fill="currentColor">
                      <path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.281l-.401.562a1.04 1.04 0 0 0 .836 1.659H12v8.959a.396.396 0 0 0 .716.233l9.081-12.118.401-.562a1.04 1.04 0 0 0-.836-1.66z"/>
                    </svg>
                  </div>
                  <span>Supabase</span>
                  {isLoggedIn && (
                    <CheckCircle className="h-3 w-3 text-green-500 ml-auto" />
                  )}
                </button>
                
                {/* Local Storage with Dropdown */}
                <div className="w-full">
                  <button 
                    onClick={() => setIsLocalStorageDropdownOpen(!isLocalStorageDropdownOpen)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent w-full transition-colors"
                  >
                    <HardDrive className="h-4 w-4 text-blue-500" />
                    <span>Local Storage</span>
                    {isLocalStorageEnabled && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                    {isLocalStorageDropdownOpen ? (
                      <ChevronDown className="h-3 w-3 ml-auto" />
                    ) : (
                      <ChevronRight className="h-3 w-3 ml-auto" />
                    )}
                  </button>
                  
                  {isLocalStorageDropdownOpen && (
                    <div className="ml-6 mt-1 space-y-1">
                      <button 
                        onClick={() => {
                          setIsLocalStorageModalOpen(true)
                          setIsLocalStorageDropdownOpen(false)
                        }}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent w-full transition-colors"
                      >
                        <HardDrive className="h-4 w-4 text-blue-500" />
                        <span>Storage Settings</span>
                      </button>
                      
                      <button 
                        onClick={() => {
                          setIsStorageCleanupModalOpen(true)
                          setIsLocalStorageDropdownOpen(false)
                        }}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent w-full transition-colors"
                      >
                        <HardDrive className="h-4 w-4 text-orange-500" />
                        <span>Storage Cleanup</span>
                      </button>
                    </div>
                  )}
                </div>
                
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          Version 1.0.0
        </div>
      </div>

      {/* Supabase Login Modal */}
      <SupabaseLoginModal
        isOpen={isSupabaseModalOpen}
        onClose={() => {
          setIsSupabaseModalOpen(false)
          // Check login status when modal closes
          const savedLogin = localStorage.getItem('supabase-login')
          if (savedLogin) {
            try {
              const loginData = JSON.parse(savedLogin)
              setIsLoggedIn(true)
              setUserInfo(loginData)
            } catch (error) {
              console.error('Error parsing saved login data:', error)
              localStorage.removeItem('supabase-login')
              setIsLoggedIn(false)
              setUserInfo(null)
            }
          } else {
            setIsLoggedIn(false)
            setUserInfo(null)
          }
        }}
      />

      {/* Local Storage Modal */}
      <LocalStorageModal
        isOpen={isLocalStorageModalOpen}
        onClose={() => {
          setIsLocalStorageModalOpen(false)
          // Check local storage status when modal closes
          const localStorageEnabled = localStorage.getItem('local-storage-enabled')
          setIsLocalStorageEnabled(localStorageEnabled === 'true')
        }}
        onViewData={() => {
          setIsLocalStorageModalOpen(false)
          navigate('/local-storage')
        }}
      />

      {/* Storage Cleanup Modal */}
      <StorageCleanupModal
        isOpen={isStorageCleanupModalOpen}
        onClose={() => setIsStorageCleanupModalOpen(false)}
      />
    </div>
  )
}
