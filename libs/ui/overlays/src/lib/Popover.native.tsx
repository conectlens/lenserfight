/**
 * Popover.native.tsx — Modal-fallback popover for React Native.
 *
 * Anchored positioning requires a measure() call on the anchor ref and
 * calculating offsets from the measured rect. This full implementation is deferred.
 *
 * MVP: Opens children in a centered Modal overlay (same as Dialog).
 * For anchored tooltips, integrate @gorhom/portal or measure() in a future phase.
 */
import React from 'react'
import type { ViewStyle } from 'react-native'
import { Dialog } from './Dialog.native'

export interface PopoverProps {
  open:                boolean
  onClose?:            () => void
  /** Trigger element — not used for anchoring in MVP (positioning is deferred) */
  trigger?:            React.ReactNode
  children:            React.ReactNode
  title?:              string
}

/**
 * @example
 * <Popover open={showMenu} onClose={close}>
 *   <ActionList items={actions} />
 * </Popover>
 */
export const Popover: React.FC<PopoverProps> = ({
  open,
  onClose,
  title,
  children,
}) => {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {children}
    </Dialog>
  )
}

Popover.displayName = 'Popover'
