import React, { createContext, useContext, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { queryKeys } from '@lenserfight/data/cache'
import { walletService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useLenser } from '@lenserfight/features/profile'

interface WalletContextType {
  balance: number | null
  hasBalance: boolean
  isLoading: boolean
  error: string | null
  redirectToStore: (delayMs?: number) => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const { hasLenser } = useLenser()
  const navigate = useNavigate()

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.wallet.balance,
    queryFn: () => walletService.getBalance(),
    enabled: isAuthenticated && hasLenser,
    staleTime: 1000 * 60 * 2,
  })

  const balance = data?.balance ?? null
  const error = queryError ? (queryError as Error).message || 'Failed to load balance' : null

  const redirectToStore = useCallback(
    (delayMs = 0) => {
      if (delayMs > 0) setTimeout(() => navigate('/store'), delayMs)
      else navigate('/store')
    },
    [navigate],
  )

  return (
    <WalletContext.Provider
      value={{
        balance,
        hasBalance: balance !== null && balance > 0,
        isLoading,
        error,
        redirectToStore,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}

/**
 * Opt-in hook: redirects to /store after 2s when the authenticated user has
 * no balance. Call this at the top of any page that requires credits.
 */
export function useRequireBalance(): void {
  const { isLoading, balance, redirectToStore } = useWallet()
  const { pathname } = useLocation()

  useEffect(() => {
    if (isLoading || balance === null) return
    if (pathname === '/store') return
    if (balance <= 0) redirectToStore(2000)
  }, [isLoading, balance, pathname, redirectToStore])
}
