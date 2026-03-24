/**
 * ToastProvider.tsx — web stub.
 *
 * On web, the app uses AppToaster (sonner). This stub exports a no-op
 * provider and useToast hook so that shared feature code can import from here.
 */
import React from 'react'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning'

export interface ToastItem {
  id:       string
  message:  string
  variant?: ToastVariant
  duration?: number
}

export function useToast() {
  return {
    show: (_message: string, _options?: Partial<Omit<ToastItem, 'id' | 'message'>>) => {
      // No-op on web — use AppToaster (sonner) directly in web feature code
    },
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
)

ToastProvider.displayName = 'ToastProvider'
