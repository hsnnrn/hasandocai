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
import { ChatBotPage } from './pages/ChatBotPage'
import { LoginPage } from './pages/LoginPage'
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
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/groups" element={<Layout><GroupsPage /></Layout>} />
          <Route path="/groups/:groupId" element={<Layout><GroupManagementPage /></Layout>} />
          <Route path="/groups/:groupId/analysis" element={<Layout><GroupManagementPage /></Layout>} />
          <Route path="/history" element={<Layout><HistoryPage /></Layout>} />
          <Route path="/templates" element={<Layout><TemplatesPage /></Layout>} />
          <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
          <Route path="/results" element={<Layout><AnalysisResultsPage /></Layout>} />
          <Route path="/local-storage" element={<Layout><LocalStorageViewPage /></Layout>} />
          <Route path="/chat" element={<Layout><ChatBotPage /></Layout>} />
        </Routes>
      </Router>
      <Toaster />
    </div>
  )
}

export default App
