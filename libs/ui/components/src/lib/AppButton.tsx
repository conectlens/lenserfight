import React from 'react'
import { Button, ButtonProps } from './Button'

/**
 * App-aware Button previously reached into auth/profile/store contexts.
 * Keep it as a thin passthrough so the shared UI package stays dependency-light.
 */
export const AppButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <Button ref={ref} {...props} />
)

AppButton.displayName = 'AppButton'
