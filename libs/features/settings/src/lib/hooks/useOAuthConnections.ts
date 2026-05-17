/**
 * useOAuthConnections — manages the user's OAuth connections to external providers.
 *
 * Data: fetches via fn_oauth_list_connections (authenticated, owner-scoped).
 * Connect: builds the Google OAuth 2.0 URL and redirects the browser.
 * Revoke: calls fn_oauth_revoke_connection and invalidates the query cache.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { useAuth } from '@lenserfight/features/auth'
import { useCallback } from 'react'
import type { OAuthCapability, OAuthProvider, UserOAuthConnection } from '@lenserfight/domain/oauth-connections'
import { getOAuthProvider } from '@lenserfight/domain/oauth-connections'

const FUNCTIONS_BASE_URL =
  typeof process !== 'undefined'
    ? (process.env['SUPABASE_FUNCTIONS_URL'] ??
       process.env['VITE_SUPABASE_FUNCTIONS_URL'] ??
       '')
    : (import.meta.env?.['VITE_SUPABASE_FUNCTIONS_URL'] ?? '')

const QUERY_KEY = ['oauth-connections'] as const

function mapRow(row: Record<string, unknown>): UserOAuthConnection {
  return {
    id: row['id'] as string,
    provider: row['provider'] as OAuthProvider,
    capability: row['capability'] as OAuthCapability,
    connectionLabel: row['connection_label'] as string,
    ref: row['ref'] as string,
    grantedScopes: (row['granted_scopes'] as string[]) ?? [],
    expiresAt: (row['expires_at'] as string | null) ?? null,
    isActive: row['is_active'] as boolean,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  }
}

export function useOAuthConnections() {
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuth()

  const {
    data: connections = [],
    isLoading,
    error,
  } = useQuery<UserOAuthConnection[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc('fn_oauth_list_connections')
      if (rpcError) throw rpcError
      return ((data as Record<string, unknown>[] | null) ?? []).map(mapRow)
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  })

  const connect = useCallback(async (
    provider: OAuthProvider,
    capability: OAuthCapability,
    label: string = 'primary',
  ) => {
    if (!user?.id) return

    // Fetch the lenser profile id (needed for the state payload)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.id) return

    const statePayload = {
      lenser_id: profile.id as string,
      capability,
      label,
      nonce: crypto.randomUUID(),
    }

    const state = btoa(JSON.stringify(statePayload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    const redirectUri = `${FUNCTIONS_BASE_URL}/oauth-google-callback`
    const providerDef = getOAuthProvider(provider)

    window.location.href = providerDef.buildAuthUrl(capability, redirectUri, state)
  }, [user?.id])

  const revokeMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error: rpcError } = await supabase.rpc('fn_oauth_revoke_connection', {
        p_connection_id: connectionId,
      })
      if (rpcError) throw rpcError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  return {
    connections,
    isLoading,
    error,
    connect,
    revoke: revokeMutation.mutate,
    isRevoking: revokeMutation.isPending,
    revokeError: revokeMutation.error,
  }
}
