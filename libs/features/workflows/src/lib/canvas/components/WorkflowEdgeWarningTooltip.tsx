import { AlertTriangle } from 'lucide-react'
import React from 'react'

interface WorkflowEdgeWarningTooltipProps {
  message: string
}

export function WorkflowEdgeWarningTooltip({ message }: WorkflowEdgeWarningTooltipProps) {
  return (
    <span
      className="rounded-full bg-status-red/10 border border-status-red/30 px-1.5 py-0.5 text-[9px] text-status-red flex items-center gap-0.5 shadow-sm"
      title={message}
    >
      <AlertTriangle size={8} /> type mismatch
    </span>
  )
}
