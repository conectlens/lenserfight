import {
  XPSummary,
  XPEvent,
  LenserBadge,
  LeaderboardEntry,
  LeaderboardTimeframe,
  LeaderboardScope,
} from '../types/xp.types'
import { supabase } from '../core/supabase/client'

export interface XPRepositoryPort {
  getXPSummary(lenserId: string): Promise<XPSummary | null>
  getHistory(lenserId: string, limit?: number): Promise<XPEvent[]>
  getBadges(lenserId: string): Promise<LenserBadge[]>
  getLeaderboard(
    timeframe: LeaderboardTimeframe,
    scope: LeaderboardScope,
    limit?: number,
    offset?: number
  ): Promise<{ list: LeaderboardEntry[]; userEntry?: LeaderboardEntry | null }>
}

// --- Supabase Implementation ---
export class SupabaseXPRepository implements XPRepositoryPort {
  private DEFAULT_APP_ID = '00000000-0000-0000-0000-000000000000'

  async getXPSummary(lenserId: string): Promise<XPSummary | null> {
    const { data: totals, error } = await supabase
      .from('xp_totals')
      .select('total_xp, current_level, app_id')
      .eq('lenser_id', lenserId)
      .maybeSingle()

    if (error) throw error

    const currentTotal = totals?.total_xp || 0
    const currentLevel = totals?.current_level || 1
    const appId = totals?.app_id || this.DEFAULT_APP_ID

    const { data: rankData } = await supabase
      .from('vw_xp_leaderboard_global')
      .select('rank')
      .eq('lenser_id', lenserId)
      .maybeSingle()

    const { data: levelData } = await supabase
      .from('xp_levels')
      .select('min_total_xp, max_total_xp')
      .eq('app_id', appId)
      .eq('level', currentLevel)
      .maybeSingle()

    return {
      totalXp: currentTotal,
      currentLevel: currentLevel,
      rank: rankData?.rank,
      currentLevelMinXp: levelData?.min_total_xp ?? 0,
      currentLevelMaxXp: levelData?.max_total_xp ?? undefined,
    }
  }

  async getHistory(lenserId: string, limit = 20): Promise<XPEvent[]> {
    const { data, error } = await supabase
      .from('xp_events')
      .select('id, rule_key, xp, source, created_at')
      .eq('lenser_id', lenserId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data.map((row) => ({
      id: row.id,
      action: row.rule_key,
      xp: row.xp,
      source: row.source,
      createdAt: row.created_at,
    }))
  }

  async getBadges(lenserId: string): Promise<LenserBadge[]> {
    const { data, error } = await supabase
      .from('lenser_badges')
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
