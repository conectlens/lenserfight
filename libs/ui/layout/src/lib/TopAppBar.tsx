import React from 'react'

export interface TopAppBarProps {
  title?: React.ReactNode
  leading?: React.ReactNode
  trailing?: React.ReactNode
  sticky?: boolean
  border?: boolean
  className?: string
}

/**
 * Top application bar for page headers and navigation headers.
 * Supports leading (back button), title, and trailing (actions) slots.
 *
 * @example
 * <TopAppBar
 *   title="Settings"
 *   leading={<IconButton icon={<ArrowLeft />} aria-label="Back" onPress={goBack} />}
 *   trailing={<IconButton icon={<MoreVertical />} aria-label="Options" onPress={openMenu} />}
 * />
 */
export const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  leading,
  trailing,
  sticky = false,
  border = true,
  className = '',
}) => {
  return (
    <header
      className={`
        flex items-center gap-3 h-14 px-4
        bg-surface-base
        ${border ? 'border-b border-surface-border' : ''}
        ${sticky ? 'sticky top-0 z-sticky' : ''}
        ${className}
      `}
    >
      {leading && (
        <div className="flex-shrink-0 flex items-center">
          {leading}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {typeof title === 'string' ? (
          <h1 className="text-base font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
            {title}
          </h1>
        ) : (
          title
        )}
      </div>

      {trailing && (
        <div className="flex-shrink-0 flex items-center gap-1">
          {trailing}
        </div>
      )}
    </header>
  )
}

TopAppBar.displayName = 'TopAppBar'
