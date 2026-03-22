import {
  XPSummary,
  XPEvent,
  XPApp,
  XPContribution,
  LenserBadge,
  LeaderboardEntry,
  LeaderboardTimeframe,
  LeaderboardScope,
} from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

export const XP_APP_IDS = {
  global: '00000000-0000-0000-0000-000000000000',
  forum: '00000000-0000-0000-0000-000000000001',
  arena: '00000000-0000-0000-0000-000000000002',
  cli: '00000000-0000-0000-0000-000000000003',
  auth: '00000000-0000-0000-0000-000000000004',
} as const

export interface XPRepositoryPort {
  getXPSummary(lenserId: string, appId?: string): Promise<XPSummary | null>
  getHistory(lenserId: string, limit?: number): Promise<XPEvent[]>
  getBadges(lenserId: string): Promise<LenserBadge[]>
  getLeaderboard(
    timeframe: LeaderboardTimeframe,
    scope: LeaderboardScope,
    limit?: number,
    offset?: number
  ): Promise<{ list: LeaderboardEntry[]; userEntry?: LeaderboardEntry | null }>
  getApps(): Promise<XPApp[]>
  getContributions(lenserId: string): Promise<XPContribution[]>
}

// --- Supabase Implementation ---
export class SupabaseXPRepository implements XPRepositoryPort {
  async getXPSummary(lenserId: string, appId?: string): Promise<XPSummary | null> {
    const { data, error } = await supabase.rpc('fn_xp_get_summary', {
      p_lenser_id: lenserId,
      p_app_id: appId ?? null,
    })

    if (error) throw error

    const row = data?.[0]
    if (!row) return null

    const { data: rankData } = await supabase
      .from('vw_xp_leaderboard_global')
      .select('rank')
      .eq('lenser_id', lenserId)
      .maybeSingle()

    return {
      totalXp: row.total_xp ?? 0,
      currentLevel: row.current_level ?? 1,
      rank: rankData?.rank,
      currentLevelMinXp: row.min_total_xp ?? 0,
      currentLevelMaxXp: row.max_total_xp ?? undefined,
    }
  }

  async getHistory(lenserId: string, limit = 20): Promise<XPEvent[]> {
    const { data, error } = await supabase.rpc('fn_xp_get_history', {
      p_lenser_id: lenserId,
      p_limit: limit,
    })

    if (error) throw error

    return (data ?? []).map((row: any) => ({
      id: row.id,
      action: row.action_key,
      xp: row.xp,
      baseXp: row.base_xp,
      source: row.source,
      createdAt: row.created_at,
    }))
  }

  async getApps(): Promise<XPApp[]> {
    const { data, error } = await supabase.rpc('fn_xp_get_apps')

    if (error) throw error

    return (data ?? []).map((row: any) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      difficulty: row.difficulty,
      isActive: row.is_active,
    }))
  }

  async getContributions(lenserId: string): Promise<XPContribution[]> {
    const { data, error } = await supabase.rpc('fn_xp_get_contributions', {
      p_lenser_id: lenserId,
    })

    if (error) throw error

    return (data ?? []).map((row: any) => ({
      id: row.id,
      lenserId: row.lenser_id,
      context: row.context,
      contributionType: row.contribution_type,
      externalRef: row.external_ref ?? undefined,
      title: row.title ?? undefined,
      verifiedBy: row.verified_by ?? undefined,
      xpEventId: row.xp_event_id ?? undefined,
      createdAt: row.created_at,
    }))
  }

  async getBadges(lenserId: string): Promise<LenserBadge[]> {
    const { data, error } = await supabase
      .schema('lensers')
      .from('badges')
      .select('*')
      .eq('lenser_id', lenserId)
      .order('awarded_at', { ascending: false })

    if (error) throw error

    return data.map((b) => ({
      id: b.id,
      type: b.type,
      label: b.label,
      description: b.description || undefined,
      icon: b.icon || undefined,
      awardedAt: b.awarded_at,
    }))
  }

  async getLeaderboard(
    timeframe: LeaderboardTimeframe,
    scope: LeaderboardScope,
    limit = 50,
    offset = 0
  ): Promise<{ list: LeaderboardEntry[]; userEntry?: LeaderboardEntry | null }> {
    const viewName = scope === 'season' ? 'vw_xp_leaderboard_season' : 'vw_xp_leaderboard_global'

    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const currentUserId = session?.user?.id

    let userEntry: LeaderboardEntry | null = null

    const allEntries: LeaderboardEntry[] = data.map((row: any) => {
      const userProfile = row.user || {}
      return {
        rank: row.rank,
        lenserId: row.lenser_id,
        totalXp: row.total_xp,
        level: row.current_level,
        displayName: userProfile.display_name || 'Unknown Lenser',
        handle: userProfile.handle,
        avatarUrl: userProfile.avatar_url,
        streak: 0,
        trend: 'same',
      }
    })

    if (currentUserId) {
      userEntry = allEntries.find((e) => e.lenserId === currentUserId) || null
    }

    return { list: allEntries, userEntry }
  }
}
