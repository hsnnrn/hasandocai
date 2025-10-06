import React from 'react'
import { useNavigate } from 'react-router-dom'
import { DocumentGroupManager } from '@/components/DocumentGroupManager'

export function GroupsPage() {
  const navigate = useNavigate()

  return (
    <div className="container mx-auto p-6">
      <DocumentGroupManager />
    </div>
  )
}
