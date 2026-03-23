import React from 'react'

export type NoticeVariant = 'info' | 'success' | 'warning' | 'error'

export interface InlineNoticeProps {
  variant?: NoticeVariant
  title?: string
  children: React.ReactNode
  icon?: React.ReactNode
  onDismiss?: () => void
  className?: string
}

const variantConfig: Record<
  NoticeVariant,
  { bg: string; border: string; text: string; iconColor: string }
> = {
  info: {
    bg:        'bg-status-blue/10',
    border:    'border-status-blue/30',
    text:      'text-greyscale-800 dark:text-greyscale-200',
    iconColor: 'text-status-blue',
  },
  success: {
    bg:        'bg-status-green/10',
    border:    'border-status-green/30',
    text:      'text-greyscale-800 dark:text-greyscale-200',
    iconColor: 'text-status-green',
  },
  warning: {
    bg:        'bg-primary-yellow-500/15',
    border:    'border-primary-yellow-500/40',
    text:      'text-greyscale-800 dark:text-greyscale-200',
    iconColor: 'text-primary-yellow-600',
  },
  error: {
    bg:        'bg-status-red/10',
    border:    'border-status-red/30',
    text:      'text-greyscale-800 dark:text-greyscale-200',
    iconColor: 'text-status-red',
  },
}

/**
 * Inline contextual notice for form-level or section-level feedback.
 * Distinct from Alert (which is for page-level messages).
 *
 * @example
 * <InlineNotice variant="warning" title="Heads up">
 *   This action is irreversible.
 * </InlineNotice>
 */
export const InlineNotice: React.FC<InlineNoticeProps> = ({
  variant = 'info',
  title,
  children,
  icon,
  onDismiss,
  className = '',
}) => {
  const config = variantConfig[variant]

  return (
    <div
      role="note"
      className={`
        flex gap-3 rounded-xl border p-3.5
        ${config.bg} ${config.border} ${config.text}
        ${className}
      `}
    >
      {icon && (
        <span className={`flex-shrink-0 mt-0.5 ${config.iconColor}`}>{icon}</span>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <p className="text-sm font-semibold mb-0.5">{title}</p>
        )}
        <div className="text-sm">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notice"
          className="flex-shrink-0 self-start rounded p-0.5 text-greyscale-400 hover:text-greyscale-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 12 12">
            <path d="M10.293 1.293a1 1 0 011.414 1.414L7.414 6l4.293 4.293a1 1 0 01-1.414 1.414L6 7.414l-4.293 4.293a1 1 0 01-1.414-1.414L4.586 6 .293 1.707A1 1 0 011.707.293L6 4.586l4.293-4.293a1 1 0 011 1z" />
          </svg>
        </button>
      )}
    </div>
  )
}

InlineNotice.displayName = 'InlineNotice'
