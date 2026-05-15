import React from 'react'

export interface PageHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, icon, action, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex items-start gap-3">
        {icon && <div className="shrink-0 pt-1">{icon}</div>}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-greyscale-900 dark:text-greyscale-50">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-greyscale-500 dark:text-greyscale-400">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
