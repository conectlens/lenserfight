import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { partnerProvisioningRepository } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import type { PartnerAiModel, PartnerConnectionState } from '@lenserfight/types'

export interface UsePartnerConnectionResult {
  state: PartnerConnectionState
  credits: number | null
  models: PartnerAiModel[] | null
  reconnect: () => Promise<void>
  invalidate: () => Promise<void>
}

function isNotProvisioned(err: unknown): boolean {
  if (err && typeof err === 'object') {
    return (err as Record<string, unknown>)['error'] === 'not_provisioned'
  }
  return false
}

function classifyError(err: unknown): 'no_account' | 'invalid_connection' | 'provider_error' {
  if (isNotProvisioned(err)) return 'no_account'
  if (err && typeof err === 'object') {
    const code = (err as Record<string, unknown>)['error'] as string | undefined
    if (code === 'unauthorized' || code === 'unauthenticated') return 'invalid_connection'
    if (code === 'provider_error') return 'provider_error'
  }
  if (err instanceof Error) {
    const msg = err.message
    if (msg.includes('401') || msg.toLowerCase().includes('unauthenticated')) return 'invalid_connection'
  }
  return 'no_account'
}

export function usePartnerConnection(partnerName: string): UsePartnerConnectionResult {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const balanceQuery = useQuery({
    queryKey: ['partner', partnerName, 'balance'],
    queryFn: () => partnerProvisioningRepository.getBalance(partnerName),
    // Only fire for authenticated users; unconnected users are gated via state, not repeated calls.
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    retry: false,
    // Prevents re-fetching on every component mount (error state has no dataUpdatedAt,
    // so the query is always "stale" and would re-fire on every route change without this).
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const state: PartnerConnectionState = (() => {
    if (balanceQuery.isLoading) return 'loading'
    if (balanceQuery.error) return classifyError(balanceQuery.error)
    if (!balanceQuery.data) return 'no_account'
    return balanceQuery.data.credits > 0 ? 'connected' : 'no_credits'
  })()

  const modelsQuery = useQuery({
    queryKey: ['partner', partnerName, 'models'],
    queryFn: () => partnerProvisioningRepository.getAiModels(partnerName),
    enabled: state === 'connected' || state === 'no_credits',
    staleTime: 1000 * 60 * 10,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const reconnect = useCallback(async () => {
    await partnerProvisioningRepository.startOAuthConnect(window.location.href)
  }, [])

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['partner', partnerName] })
  }, [queryClient, partnerName])

  return {
    state,
    credits: balanceQuery.data?.credits ?? null,
    models: modelsQuery.data ?? null,
    reconnect,
    invalidate,
  }
}
