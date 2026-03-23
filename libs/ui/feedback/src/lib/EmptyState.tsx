import React from 'react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/**
 * Empty collection placeholder with optional icon, description, and CTA.
 *
 * @example
 * <EmptyState
 *   icon={<InboxIcon className="h-10 w-10" />}
 *   title="No lenses yet"
 *   description="Create your first lens to get started."
 *   action={<Button>Create Lens</Button>}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      {icon && (
        <div className="mb-4 text-greyscale-300 dark:text-greyscale-600">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-greyscale-700 dark:text-greyscale-300">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-greyscale-500 dark:text-greyscale-500 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  )
}

EmptyState.displayName = 'EmptyState'
