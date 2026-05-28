/**
 * Portal.native.tsx — Pass-through on React Native.
 *
 * React Native's Modal component handles z-ordering natively.
 * Portal renders its children directly; the actual overlay component
 * (Dialog, BottomSheet, etc.) uses RN Modal internally.
 */
import React from 'react'

export interface PortalProps {
  children: React.ReactNode
}

export const Portal: React.FC<PortalProps> = ({ children }) => <>{children}</>
Portal.displayName = 'Portal'
