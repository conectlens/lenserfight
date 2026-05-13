import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { queryKeys } from '@lenserfight/data/cache'
import { walletService } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
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
  const { hasLenser, lenser } = useLenser()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.wallet.balance,
    queryFn: () => walletService.getBalance(),
    enabled: isAuthenticated && hasLenser,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  })

  const balance = data?.balance ?? null
  const error = queryError ? (queryError as Error).message || 'Failed to load balance' : null

  // Subscribe to Chainabit webhook broadcast so balance refreshes without polling
  useEffect(() => {
    const lenserId = lenser?.id
    if (!lenserId) return

    const channel = supabase
      .channel(`wallet:${lenserId}`)
      .on('broadcast', { event: 'balance_updated' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.wallet.balance })
      })
      .subscribe()

    channelRef.current = channel
    return () => { channel.unsubscribe() }
  }, [lenser?.id, qc])

  const redirectToStore = useCallback(
    (delayMs = 0) => {
      if (delayMs > 0) setTimeout(() => navigate('/billing'), delayMs)
      else navigate('/billing')
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

const WALLET_FALLBACK: WalletContextType = {
  balance: null,
  hasBalance: false,
  isLoading: false,
  error: null,
  redirectToStore: () => undefined,
}

export const useWallet = () => useContext(WalletContext) ?? WALLET_FALLBACK

/**
 * Opt-in hook: redirects to /billing after 2s when the authenticated user has
 * no balance. Call this at the top of any page that requires credits.
 */
export function useRequireBalance(): void {
  const { isLoading, balance, redirectToStore } = useWallet()
  const { pathname } = useLocation()

  useEffect(() => {
    if (isLoading || balance === null) return
    if (pathname === '/billing') return
    if (balance <= 0) redirectToStore(2000)
  }, [isLoading, balance, pathname, redirectToStore])
}
