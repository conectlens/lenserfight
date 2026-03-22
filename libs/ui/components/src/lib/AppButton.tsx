import React from 'react'
import { useAuth } from '@lenserfight/features/auth'
import { useLenser } from '@lenserfight/features/profile'
import { useWallet } from '@lenserfight/features/store'
import { Button, ButtonProps } from './Button'

/**
 * App-aware Button that automatically reads AuthContext, LenserContext, and
 * WalletContext. When any context has an error the button appears visually
 * disabled and shows that error as a toast on click — without needing any
 * prop drilling from the caller.
 */
export const AppButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const { error: authError } = useAuth()
    const { error: lenserError } = useLenser()
    const { error: walletError } = useWallet()
    const contextError = authError || lenserError || walletError || undefined

    return <Button ref={ref} contextError={contextError} {...props} />
  }
)

AppButton.displayName = 'AppButton'
