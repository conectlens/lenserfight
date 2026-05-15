import React from 'react'

export interface EmptyStateProps {
  icon?: React.ElementType | React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

function isComponentType(value: unknown): value is React.ElementType {
  if (typeof value === 'function' || typeof value === 'string') return true
  // React.forwardRef / React.memo return objects with $$typeof — treat as a component reference.
  if (typeof value === 'object' && value !== null && '$$typeof' in value && !React.isValidElement(value)) {
    return true
  }
  return false
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border py-16 px-8 text-center space-y-4 ${className}`}
    >
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised">
          {isComponentType(icon)
            ? React.createElement(icon, { size: 24, className: 'text-greyscale-400' })
            : icon}
        </div>
      )}
      <div>
        <p className="font-semibold text-greyscale-900 dark:text-greyscale-50">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-greyscale-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
