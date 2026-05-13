import React from 'react'
import { useChainabitConnection } from '../hooks/useChainabitConnection'
import { WalletProvider } from './WalletContext'

/**
 * GRASP: Controller + Protected Variation.
 *
 * Mounts WalletProvider only when the current user has a provisioned Chainabit
 * account. Users without a Chainabit connection render children directly with
 * the fallback wallet state (balance: null, hasBalance: false) that useWallet
 * already returns when no provider is in scope.
 *
 * This keeps DashboardFrame free of Chainabit-specific knowledge and keeps
 * WalletProvider free of connection-gate logic (single responsibility).
 */
export const ChainabitWalletGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useChainabitConnection()

  const hasChainabitAccount =
    state === 'connected' ||
    state === 'no_credits' ||
    state === 'invalid_connection' ||
    state === 'provider_error'

  if (!hasChainabitAccount) {
    return <>{children}</>
  }

  return <WalletProvider>{children}</WalletProvider>
}
