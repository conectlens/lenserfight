import React, { useState } from 'react'
import { ShieldCheck, Shield, ChevronDown, ChevronUp, Check, X } from 'lucide-react'

interface AttestationFlags {
  signed: boolean
  gatewayVerified: boolean
  deviceTrusted: boolean
  policyPassed: boolean
}

interface Props extends AttestationFlags {
  className?: string
}

const CHECKS: Array<{ key: keyof AttestationFlags; label: string }> = [
  { key: 'signed', label: 'Execution signed' },
  { key: 'gatewayVerified', label: 'Gateway verified' },
  { key: 'deviceTrusted', label: 'Device trusted' },
  { key: 'policyPassed', label: 'Policy passed' },
]

function getTrustState(flags: AttestationFlags): 'full' | 'partial' | 'none' {
  const passed = Object.values(flags).filter(Boolean).length
  if (passed === CHECKS.length) return 'full'
  if (passed > 0) return 'partial'
  return 'none'
}

export const VerifiedLocalBadge: React.FC<Props> = ({
  signed,
  gatewayVerified,
  deviceTrusted,
  policyPassed,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false)
  const flags = { signed, gatewayVerified, deviceTrusted, policyPassed }
  const state = getTrustState(flags)

  if (state === 'none') return null

  const isFull = state === 'full'

  return (
    <div className={`inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
          isFull
            ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
            : 'text-yellow-700 bg-yellow-50 dark:bg-yellow-950/40 hover:bg-yellow-100'
        }`}
      >
        {isFull ? (
          <ShieldCheck className="w-3.5 h-3.5" />
        ) : (
          <Shield className="w-3.5 h-3.5" />
        )}
        {isFull ? 'Verified Local Execution' : 'Partially Verified'}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-1.5 rounded-lg border bg-popover p-2.5 shadow-sm space-y-1 min-w-[200px]">
          {CHECKS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              {flags[key] ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={flags[key] ? '' : 'text-muted-foreground'}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
