import React, { createContext, useContext, useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// ── Context ────────────────────────────────────────────────────────────────

interface AccordionContextValue {
  type: 'single' | 'multiple'
  openIds: Set<string>
  toggle: (id: string) => void
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

function useAccordionContext() {
  const ctx = useContext(AccordionContext)
  if (!ctx) throw new Error('AccordionItem must be used inside Accordion')
  return ctx
}

// ── Root ───────────────────────────────────────────────────────────────────

export interface AccordionProps {
  type?: 'single' | 'multiple'
  defaultOpenIndex?: number
  className?: string
  children: React.ReactNode
}

function AccordionRoot({
  type = 'single',
  className = '',
  children,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (type === 'single') next.clear()
        next.add(id)
      }
      return next
    })
  }

  return (
    <AccordionContext.Provider value={{ type, openIds, toggle }}>
      <div className={`divide-y divide-greyscale-200 dark:divide-greyscale-800 rounded-xl border border-greyscale-200 dark:border-greyscale-800 ${className}`}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

// ── Item ───────────────────────────────────────────────────────────────────

export interface AccordionItemProps {
  title: string
  icon?: React.ReactNode
  /** Rendered as an absolutely-positioned overlay to the right of the toggle button (outside the button element, so nested interactives are valid). */
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
  // Controlled variant
  isOpen?: boolean
  onToggle?: () => void
}

function AccordionItem({
  title,
  icon,
  actions,
  className = '',
  children,
  isOpen: controlledOpen,
  onToggle: controlledToggle,
}: AccordionItemProps) {
  const id = useId()
  const panelId = `panel-${id}`
  const triggerId = `trigger-${id}`

  // Support both uncontrolled (inside <Accordion>) and controlled standalone use
  let ctx: AccordionContextValue | null = null
  try {
    ctx = useAccordionContext()
  } catch {
    // standalone usage — no context
  }

  const isOpen = controlledOpen !== undefined
    ? controlledOpen
    : ctx
    ? ctx.openIds.has(id)
    : false

  function handleToggle() {
    if (controlledToggle) {
      controlledToggle()
    } else if (ctx) {
      ctx.toggle(id)
    }
  }

  return (
    <div className={`overflow-hidden relative ${className}`}>
      <button
        id={triggerId}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={handleToggle}
        className={`flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-semibold text-greyscale-900 dark:text-greyscale-100 transition-colors hover:bg-greyscale-50 dark:hover:bg-primary-dark-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50 ${actions ? 'pr-10' : ''}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {icon && <span className="shrink-0 text-greyscale-500">{icon}</span>}
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-greyscale-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {actions && (
        <div className="absolute right-8 top-0 bottom-0 flex items-center pointer-events-auto z-10">
          {actions}
        </div>
      )}
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pb-4 text-sm text-greyscale-600 dark:text-greyscale-400">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Compound export ────────────────────────────────────────────────────────

export const Accordion = Object.assign(AccordionRoot, { Item: AccordionItem })
export { AccordionItem }
