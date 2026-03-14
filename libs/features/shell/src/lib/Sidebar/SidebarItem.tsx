import { Lock } from 'lucide-react'
import React, { useState } from 'react'

interface SidebarItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  collapsed?: boolean
  isComingSoon?: boolean
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  isActive,
  collapsed,
  isComingSoon,
  className = '',
  disabled,
  onClick,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false)

  // Base layout classes shared by button and div
  const baseClasses = `
    w-full flex items-center p-3 my-1.5 rounded-xl transition-all duration-200 relative group
    border
    ${collapsed ? 'justify-center' : ''}
    ${className}
  `

  // State-specific styling
  let variantClasses = ''

  if (isActive) {
    // Active State
    variantClasses = 'bg-primary/20 text-gray-900 dark:text-white font-semibold border-transparent'
  } else if (isComingSoon) {
    // Locked/Coming Soon State (Redesigned)
    variantClasses = `
      bg-gray-50/80 dark:bg-[#121212] 
      border-gray-200/60 dark:border-gray-800
      text-gray-400 dark:text-gray-500
      cursor-not-allowed
    `
  } else {
    // Inactive Interactive State
    variantClasses = `
      border-transparent 
      text-gray-600 dark:text-gray-400 
      hover:bg-gray-100 dark:hover:bg-gray-800 
      hover:text-gray-900 dark:hover:text-white
    `
  }

  const IconWrapper = () => (
    <span className={`flex-shrink-0 z-10 relative ${isComingSoon ? 'opacity-90' : ''}`}>
      {icon}
    </span>
  )

  const LabelWrapper = () =>
    !collapsed && (
      <div className="ml-3 flex-1 flex items-center justify-between overflow-hidden z-10">
        <span className={`truncate ${isComingSoon ? 'font-medium opacity-90' : ''}`}>{label}</span>
        {isComingSoon && (
          <Lock
            size={14}
            className="text-gray-400 dark:text-gray-600 ml-2 flex-shrink-0"
            aria-hidden="true"
          />
        )}
      </div>
    )

  const ActiveIndicator = () =>
    isActive && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />

  // If Coming Soon, render as div to handle hover for popover without fighting 'disabled' prop
  if (isComingSoon) {
    return (
      <div
        className={`${baseClasses} ${variantClasses}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        aria-disabled="true"
      >
        <IconWrapper />
        <LabelWrapper />
        <ActiveIndicator />

        {/* Hover Popover */}
        <div
          className={`
                absolute z-50 px-3 py-1.5 
                bg-gray-900 dark:bg-gray-100 
                text-white dark:text-gray-900 
                text-xs font-bold rounded-lg shadow-xl 
                whitespace-nowrap pointer-events-none
                transition-all duration-200 ease-out
                ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
            `}
          style={
            collapsed
              ? {
                  left: '100%',
                  marginLeft: '12px',
                  top: '50%',
                  transform: isHovered
                    ? 'translateY(-50%) translateX(0)'
                    : 'translateY(-50%) translateX(-4px)',
                }
              : {
                  right: '12px',
                  top: '50%',
                  transform: isHovered
                    ? 'translateY(-50%) translateX(0)'
                    : 'translateY(-50%) translateX(4px)',
                }
          }
        >
          Coming soon
          {/* Arrow for collapsed tooltip */}
          {collapsed && (
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-100"></div>
          )}
        </div>
      </div>
    )
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses}`}
      title={collapsed ? label : undefined}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      <IconWrapper />
      <LabelWrapper />
      <ActiveIndicator />
    </button>
  )
}
