/**
 * ValidationSummary — displays actionable config errors before save.
 */

import { AlertTriangle } from 'lucide-react'
import React from 'react'

export interface ValidationSummaryProps {
  errors: Record<string, string>
}

export function ValidationSummary({ errors }: ValidationSummaryProps) {
  const entries = Object.entries(errors).filter(([, v]) => v)
  if (entries.length === 0) return null

  return (
    <div className="rounded-xl border border-status-red/20 bg-status-red/5 p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-status-red text-[11px] font-semibold">
        <AlertTriangle size={12} />
        {entries.length} validation {entries.length === 1 ? 'error' : 'errors'}
      </div>
      <ul className="list-disc list-inside text-[10px] text-greyscale-600 dark:text-greyscale-300 space-y-0.5">
        {entries.map(([key, msg]) => (
          <li key={key}>{msg}</li>
        ))}
      </ul>
    </div>
  )
}
