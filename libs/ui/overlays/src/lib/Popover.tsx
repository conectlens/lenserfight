import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Portal } from './Portal'

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right' | 'bottom-start' | 'bottom-end'

export interface PopoverProps {
  open: boolean
  onClose?: () => void
  /** The anchor element — pass a ref or a render prop */
  anchorRef: React.RefObject<HTMLElement | null>
  children: React.ReactNode
  placement?: PopoverPlacement
  className?: string
  /** Offset in px from anchor */
  offset?: number
}

/**
 * Anchor-positioned floating panel for dropdowns, menus, pickers, etc.
 * Positions itself relative to anchorRef using getBoundingClientRect.
 *
 * @example
 * const triggerRef = useRef(null)
 * <button ref={triggerRef} onClick={() => setOpen(true)}>Options</button>
 * <Popover open={open} onClose={() => setOpen(false)} anchorRef={triggerRef}>
 *   <PopoverContent />
 * </Popover>
 */
export const Popover: React.FC<PopoverProps> = ({
  open,
  onClose,
  anchorRef,
  children,
  placement = 'bottom-start',
  className = '',
  offset = 6,
}) => {
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  const computePosition = useCallback(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const scrollTop = window.scrollY
    const scrollLeft = window.scrollX

    switch (placement) {
      case 'bottom':
        setCoords({
          top: rect.bottom + scrollTop + offset,
          left: rect.left + scrollLeft + rect.width / 2,
        })
        break
      case 'bottom-end':
        setCoords({
          top: rect.bottom + scrollTop + offset,
          left: rect.right + scrollLeft,
        })
        break
      case 'top':
        setCoords({
          top: rect.top + scrollTop - offset,
          left: rect.left + scrollLeft,
        })
        break
      case 'bottom-start':
      default:
        setCoords({
          top: rect.bottom + scrollTop + offset,
          left: rect.left + scrollLeft,
        })
        break
    }
  }, [anchorRef, placement, offset])

  useEffect(() => {
    if (!open) return
    computePosition()
    window.addEventListener('resize', computePosition)
    window.addEventListener('scroll', computePosition, { capture: true })
    return () => {
      window.removeEventListener('resize', computePosition)
      window.removeEventListener('scroll', computePosition, { capture: true })
    }
  }, [open, computePosition])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      ) return
      onClose?.()
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [open, onClose, anchorRef])

  if (!open) return null

  return (
    <Portal>
      <div
        ref={panelRef}
        role="dialog"
        style={{ top: coords.top, left: coords.left, position: 'absolute' }}
        className={`
          z-[9999] min-w-[10rem]
          bg-surface-raised
          rounded-xl border border-surface-border
          animate-in fade-in zoom-in-95 duration-fast origin-top
          focus:outline-none
          ${className}
        `}
      >
        {children}
      </div>
    </Portal>
  )
}

Popover.displayName = 'Popover'
