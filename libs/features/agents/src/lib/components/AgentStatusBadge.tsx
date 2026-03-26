import React from 'react'

interface AgentStatusBadgeProps {
  isActive: boolean
  suspendedAt?: string | null
  className?: string
}

export const AgentStatusBadge: React.FC<AgentStatusBadgeProps> = ({ isActive, suspendedAt, className = '' }) => {
  if (suspendedAt) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
        Suspended
      </span>
    )
  }

  if (isActive) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
        Active
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
      Inactive
    </span>
  )
}
