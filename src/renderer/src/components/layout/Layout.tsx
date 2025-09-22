import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAppStore } from '@/store/appStore'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { sidebarOpen } = useAppStore()

  return (
    <div className="h-screen flex bg-background">
      {sidebarOpen && <Sidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
