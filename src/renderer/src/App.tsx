import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { GroupsPage } from './pages/GroupsPage'
import { GroupManagementPage } from './pages/GroupManagementPage'
import { HistoryPage } from './pages/HistoryPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { SettingsPage } from './pages/SettingsPage'
import { AnalysisResultsPage } from './pages/AnalysisResultsPage'
import { LocalStorageViewPage } from './pages/LocalStorageViewPage'
import { AIChatPage } from './pages/AIChatPage'
import { Toaster } from './components/ui/toaster'
import { useAppStore } from './store/appStore'
import { Loader2 } from 'lucide-react'

function App() {
  const { theme } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000) // 2 second loading

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className={`${theme} min-h-screen flex items-center justify-center bg-background`}>
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-foreground">DocData App</h2>
            <p className="text-muted-foreground mt-2">Loading your document converter...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={theme}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:groupId" element={<GroupManagementPage />} />
            <Route path="/groups/:groupId/analysis" element={<GroupManagementPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/results" element={<AnalysisResultsPage />} />
            <Route path="/local-storage" element={<LocalStorageViewPage />} />
            <Route path="/ai-chat" element={<AIChatPage />} />
          </Routes>
        </Layout>
      </Router>
      <Toaster />
    </div>
  )
}

export default App
