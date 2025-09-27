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
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { SupabaseLoginModal } from '@/components/SupabaseLoginModal'

const navItems = [
  {
    name: 'Converter',
    href: '/',
    icon: FileText,
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
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false)
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [userInfo, setUserInfo] = useState<any>(null)

  // Check login status on component mount
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
  }, [])

  // Listen for storage changes and custom events (when login status changes)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Only handle supabase-login changes
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
    </div>
  )
}
