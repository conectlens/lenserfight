import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { connectorApiClient } from '@lenserfight/infra/partner-provisioning'
import { useAuth } from '@lenserfight/features/auth'
import type { ChainabitAiModel, ProviderConnectionState } from '@lenserfight/types'

// ---------------------------------------------------------------------------
// Types

export interface UseChainabitCapabilitiesResult {
  /** Current connection state derived from the wallet query. */
  state: ProviderConnectionState
  /** Credit balance from Chainabit's own wallet. null while loading or disconnected. */
  credits: number | null
  /** Available AI models. null until the wallet query confirms connectivity. */
  models: ChainabitAiModel[] | null
  /** Re-initiates the OAuth linkIdentity flow to (re)connect Chainabit. */
  reconnect: () => Promise<void>
  /** Invalidates cached wallet + models queries. */
  invalidate: () => Promise<void>
}

// Back-compat alias: callers using the old result type continue to work.
export type UsePartnerConnectionResult = UseChainabitCapabilitiesResult

// ---------------------------------------------------------------------------
// Error classification

function classifyError(err: unknown): ProviderConnectionState {
  if (err && typeof err === 'object') {
    const code = (err as Record<string, unknown>)['error'] as string | undefined
    if (code === 'not_connected') return 'not_connected'
    if (code === 'token_expired') return 'token_expired'
    if (code === 'insufficient_scope') return 'insufficient_scope'
    if (code === 'unauthorized' || code === 'unauthenticated') return 'token_expired'
  }
  if (err instanceof Error) {
    const msg = err.message
    if (msg.includes('not_connected') || msg.toLowerCase().includes('no chainabit')) return 'not_connected'
    if (msg.includes('401')) return 'token_expired'
  }
  return 'provider_error'
}

// ---------------------------------------------------------------------------

/**
 * Provides Chainabit capability state for the current user.
 *
 * Reads wallet balance from the chainabit-wallet Edge Function, which resolves
 * the OAuth token from auth.identities server-side.  No provisioning, no stored
 * developer tokens.
 *
 * State machine:
 *   loading           → wallet query in flight
 *   connected         → balance ≥ 1
 *   no_credits        → balance === 0 (connected, wallet empty)
 *   not_connected     → user has no Chainabit OAuth identity linked
 *   token_expired     → OAuth token expired — reconnect needed
 *   insufficient_scope → connected but missing required scopes
 *   provider_error    → Chainabit API failure
 */
export function useChainabitCapabilities(): UseChainabitCapabilitiesResult {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const balanceQuery = useQuery({
    queryKey: ['chainabit', 'wallet'],
    queryFn: () => connectorApiClient.getBalance(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    retry: false,
    // Suppress re-fetches in error state — the query has no dataUpdatedAt and
    // would be considered stale on every mount/focus change, generating noise.
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const state: ProviderConnectionState = (() => {
    if (balanceQuery.isLoading) return 'loading'
    if (balanceQuery.error) return classifyError(balanceQuery.error)
    if (!balanceQuery.data) return 'not_connected'
    return balanceQuery.data.credits > 0 ? 'connected' : 'no_credits'
  })()

  const modelsQuery = useQuery({
    queryKey: ['chainabit', 'models'],
    queryFn: () => connectorApiClient.getAiModels(),
    enabled: state === 'connected' || state === 'no_credits',
    staleTime: 1000 * 60 * 10,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const reconnect = useCallback(async () => {
    await connectorApiClient.connect(window.location.href)
  }, [])

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['chainabit'] })
  }, [queryClient])

  return {
    state,
    credits: balanceQuery.data?.credits ?? null,
    models: modelsQuery.data ?? null,
    reconnect,
    invalidate,
  }
}

/** @deprecated Use useChainabitCapabilities(). partnerName argument is ignored. */
export function usePartnerConnection(_partnerName: string): UseChainabitCapabilitiesResult {
  return useChainabitCapabilities()
}
