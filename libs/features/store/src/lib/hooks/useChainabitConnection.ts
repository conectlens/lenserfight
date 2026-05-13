import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { partnerProvisioningRepository } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { CHAINABIT_API_BASE_URL } from '@lenserfight/utils/env'
import type { ChainabitAiModel, ChainabitConnectionState } from '@lenserfight/types'

export type { ChainabitConnectionState }

export interface UseChainabitConnectionResult {
  state: ChainabitConnectionState
  credits: number | null
  models: ChainabitAiModel[] | null
  reconnect: () => Promise<void>
}

function classifyError(err: unknown): 'no_account' | 'invalid_connection' {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('401') || msg.toLowerCase().includes('unauthenticated')) {
    return 'invalid_connection'
  }
  return 'no_account'
}

export function useChainabitConnection(): UseChainabitConnectionResult {
  const { isAuthenticated } = useAuth()

  const balanceQuery = useQuery({
    queryKey: ['chainabit', 'balance'],
    queryFn: () => partnerProvisioningRepository.getBalance('chainabit'),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
    retry: false,
  })

  const state: ChainabitConnectionState = (() => {
    if (balanceQuery.isLoading) return 'loading'
    if (balanceQuery.error) return classifyError(balanceQuery.error)
    if (!balanceQuery.data) return 'no_account'
    return balanceQuery.data.credits > 0 ? 'connected' : 'no_credits'
  })()

  const modelsQuery = useQuery({
    queryKey: ['chainabit', 'models'],
    queryFn: () => partnerProvisioningRepository.getAiModels('chainabit'),
    enabled: state === 'connected' || state === 'no_credits',
    staleTime: 1000 * 60 * 10,
    retry: false,
  })

  const reconnect = useCallback(async () => {
    const returnUrl = encodeURIComponent(window.location.href)
    window.location.href = `${CHAINABIT_API_BASE_URL}/v1/partners/chainabit/oauth/start?return_url=${returnUrl}`
  }, [])

  return {
    state,
    credits: balanceQuery.data?.credits ?? null,
    models: modelsQuery.data ?? null,
    reconnect,
  }
}
