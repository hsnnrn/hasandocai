import React, { useState, useEffect } from 'react'
import { ChevronDown, Database, Building2, AlertCircle, Loader2, ExternalLink } from 'lucide-react'

interface Project {
  id: string
  name: string
  ref: string
  status: string
  organization_id?: string
  organization_name?: string
  organization_slug?: string
  region?: string
}

interface SupabaseProjectSelectorProps {
  onProjectSelect: (project: Project | null) => void
  selectedProject: Project | null
  userInfo: any
  className?: string
}

export function SupabaseProjectSelector({ 
  onProjectSelect, 
  selectedProject, 
  userInfo, 
  className = "" 
}: SupabaseProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (userInfo?.projects && userInfo.projects.length > 0) {
      setProjects(userInfo.projects)
      setError('')
    } else if (!userInfo) {
      // Only clear projects if userInfo is completely null (logout)
      setProjects([])
      setError('No projects available')
    }
    // Don't clear projects if userInfo exists but projects array is missing
    // This preserves the projects list when userInfo updates after project selection
  }, [userInfo])

  // Auto-fetch projects when component mounts and userInfo is available
  useEffect(() => {
    if (userInfo && (!userInfo.projects || userInfo.projects.length === 0)) {
      const fetchProjects = async () => {
        setIsLoading(true)
        setError('')
        
        try {
          // ✅ Gerçek access token'ı al
          const credentials = await window.electronAPI.getSupabaseCredentials()
          
          if (!credentials?.session?.access_token) {
            throw new Error('Valid access token not found')
          }

      const accessToken = credentials.session.access_token
      console.log('🔍 Using real access token for API calls:', accessToken.substring(0, 50) + '...')

          // ✅ Kullanıcı bilgilerini gerçek token ile çek
          const userResponse = await fetch('https://api.supabase.com/v1/profile', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (!userResponse.ok) {
            throw new Error(`User API failed: ${userResponse.status}`)
          }
          
          const userData = await userResponse.json()
          console.log('✅ Gerçek kullanıcı bilgileri:', userData)

          // ✅ Projeleri gerçek token ile çek
          const projectsResponse = await fetch('https://api.supabase.com/v1/projects', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (!projectsResponse.ok) {
            throw new Error(`Projects API failed: ${projectsResponse.status}`)
          }
          
          const projectsData = await projectsResponse.json()
          const realProjects = projectsData.projects || projectsData || []
          
          setProjects(realProjects)
          setError('')
          console.log('✅ Projects fetched successfully:', realProjects.length)
          
          // ✅ Gerçek kullanıcı ve proje bilgileriyle userInfo'yu güncelle
          const updatedUserInfo = {
            ...userInfo,
            user: userData, // Gerçek kullanıcı bilgileri
            projects: realProjects // Gerçek proje bilgileri
          }
          
          // localStorage'a gerçek verileri kaydet
          localStorage.setItem('supabase-login', JSON.stringify(updatedUserInfo))
          
          // Parent component'leri güncelle
          window.dispatchEvent(new CustomEvent('supabase-login-changed', {
            detail: { isLoggedIn: true, userInfo: updatedUserInfo }
          }))
          
        } catch (error) {
          console.error('⚠️ Fetch failed:', error)
          
          // Fallback: IPC API'yi kullan
          try {
            const result = await window.supabaseAPI.fetchProjects()
            
            if (result.ok && result.projects) {
              setProjects(result.projects)
              setError('')
              console.log('Projects auto-fetched successfully (fallback):', result.projects.length)
              
              // Also fetch user info to ensure we have the latest data
              try {
                const userResult = await window.supabaseAPI.fetchUserInfo()
                if (userResult.ok && userResult.user) {
                  console.log('✅ User info auto-fetched successfully:', userResult.user)
                  
                  // Update userInfo with both projects and user data
                  if (userInfo) {
                    const updatedUserInfo = {
                      ...userInfo,
                      projects: result.projects,
                      user: userResult.user // Update user info with fresh data
                    }
                    
                    // Store updated userInfo in localStorage to persist projects and user data
                    localStorage.setItem('supabase-login', JSON.stringify(updatedUserInfo))
                    
                    // Dispatch event to update parent components
                    window.dispatchEvent(new CustomEvent('supabase-login-changed', {
                      detail: { isLoggedIn: true, userInfo: updatedUserInfo }
                    }))
                  }
                } else {
                  console.warn('⚠️ Auto-fetch failed to get user info:', userResult.error)
                  
                  // Fallback: still update projects
                  if (userInfo) {
                    const updatedUserInfo = {
                      ...userInfo,
                      projects: result.projects
                    }
                    
                    localStorage.setItem('supabase-login', JSON.stringify(updatedUserInfo))
                    
                    window.dispatchEvent(new CustomEvent('supabase-login-changed', {
                      detail: { isLoggedIn: true, userInfo: updatedUserInfo }
                    }))
                  }
                }
              } catch (userError) {
                console.error('❌ Error auto-fetching user info:', userError)
                
                // Fallback: still update projects
                if (userInfo) {
                  const updatedUserInfo = {
                    ...userInfo,
                    projects: result.projects
                  }
                  
                  localStorage.setItem('supabase-login', JSON.stringify(updatedUserInfo))
                  
                  window.dispatchEvent(new CustomEvent('supabase-login-changed', {
                    detail: { isLoggedIn: true, userInfo: updatedUserInfo }
                  }))
                }
              }
            } else {
              setError(result.error || 'Failed to fetch projects')
            }
          } catch (fallbackError) {
            console.error('Error in fallback fetch:', fallbackError)
            setError('Failed to fetch projects')
          }
        } finally {
          setIsLoading(false)
        }
      }
      
      fetchProjects()
    }
  }, [userInfo?.user?.id]) // Only depend on user ID to avoid infinite loops

  const handleProjectSelect = (project: Project | null) => {
    onProjectSelect(project)
    setIsOpen(false)
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      // ✅ Gerçek access token'ı al
      const credentials = await window.electronAPI.getSupabaseCredentials()
      
      if (!credentials?.session?.access_token) {
        throw new Error('Valid access token not found')
      }

      const accessToken = credentials.session.access_token
      console.log('🔍 Refresh - Using real access token:', accessToken.substring(0, 50) + '...')

      // ✅ Kullanıcı bilgilerini gerçek token ile çek
      const userResponse = await fetch('https://api.supabase.com/v1/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!userResponse.ok) {
        throw new Error(`User API failed: ${userResponse.status}`)
      }
      
      const userData = await userResponse.json()
      console.log('✅ Refresh - Gerçek kullanıcı bilgileri:', userData)

      // ✅ Projeleri gerçek token ile çek
      const projectsResponse = await fetch('https://api.supabase.com/v1/projects', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!projectsResponse.ok) {
        throw new Error(`Projects API failed: ${projectsResponse.status}`)
      }
      
      const projectsData = await projectsResponse.json()
      const realProjects = projectsData.projects || projectsData || []
      
      setProjects(realProjects)
      setError('')
      console.log('✅ Refresh - Projects fetched successfully:', realProjects.length)
      
      // ✅ Gerçek kullanıcı ve proje bilgileriyle userInfo'yu güncelle
      const updatedUserInfo = {
        ...userInfo,
        user: userData, // Gerçek kullanıcı bilgileri
        projects: realProjects // Gerçek proje bilgileri
      }
      
      // localStorage'a gerçek verileri kaydet
      localStorage.setItem('supabase-login', JSON.stringify(updatedUserInfo))
      
      // Parent component'leri güncelle
      window.dispatchEvent(new CustomEvent('supabase-login-changed', {
        detail: { isLoggedIn: true, userInfo: updatedUserInfo }
      }))
      
    } catch (error) {
      console.error('⚠️ Refresh failed:', error)
      
      // Fallback: IPC API'yi kullan
      try {
        const result = await window.supabaseAPI.fetchProjects()
        
        if (result.ok && result.projects) {
          setProjects(result.projects)
          setError('')
          console.log('Projects refreshed successfully (fallback):', result.projects.length)
          
          // Also fetch user info to ensure we have the latest data
          try {
            const userResult = await window.supabaseAPI.fetchUserInfo()
            if (userResult.ok && userResult.user) {
              console.log('✅ User info fetched successfully:', userResult.user)
              
              // Update userInfo with both projects and user data
              if (userInfo) {
                const updatedUserInfo = {
                  ...userInfo,
                  projects: result.projects,
                  user: userResult.user // Update user info with fresh data
                }
                
                // Store updated userInfo in localStorage to persist projects and user data
                localStorage.setItem('supabase-login', JSON.stringify(updatedUserInfo))
                
                // Dispatch event to update parent components
                window.dispatchEvent(new CustomEvent('supabase-login-changed', {
                  detail: { isLoggedIn: true, userInfo: updatedUserInfo }
                }))
              }
            } else {
              console.warn('⚠️ Failed to fetch user info:', userResult.error)
              
              // Still update projects even if user info fails
              if (userInfo) {
                const updatedUserInfo = {
                  ...userInfo,
                  projects: result.projects
                }
                
                localStorage.setItem('supabase-login', JSON.stringify(updatedUserInfo))
                
                window.dispatchEvent(new CustomEvent('supabase-login-changed', {
                  detail: { isLoggedIn: true, userInfo: updatedUserInfo }
                }))
              }
            }
          } catch (userError) {
            console.error('❌ Error fetching user info:', userError)
            
            // Fallback: still update projects
            if (userInfo) {
              const updatedUserInfo = {
                ...userInfo,
                projects: result.projects
              }
              
              localStorage.setItem('supabase-login', JSON.stringify(updatedUserInfo))
              
              window.dispatchEvent(new CustomEvent('supabase-login-changed', {
                detail: { isLoggedIn: true, userInfo: updatedUserInfo }
              }))
            }
          }
        } else {
          setError(result.error || 'Failed to refresh projects')
        }
      } catch (fallbackError) {
        console.error('Error in fallback refresh:', fallbackError)
        setError('Failed to refresh projects')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard', '_blank')
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Supabase Project
        </label>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh projects"
          >
            <Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openSupabaseDashboard}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Open Supabase Dashboard"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={projects.length === 0 && !error}
          className={`
            w-full px-3 py-2 text-left bg-white border rounded-lg shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
            ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300 hover:border-gray-400'}
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedProject ? (
                <>
                  <Database className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900">{selectedProject.name}</div>
                    <div className="text-sm text-gray-500">
                      {selectedProject.ref} • {selectedProject.status}
                      {selectedProject.organization_name && (
                        <span> • {selectedProject.organization_name}</span>
                      )}
                    </div>
                  </div>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <div className="text-red-600">No projects available</div>
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 text-gray-400" />
                  <div className="text-gray-500">Select a project...</div>
                </>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {error ? (
              <div className="p-4 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <div className="text-red-600 font-medium mb-1">No Projects Found</div>
                <div className="text-sm text-gray-600 mb-3">
                  You don't have any Supabase projects yet.
                </div>
                <button
                  onClick={openSupabaseDashboard}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                >
                  Create Project
                </button>
              </div>
            ) : projects.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <div>Loading projects...</div>
              </div>
            ) : (
              <div className="py-1">
                {/* Clear selection option */}
                <button
                  onClick={() => handleProjectSelect(null)}
                  className={`
                    w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors
                    ${!selectedProject ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 border border-gray-300 rounded"></div>
                    <div>
                      <div className="font-medium">No project selected</div>
                      <div className="text-sm text-gray-500">Continue without selecting a project</div>
                    </div>
                  </div>
                </button>

                {/* Project options */}
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className={`
                      w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors
                      ${selectedProject?.id === project.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <Database className="h-4 w-4 text-blue-500" />
                      <div className="flex-1">
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-gray-500 flex items-center space-x-2">
                          <span>{project.ref}</span>
                          <span>•</span>
                          <span className={`
                            px-1.5 py-0.5 text-xs rounded-full
                            ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
                          `}>
                            {project.status}
                          </span>
                          {project.organization_name && (
                            <>
                              <span>•</span>
                              <span className="flex items-center space-x-1">
                                <Building2 className="h-3 w-3" />
                                <span>{project.organization_name}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Unable to load projects</div>
              <div className="mt-1">{error}</div>
              <button
                onClick={openSupabaseDashboard}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm underline"
              >
                Create your first project in Supabase Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProject && (
        <div className="text-sm text-gray-600 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Database className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-green-700">Project Selected</div>
              <div className="mt-1">
                All operations will use <strong>{selectedProject.name}</strong> project.
                {selectedProject.organization_name && (
                  <span> (Organization: {selectedProject.organization_name})</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
