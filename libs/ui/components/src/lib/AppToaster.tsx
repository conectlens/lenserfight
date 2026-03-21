import React from 'react'
import { Toaster } from 'sonner'
import { useTheme } from '@lenserfight/ui/theme'

export function AppToaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Toaster
      position="bottom-right"
      theme={resolvedTheme}
      richColors
      closeButton
      style={{ zIndex: 9999 }}
    />
  )
}
