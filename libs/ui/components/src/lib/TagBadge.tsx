import React from 'react'

interface TagBadgeProps {
  label: string
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

export const TagBadge: React.FC<TagBadgeProps> = ({ label, className = '', onClick }) => {
  const interactiveClasses = onClick
    ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors'
    : ''

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ${interactiveClasses} ${className}`}
    >
      #{label}
    </span>
  )
}
