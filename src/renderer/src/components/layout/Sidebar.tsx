import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  FileText,
  History,
  Layers,
  Settings,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/utils/cn'

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
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          Version 1.0.0
        </div>
      </div>
    </div>
  )
}
