import React, { useState, useEffect } from 'react'
import { FileDropZone } from '@/components/FileDropZone'
import { ConversionSettings } from '@/components/ConversionSettings'
import { ProcessingProgress } from '@/components/ProcessingProgress'
import { SupabaseProjectSelector } from '@/components/SupabaseProjectSelector'
import { useAppStore } from '@/store/appStore'

export function HomePage() {
  const { files, isProcessing } = useAppStore()
  const [userInfo, setUserInfo] = useState<any>(null)
  const [selectedProject, setSelectedProject] = useState<any>(null)

  useEffect(() => {
    // Check for existing Supabase login
    const checkLoginStatus = () => {
      const storedLogin = localStorage.getItem('supabase-login')
      if (storedLogin) {
        try {
          const loginData = JSON.parse(storedLogin)
          setUserInfo(loginData)
          setSelectedProject(loginData.selectedProject || null)
        } catch (error) {
          console.error('Error parsing stored login data:', error)
        }
      }
    }

    checkLoginStatus()

    // Listen for login changes
    const handleLoginChange = (event: any) => {
      const { isLoggedIn, userInfo: newUserInfo } = event.detail
      if (isLoggedIn && newUserInfo) {
        setUserInfo(newUserInfo)
        setSelectedProject(newUserInfo.selectedProject || null)
      } else {
        setUserInfo(null)
        setSelectedProject(null)
      }
    }

    window.addEventListener('supabase-login-changed', handleLoginChange)
    
    return () => {
      window.removeEventListener('supabase-login-changed', handleLoginChange)
    }
  }, [])

  const handleProjectSelect = (project: any) => {
    try {
      console.log('Project selected:', project)
      setSelectedProject(project)
      
      // Update user info with selected project
      if (userInfo) {
        const updatedUserInfo = {
          ...userInfo,
          selectedProject: project,
          // Preserve projects array if it exists
          projects: userInfo.projects || []
        }
        console.log('Updated user info:', updatedUserInfo)
        setUserInfo(updatedUserInfo)
        localStorage.setItem('supabase-login', JSON.stringify(updatedUserInfo))
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('supabase-login-changed', {
          detail: { isLoggedIn: true, userInfo: updatedUserInfo }
        }))
        console.log('Project selection completed successfully')
      } else {
        console.warn('No userInfo available when selecting project')
      }
    } catch (error) {
      console.error('Error in handleProjectSelect:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Document Converter</h1>
        <p className="text-muted-foreground">
          Convert between PDF, Word, Excel, and CSV formats with AI-powered optimization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <FileDropZone />
          {isProcessing && <ProcessingProgress />}
        </div>
        
        <div className="space-y-6">
          {userInfo && (
            <SupabaseProjectSelector
              userInfo={userInfo}
              selectedProject={selectedProject}
              onProjectSelect={handleProjectSelect}
            />
          )}
          <ConversionSettings />
        </div>
      </div>

      {files.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-medium mb-2">Quick Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-2xl font-bold text-primary">{files.length}</div>
              <div className="text-muted-foreground">Total Files</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {files.filter(f => f.status === 'completed').length}
              </div>
              <div className="text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {files.filter(f => f.status === 'processing').length}
              </div>
              <div className="text-muted-foreground">Processing</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {files.filter(f => f.status === 'error').length}
              </div>
              <div className="text-muted-foreground">Errors</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
