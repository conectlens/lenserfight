import React from 'react'

export interface BottomNavItem {
  key: string
  label: string
  icon: React.ReactNode
  activeIcon?: React.ReactNode
  badge?: number | string
}

export interface BottomNavigationProps {
  items: BottomNavItem[]
  activeKey: string
  onChange: (key: string) => void
  className?: string
}

/**
 * Mobile tab bar anchored to the bottom of the screen.
 * For native, wrap with SafeAreaView bottom padding.
 *
 * @example
 * <BottomNavigation
 *   items={[
 *     { key: 'home', label: 'Home', icon: <HomeIcon /> },
 *     { key: 'explore', label: 'Explore', icon: <SearchIcon /> },
 *   ]}
 *   activeKey={activeTab}
 *   onChange={setActiveTab}
 * />
 */
export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  items,
  activeKey,
  onChange,
  className = '',
}) => {
  return (
    <nav
      aria-label="Bottom navigation"
      className={`
        flex items-stretch
        bg-surface-base border-t border-surface-border
        shadow-neu-4
        safe-area-bottom
        ${className}
      `}
    >
      {items.map((item) => {
        const isActive = item.key === activeKey
        return (
          <button
            key={item.key}
            type="button"
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(item.key)}
            className={`
              flex-1 flex flex-col items-center justify-center gap-0.5
              min-h-[56px] py-2 px-1
              text-xs font-medium
              transition-colors duration-fast ease-standard
              focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-yellow-500/50
              ${isActive
                ? 'text-deep-lens-navy-500 dark:text-primary-yellow-500'
                : 'text-greyscale-500 dark:text-greyscale-500 hover:text-greyscale-700 dark:hover:text-greyscale-300'
              }
            `}
          >
            <span className="relative">
              {(isActive && item.activeIcon) ? item.activeIcon : item.icon}
              {item.badge != null && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 rounded-full bg-status-red text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {item.badge}
                </span>
              )}
            </span>
            <span className="truncate max-w-full">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

BottomNavigation.displayName = 'BottomNavigation'
