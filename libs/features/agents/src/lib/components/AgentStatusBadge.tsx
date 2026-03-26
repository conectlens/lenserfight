import React from 'react'
import { Badge } from '@lenserfight/ui/components'

interface AgentStatusBadgeProps {
  isActive: boolean
  suspendedAt?: string | null
  className?: string
}

export const AgentStatusBadge: React.FC<AgentStatusBadgeProps> = ({ isActive, suspendedAt, className }) => {
  if (suspendedAt) {
    return (
      <Badge color="red" className={className}>
        <span className="w-1.5 h-1.5 rounded-full bg-status-red inline-block mr-1" />
        Suspended
      </Badge>
    )
  }

  if (isActive) {
    return (
      <Badge color="green" className={className}>
        <span className="w-1.5 h-1.5 rounded-full bg-status-green animate-pulse inline-block mr-1" />
        Active
      </Badge>
    )
  }

  return (
    <Badge color="gray" className={className}>
      <span className="w-1.5 h-1.5 rounded-full bg-greyscale-400 inline-block mr-1" />
      Inactive
    </Badge>
  )
}
