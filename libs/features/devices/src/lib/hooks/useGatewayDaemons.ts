import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { useAuth } from '@lenserfight/features/auth'

// Phase BB — owner-scoped registry of long-running gateway daemons
// (agents.gateway_devices). Distinct from useDevices() which targets the
// legacy devices.* trusted-device flow.

export interface GatewayDaemonRecord {
  deviceId: string
  hostname: string | null
  daemonVersion: string | null
  lastSeenAt: string | null
  approvedAt: string | null
  revokedAt: string | null
  killSwitch: boolean
  createdAt: string
  /** Phase BE: # of unclaimed commands queued for this daemon. */
  pendingCommands?: number
  /** Phase BE: # of commands the daemon has not acked yet. */
  unackedCommands?: number
}

const QUERY_KEY = ['gateway-daemons']

function mapRow(row: Record<string, unknown>): GatewayDaemonRecord {
  return {
    deviceId: row['device_id'] as string,
    hostname: (row['hostname'] as string) ?? null,
    daemonVersion: (row['daemon_version'] as string) ?? null,
    lastSeenAt: (row['last_seen_at'] as string) ?? null,
    approvedAt: (row['approved_at'] as string) ?? null,
    revokedAt: (row['revoked_at'] as string) ?? null,
    killSwitch: Boolean(row['kill_switch']),
    createdAt: row['created_at'] as string,
    pendingCommands:
      typeof row['pending_commands'] === 'number'
        ? (row['pending_commands'] as number)
        : Number(row['pending_commands'] ?? 0),
    unackedCommands:
      typeof row['unacked_commands'] === 'number'
        ? (row['unacked_commands'] as number)
        : Number(row['unacked_commands'] ?? 0),
  }
}

export function useGatewayDaemons() {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  const { data: daemons = [], isLoading, error, refetch } = useQuery<GatewayDaemonRecord[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // Phase BE: prefer the richer health view (joins pending command counts);
      // fall back to the bare device list if the health RPC is unavailable.
      const health = await supabase.rpc('fn_get_gateway_device_health')
      if (!health.error && Array.isArray(health.data)) {
        return ((health.data as unknown[]) ?? []).map((r) => mapRow(r as Record<string, unknown>))
      }
      const { data, error } = await supabase.rpc('fn_list_gateway_devices', { p_limit: 50 })
      if (error) throw error
      return ((data as unknown[]) ?? []).map((r) => mapRow(r as Record<string, unknown>))
    },
    enabled: isAuthenticated,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const approveMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase.rpc('fn_gateway_approve_device', { p_device_id: deviceId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const revokeMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase.rpc('fn_gateway_revoke_device', { p_device_id: deviceId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  return {
    daemons,
    isLoading,
    error,
    refetch,
    approve: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    revoke: revokeMutation.mutateAsync,
    isRevoking: revokeMutation.isPending,
  }
}
