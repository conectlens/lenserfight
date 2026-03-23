import React, { createContext, useContext, useId } from 'react'

// ── Context ──────────────────────────────────────────────────────────────────

interface TabsContextType {
  activeTab: string
  onChange: (id: string) => void
  baseId: string
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

// ── Tabs ─────────────────────────────────────────────────────────────────────

export interface TabsProps {
  value: string
  onChange: (id: string) => void
  children: React.ReactNode
  className?: string
}

/**
 * Accessible ARIA tabs compound component.
 *
 * @example
 * <Tabs value={tab} onChange={setTab}>
 *   <TabList>
 *     <Tab id="overview">Overview</Tab>
 *     <Tab id="activity">Activity</Tab>
 *   </TabList>
 *   <TabPanel id="overview">Overview content</TabPanel>
 *   <TabPanel id="activity">Activity content</TabPanel>
 * </Tabs>
 */
export const Tabs: React.FC<TabsProps> = ({ value, onChange, children, className = '' }) => {
  const baseId = useId()
  return (
    <TabsContext.Provider value={{ activeTab: value, onChange, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

// ── TabList ──────────────────────────────────────────────────────────────────

export interface TabListProps {
  children: React.ReactNode
  className?: string
  variant?: 'underline' | 'pills'
}

export const TabList: React.FC<TabListProps> = ({
  children,
  className = '',
  variant = 'underline',
}) => {
  return (
    <div
      role="tablist"
      className={`
        flex
        ${variant === 'underline' ? 'border-b border-surface-border gap-0' : 'gap-1 p-1 rounded-xl bg-surface-sunken shadow-neu-inset-1'}
        ${className}
      `}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ _variant?: string }>, { _variant: variant })
          : child
      )}
    </div>
  )
}

// ── Tab ──────────────────────────────────────────────────────────────────────

export interface TabProps {
  id: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
  _variant?: 'underline' | 'pills'
}

export const Tab: React.FC<TabProps> = ({
  id,
  children,
  disabled = false,
  className = '',
  _variant = 'underline',
}) => {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tab must be inside Tabs')

  const isActive = ctx.activeTab === id

  const underlineClasses = isActive
    ? 'border-b-2 border-deep-lens-navy-500 dark:border-primary-yellow-500 text-greyscale-900 dark:text-greyscale-50 font-semibold'
    : 'border-b-2 border-transparent text-greyscale-500 hover:text-greyscale-700 dark:hover:text-greyscale-300 font-medium'

  const pillClasses = isActive
    ? 'bg-surface-raised shadow-neu-2 text-greyscale-900 dark:text-greyscale-50 font-semibold'
    : 'text-greyscale-500 hover:text-greyscale-700 dark:hover:text-greyscale-300 font-medium'

  return (
    <button
      type="button"
      role="tab"
      id={`${ctx.baseId}-tab-${id}`}
      aria-selected={isActive}
      aria-controls={`${ctx.baseId}-panel-${id}`}
      disabled={disabled}
      onClick={() => ctx.onChange(id)}
      className={`
        flex items-center gap-1.5 text-sm
        transition-colors duration-fast ease-standard
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50
        disabled:opacity-40 disabled:cursor-not-allowed
        ${_variant === 'pills' ? 'rounded-lg px-3 py-1.5 flex-1 justify-center' : 'px-4 py-2.5 -mb-px'}
        ${_variant === 'pills' ? pillClasses : underlineClasses}
        ${className}
      `}
    >
      {children}
    </button>
  )
}

// ── TabPanel ──────────────────────────────────────────────────────────────────

export interface TabPanelProps {
  id: string
  children: React.ReactNode
  className?: string
}

export const TabPanel: React.FC<TabPanelProps> = ({ id, children, className = '' }) => {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabPanel must be inside Tabs')

  if (ctx.activeTab !== id) return null

  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${id}`}
      aria-labelledby={`${ctx.baseId}-tab-${id}`}
      tabIndex={0}
      className={`focus:outline-none ${className}`}
    >
      {children}
    </div>
  )
}

Tabs.displayName = 'Tabs'
TabList.displayName = 'TabList'
Tab.displayName = 'Tab'
TabPanel.displayName = 'TabPanel'
