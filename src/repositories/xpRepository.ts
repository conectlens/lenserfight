import {
  XPSummary,
  XPEvent,
  LenserBadge,
  LeaderboardEntry,
  LeaderboardTimeframe,
  LeaderboardScope,
} from '../types/xp.types'
import { storage } from '../utils/storage'
import { supabase } from '../utils/supabase'

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

// --- Mock Implementation ---
export class MockXPRepository implements XPRepositoryPort {
  private STORAGE_KEY = 'mock_xp_data'

  private getData() {
    const data = storage.getItem(this.STORAGE_KEY)
    return data ? JSON.parse(data) : { totalXp: 1250, currentLevel: 3, history: [], badges: [] }
  }

  private getMockLevelMinXp(level: number): number {
    if (level <= 1) return 0
    return (level - 1) * (level - 1) * 100
  }

  async getXPSummary(lenserId: string): Promise<XPSummary | null> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const data = this.getData()

    const currentMin = this.getMockLevelMinXp(data.currentLevel)
    // Mock Max calculation based on simple formula: L^2 * 100
    const currentMax = this.getMockLevelMinXp(data.currentLevel + 1)

    return {
      totalXp: data.totalXp,
      currentLevel: data.currentLevel,
      rank: 42,
      currentLevelMinXp: currentMin,
      currentLevelMaxXp: currentMax,
    }
  }

  async getHistory(lenserId: string, limit = 10): Promise<XPEvent[]> {
    return this.getData().history.slice(0, limit)
  }

  async getBadges(lenserId: string): Promise<LenserBadge[]> {
    return [
      {
        id: 'b1',
        type: 'LEVEL_5',
        label: 'Rising Star',
        description: 'Reached Level 5',
        awardedAt: new Date().toISOString(),
      },
    ]
  }

  async getLeaderboard(
    timeframe: LeaderboardTimeframe,
    scope: LeaderboardScope,
    limit = 50,
    offset = 0
  ): Promise<{ list: LeaderboardEntry[]; userEntry?: LeaderboardEntry | null }> {
    await new Promise((resolve) => setTimeout(resolve, 600)) // Simulate realistic load

    // Generate deterministic mock data based on timeframe to show filtering works
    const multiplier = timeframe === 'weekly' ? 0.1 : timeframe === 'monthly' ? 0.4 : 1

    const mockUsers = [
      {
        id: 'cassian',
        name: 'Cassian',
        handle: 'cassian.lens',
        avatar: 'https://ui-avatars.com/api/?name=Cassian&background=111&color=fff',
      },
      {
        id: 'sarah',
        name: 'Sarah Connor',
        handle: 'skynet_hunter',
        avatar: 'https://ui-avatars.com/api/?name=Sarah+Connor&background=e11d48&color=fff',
      },
      {
        id: 'neo',
        name: 'Neo',
        handle: 'the_one',
        avatar: 'https://ui-avatars.com/api/?name=Neo&background=000&color=fff',
      },
      {
        id: 'trinity',
        name: 'Trinity',
        handle: 'matrix_hacker',
        avatar: 'https://ui-avatars.com/api/?name=Trinity&background=0f172a&color=fff',
      },
      {
        id: 'morpheus',
        name: 'Morpheus',
        handle: 'dream_king',
        avatar: 'https://ui-avatars.com/api/?name=Morpheus&background=4f46e5&color=fff',
      },
    ]

    // Create a larger list of 100 items to support pagination
    const fullList: LeaderboardEntry[] = Array.from({ length: 100 }).map((_, i) => {
      const user = mockUsers[i % mockUsers.length]
      const baseXP = 15000 - i * 150
      const adjustedXP = Math.floor(Math.max(0, baseXP) * multiplier)

      return {
        rank: i + 1,
        lenserId: i < mockUsers.length ? user.id : `user-${i}`,
        displayName: i < mockUsers.length ? user.name : `Lenser ${i + 1}`,
        handle: i < mockUsers.length ? user.handle : `user_${i + 1}`,
        avatarUrl: i < mockUsers.length ? user.avatar : undefined,
        totalXp: adjustedXP,
        level: Math.floor(Math.sqrt(adjustedXP / 100)) + 1,
        streak: Math.floor(Math.random() * 20),
        trend: Math.random() > 0.7 ? 'up' : Math.random() > 0.8 ? 'down' : 'same',
      }
    })

    const paginatedList = fullList.slice(offset, offset + limit)

    // Simulate "Me" being somewhere
    const myData = this.getData()
    const myEntry: LeaderboardEntry = {
      rank: 42,
      lenserId: 'user-1', // Match MockAuth
      displayName: 'Demo User',
      handle: 'demo_user',
      totalXp: Math.floor(myData.totalXp * multiplier),
      level: myData.currentLevel,
      streak: 5,
      trend: 'up',
    }

    return { list: paginatedList, userEntry: myEntry }
  }
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
