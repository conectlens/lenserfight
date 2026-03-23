import React from 'react'

export interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
  className?: string
}

/**
 * Page-level header with title, optional description, and action slot.
 *
 * @example
 * <PageHeader
 *   title="My Lenses"
 *   description="Manage your saved prompts"
 *   actions={<Button>Create New</Button>}
 * />
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  breadcrumb,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {breadcrumb && <div className="mb-1">{breadcrumb}</div>}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {typeof title === 'string' ? (
            <h1 className="text-2xl font-bold text-greyscale-900 dark:text-greyscale-50 truncate">
              {title}
            </h1>
          ) : (
            title
          )}
          {description && (
            <p className="mt-1 text-sm text-greyscale-500 dark:text-greyscale-400">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex-shrink-0 flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

PageHeader.displayName = 'PageHeader'
