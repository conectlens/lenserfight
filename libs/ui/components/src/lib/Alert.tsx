import React from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

export type AlertVariant = 'success' | 'error' | 'warning' | 'info'

export interface AlertProps {
  variant?: AlertVariant
  title: string
  children?: React.ReactNode
  onDismiss?: () => void
  className?: string
}

const variantConfig: Record<
  AlertVariant,
  { icon: React.ElementType; containerClass: string; iconClass: string; titleClass: string }
> = {
  success: {
    icon: CheckCircle2,
    containerClass:
      'bg-status-green/10 border border-status-green/20 dark:bg-status-green/5 dark:border-status-green/15',
    iconClass: 'text-status-green',
    titleClass: 'text-status-green',
  },
  error: {
    icon: XCircle,
    containerClass:
      'bg-status-red/10 border border-status-red/20 dark:bg-status-red/5 dark:border-status-red/15',
    iconClass: 'text-status-red',
    titleClass: 'text-status-red',
  },
  warning: {
    icon: AlertTriangle,
    containerClass:
      'bg-primary-yellow-500/15 border border-primary-yellow-500/30 dark:bg-primary-yellow-500/10 dark:border-primary-yellow-500/20',
    iconClass: 'text-primary-yellow-700 dark:text-primary-yellow-500',
    titleClass: 'text-primary-yellow-800 dark:text-primary-yellow-400',
  },
  info: {
    icon: Info,
    containerClass:
      'bg-status-blue/10 border border-status-blue/20 dark:bg-status-blue/5 dark:border-status-blue/15',
    iconClass: 'text-status-blue',
    titleClass: 'text-status-blue',
  },
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', title, children, onDismiss, className = '' }, ref) => {
    const config = variantConfig[variant]
    const Icon = config.icon

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        className={`relative flex gap-3 rounded-xl p-4 ${config.containerClass} ${className}`}
      >
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconClass}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-tight ${config.titleClass}`}>{title}</p>
          {children && (
            <div className="mt-1 text-sm text-greyscale-700 dark:text-greyscale-300">{children}</div>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className="shrink-0 self-start rounded p-0.5 text-greyscale-500 transition-colors hover:bg-black/5 hover:text-greyscale-700 dark:hover:bg-white/10 dark:hover:text-greyscale-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)

Alert.displayName = 'Alert'
