import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { useAuth } from '@lenserfight/features/auth'
import type { XPSummary, DeviceRecord } from '@lenserfight/types'

interface AccountSummary {
  xpSummary: XPSummary | null
  devices: DeviceRecord[]
  recentBattles: Array<{
    id: string
    slug: string
    title: string | null
    status: string
    createdAt: string
  }>
}

export function useAccountSummary() {
  const { isAuthenticated } = useAuth()

  return useQuery<AccountSummary>({
    queryKey: ['account-summary'],
    queryFn: async () => {
      const [xpResult, devicesResult, battlesResult] = await Promise.all([
        supabase.rpc('fn_xp_get_summary', {}),
        supabase.rpc('fn_device_list', { p_trust_level: null, p_limit: 3 }),
        Promise.resolve(supabase.rpc('fn_battles_feed', { p_limit: 5 })).catch(() => ({ data: null, error: null })),
      ])

      const xpRow = xpResult.data as Record<string, unknown> | null
      const xpSummary: XPSummary | null = xpRow
        ? {
            totalXp: (xpRow['total_xp'] as number) ?? 0,
            currentLevel: (xpRow['current_level'] as number) ?? 1,
            rank: (xpRow['rank'] as number) ?? undefined,
          }
        : null

      const deviceRows = ((devicesResult.data as unknown[]) ?? []) as Array<Record<string, unknown>>
      const devices: DeviceRecord[] = deviceRows.map((row) => ({
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
      }))

      const battleRows = ((battlesResult.data as unknown[]) ?? []) as Array<Record<string, unknown>>
      const recentBattles = battleRows.map((row) => ({
        id: row['id'] as string,
        slug: row['slug'] as string,
        title: (row['title'] as string) ?? null,
        status: (row['status'] as string) ?? '',
        createdAt: row['created_at'] as string,
      }))

      return { xpSummary, devices, recentBattles }
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  })
}
