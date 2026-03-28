import React from 'react'

export interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border py-16 px-8 text-center space-y-4 ${className}`}
    >
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised">
          <Icon size={24} className="text-greyscale-400" />
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
