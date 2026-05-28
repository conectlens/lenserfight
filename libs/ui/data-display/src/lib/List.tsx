import React from 'react'

export interface ListProps {
  children: React.ReactNode
  divided?: boolean
  className?: string
}

export interface ListItemProps {
  leading?: React.ReactNode
  trailing?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  onClick?: () => void
  className?: string
}

/**
 * Vertical list container.
 *
 * @example
 * <List divided>
 *   <ListItem title="Alice" description="Online" leading={<Avatar />} />
 * </List>
 */
export const List: React.FC<ListProps> = ({ children, divided = false, className = '' }) => {
  return (
    <ul
      role="list"
      className={`w-full ${divided ? 'divide-y divide-surface-border' : ''} ${className}`}
    >
      {children}
    </ul>
  )
}

List.displayName = 'List'

export const ListItem: React.FC<ListItemProps> = ({
  leading,
  trailing,
  title,
  description,
  onClick,
  className = '',
}) => {
  const Tag = onClick ? 'button' : 'li'

  return (
    <Tag
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 w-full text-left
        ${onClick ? 'cursor-pointer hover:bg-surface-raised transition-colors' : ''}
        ${className}
      `}
    >
      {leading && <span className="flex-shrink-0">{leading}</span>}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-greyscale-800 dark:text-greyscale-200 truncate">
          {title}
        </span>
        {description && (
          <span className="block text-xs text-greyscale-500 truncate mt-0.5">{description}</span>
        )}
      </span>
      {trailing && <span className="flex-shrink-0 text-greyscale-400">{trailing}</span>}
    </Tag>
  )
}

ListItem.displayName = 'ListItem'
