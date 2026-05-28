import React, { useEffect, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

export interface DropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  menuClassName?: string
}

export interface DropdownItemProps {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  destructive?: boolean
  icon?: React.ReactNode
  disabled?: boolean
  className?: string
}

export interface DropdownSeparatorProps {
  className?: string
}

export interface DropdownLabelProps {
  children: React.ReactNode
  className?: string
}

// ── Sub-components ─────────────────────────────────────────────────────────

function DropdownItem({
  children,
  onClick,
  href,
  destructive = false,
  icon,
  disabled = false,
  className = '',
}: DropdownItemProps) {
  const baseClass = `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50 disabled:pointer-events-none disabled:opacity-50 ${
    destructive
      ? 'text-status-red hover:bg-status-red/10 dark:hover:bg-status-red/10'
      : 'text-greyscale-700 dark:text-greyscale-300 hover:bg-greyscale-100 dark:hover:bg-primary-dark-500'
  } ${className}`

  if (href) {
    return (
      <a href={href} role="menuitem" className={baseClass}>
        {icon && <span className="h-4 w-4 shrink-0">{icon}</span>}
        {children}
      </a>
    )
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={baseClass}
    >
      {icon && <span className="h-4 w-4 shrink-0">{icon}</span>}
      {children}
    </button>
  )
}

function DropdownSeparator({ className = '' }: DropdownSeparatorProps) {
  return (
    <div
      role="separator"
      className={`my-1 h-px bg-greyscale-200 dark:bg-greyscale-800 ${className}`}
    />
  )
}

function DropdownLabel({ children, className = '' }: DropdownLabelProps) {
  return (
    <div className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-greyscale-400 ${className}`}>
      {children}
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────

function DropdownRoot({
  trigger,
  children,
  align = 'left',
  open: controlledOpen,
  onOpenChange,
  className = '',
  menuClassName = '',
}: DropdownProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen

  function setOpen(next: boolean) {
    if (onOpenChange) onOpenChange(next)
    else setUncontrolledOpen(next)
  }

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <div onClick={() => setOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          role="menu"
          className={`absolute z-50 mt-1 min-w-[160px] rounded-xl border border-greyscale-200 bg-white p-1 shadow-lg dark:border-greyscale-800 dark:bg-primary-dark-500 ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full ${menuClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// ── Compound export ────────────────────────────────────────────────────────

export const Dropdown = Object.assign(DropdownRoot, {
  Item: DropdownItem,
  Separator: DropdownSeparator,
  Label: DropdownLabel,
})

export { DropdownItem, DropdownSeparator, DropdownLabel }
