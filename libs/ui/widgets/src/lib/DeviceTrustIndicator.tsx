import React from 'react'
import { ShieldCheck, ShieldX, ShieldAlert, Clock } from 'lucide-react'
import type { DeviceTrustLevel } from '@lenserfight/types'

const LEVEL_CONFIG: Record<DeviceTrustLevel, {
  label: string
  icon: React.ReactNode
  className: string
}> = {
  trusted: {
    label: 'Trusted',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
  },
  approved: {
    label: 'Approved',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    className: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  },
  pending: {
    label: 'Pending',
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30',
  },
  offline: {
    label: 'Offline',
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    className: 'text-muted-foreground bg-muted',
  },
  unhealthy: {
    label: 'Unhealthy',
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    className: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
  },
  revoked: {
    label: 'Revoked',
    icon: <ShieldX className="w-3.5 h-3.5" />,
    className: 'text-destructive bg-destructive/10',
  },
  blocked: {
    label: 'Blocked',
    icon: <ShieldX className="w-3.5 h-3.5" />,
    className: 'text-destructive bg-destructive/10',
  },
}

interface Props {
  trustLevel: DeviceTrustLevel
  showLabel?: boolean
  className?: string
}

export const DeviceTrustIndicator: React.FC<Props> = ({
  trustLevel,
  showLabel = true,
  className = '',
}) => {
  const config = LEVEL_CONFIG[trustLevel] ?? LEVEL_CONFIG['pending']

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${config.className} ${className}`}
    >
      {config.icon}
      {showLabel && config.label}
    </span>
  )
}
