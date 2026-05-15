import React from 'react'
import { Button } from '@lenserfight/ui/components'

export interface DrawerFooterProps {
  /** Cancel / close handler. Renders the secondary "Cancel" button. */
  onCancel?: () => void
  /** Label for the cancel button. @default 'Cancel' */
  cancelLabel?: React.ReactNode
  /** Primary save / submit handler. */
  onSubmit?: () => void
  /** Label for the primary action button. @default 'Save' */
  submitLabel?: React.ReactNode
  /** Whether the primary action is in progress. Shows a spinner. */
  isLoading?: boolean
  /** Whether the primary action is disabled. */
  disabled?: boolean
  /** Optional extra content to render to the left of the buttons (e.g. a help link). */
  leading?: React.ReactNode
  /** Variant for the cancel button. @default 'secondary' */
  cancelVariant?: 'secondary' | 'outline' | 'ghost'
  /** Additional CSS class names appended to the root wrapper. */
  className?: string
  /**
   * Render arbitrary children instead of the default two-button layout.
   * When provided, all other button-related props are ignored.
   */
  children?: React.ReactNode
}

/**
 * Standardised footer for Drawer panels.
 *
 * Provides a consistent right-aligned action bar with optional cancel and
 * primary buttons. Drop-in replacement for raw
 * `<div className="flex justify-end gap-2 pt-2">` blocks.
 *
 * @example
 * <DrawerFooter
 *   onCancel={onClose}
 *   onSubmit={handleSave}
 *   submitLabel={submitting ? 'Saving…' : 'Save'}
 *   isLoading={submitting}
 *   disabled={submitting}
 * />
 *
 * @example Custom children
 * <DrawerFooter>
 *   <Button variant="ghost" onClick={onClose}>Back</Button>
 *   <Tooltip content="Tooltip"><Button onClick={save}>Create</Button></Tooltip>
 * </DrawerFooter>
 */
export const DrawerFooter: React.FC<DrawerFooterProps> = ({
  onCancel,
  cancelLabel = 'Cancel',
  onSubmit,
  submitLabel = 'Save',
  isLoading = false,
  disabled = false,
  leading,
  cancelVariant = 'secondary',
  className = '',
  children,
}) => {
  return (
    <div
      className={[
        'flex items-center gap-2 pt-4 mt-2 border-t border-gray-100 dark:border-gray-800',
        leading ? 'justify-between' : 'justify-end',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {leading && <div className="flex items-center gap-2">{leading}</div>}

      {children ? (
        <div className="flex items-center gap-2">{children}</div>
      ) : (
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant={cancelVariant}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          )}
          {onSubmit && (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={disabled}
              isLoading={isLoading}
            >
              {submitLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

DrawerFooter.displayName = 'DrawerFooter'
