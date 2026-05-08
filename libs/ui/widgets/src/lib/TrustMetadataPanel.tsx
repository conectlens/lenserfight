import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import type { ExecutionTrustEvaluation, TrustLevel } from '@lenserfight/types'

const TRUST_LEVEL_LABELS: Record<TrustLevel, string> = {
  unverified: 'Unverified',
  account_verified: 'Account Verified',
  agent_verified: 'Agent Verified',
  device_verified: 'Device Verified',
  runner_verified: 'Runner Verified',
  execution_verified: 'Execution Verified',
  fully_trusted: 'Fully Trusted',
}

const TRUST_LEVEL_COLORS: Record<TrustLevel, string> = {
  unverified: 'text-muted-foreground bg-muted',
  account_verified: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  agent_verified: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30',
  device_verified: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30',
  runner_verified: 'text-violet-700 bg-violet-50 dark:bg-violet-950/30',
  execution_verified: 'text-teal-700 bg-teal-50 dark:bg-teal-950/30',
  fully_trusted: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30',
}

interface Props {
  trustEvaluation: ExecutionTrustEvaluation
  className?: string
}

export const TrustMetadataPanel: React.FC<Props> = ({ trustEvaluation, className = '' }) => {
  const [expanded, setExpanded] = useState(false)
  const level = trustEvaluation.trustLevel as TrustLevel

  return (
    <div className={`rounded-xl border overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Execution Trust</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TRUST_LEVEL_COLORS[level]}`}>
            {TRUST_LEVEL_LABELS[level] ?? level}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-2">
          {Object.entries(trustEvaluation.factors).map(([key, passed]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              {passed ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={passed ? '' : 'text-muted-foreground'}>
                {key.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
          <div className="pt-1 text-xs text-muted-foreground">
            Evaluated: {new Date(trustEvaluation.evaluatedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  )
}
