import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { useAuth } from '@lenserfight/features/auth'
import type { DeviceRecord } from '@lenserfight/types'

const QUERY_KEY = 'devices'

function mapRow(row: Record<string, unknown>): DeviceRecord {
  return {
    id: row['id'] as string,
    lenserId: row['lenser_id'] as string,
    name: row['name'] as string,
    deviceType: (row['device_type'] as DeviceRecord['deviceType']) ?? 'other',
    os: (row['os'] as string) ?? null,
    arch: (row['arch'] as string) ?? null,
    cliVersion: (row['cli_version'] as string) ?? null,
    runnerVersion: (row['runner_version'] as string) ?? null,
    capabilities: (row['capabilities'] as DeviceRecord['capabilities']) ?? {},
    trustLevel: (row['trust_level'] as DeviceRecord['trustLevel']) ?? 'pending',
    gatewayStatus: (row['gateway_status'] as string) ?? 'disconnected',
    lastSeenAt: (row['last_seen_at'] as string) ?? null,
    revokedAt: (row['revoked_at'] as string) ?? null,
    createdAt: row['created_at'] as string,
  }
}

export function useDevices() {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  const { data: devices = [], isLoading, error, refetch } = useQuery<DeviceRecord[]>({
    queryKey: [QUERY_KEY, 'list'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_device_list', {
        p_trust_level: null,
        p_limit: 50,
      })
      if (error) throw error
      return ((data as unknown[]) ?? []).map((r) => mapRow(r as Record<string, unknown>))
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  })

  const registerMutation = useMutation({
    mutationFn: async (dto: { name: string; deviceType?: string; os?: string; arch?: string }) => {
      const { data, error } = await supabase.rpc('fn_device_register', {
        p_name: dto.name,
        p_device_type: dto.deviceType ?? 'other',
        p_os: dto.os ?? null,
        p_arch: dto.arch ?? null,
        p_cli_version: null,
        p_capabilities: {},
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })

  const revokeMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase.rpc('fn_device_revoke', { p_device_id: deviceId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })

  const approveMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase.rpc('fn_device_approve', { p_device_id: deviceId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })

  return {
    devices,
    isLoading,
    error,
    refetch,
    registerDevice: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    revokeDevice: revokeMutation.mutateAsync,
    isRevoking: revokeMutation.isPending,
    approveDevice: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
  }
}
