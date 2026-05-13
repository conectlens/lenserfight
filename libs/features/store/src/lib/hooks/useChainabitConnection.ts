import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { partnerProvisioningRepository } from '@lenserfight/data/repositories'
import { partnerApiClient } from '@lenserfight/infra/partner-provisioning'
import { useAuth } from '@lenserfight/features/auth'
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
    await partnerApiClient.startOAuthConnect(window.location.href)
  }, [])

  return {
    state,
    credits: balanceQuery.data?.credits ?? null,
    models: modelsQuery.data ?? null,
    reconnect,
  }
}
