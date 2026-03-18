import {
  Language,
  Lenser,
  CreateLenserDTO,
  LenserActivityPoint,
  ActionRecord,
  NetworkUser,
  LenserProfileDTO,
  TrendingLenser,
  SuggestedLenser,
  LeaderboardLenser,
  LenserFollowStatus,
  FollowsNetworkUser,
  FollowPeriod,
} from '@lenserfight/types'
import { PromptTemplateRecord } from '@lenserfight/types'
import { ThreadRecord } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'
import { ApiResponseEnvelope, paginatedResponse } from 'contracts'

// --- Port (Interface) ---
export interface LenserRepositoryPort {
  createLenser(data: CreateLenserDTO): Promise<Lenser>
  updateLenser(data: Partial<Lenser>): Promise<Lenser>
  requestDeletion(handle: string): Promise<void>
  getRecentlyActive(limit: number): Promise<Lenser[]>
  getLatestJoined(): Promise<Lenser[]>

  getPromptsByLenser(
    lenserId: string,
    offset?: number,
    limit?: number,
    viewerId?: string
  ): Promise<PromptTemplateRecord[]>
  getThreadsByLenser(
    lenserId: string,
    offset?: number,
    limit?: number,
    viewerId?: string
  ): Promise<ThreadRecord[]>
  getActivityTimeline(lenserId: string): Promise<LenserActivityPoint[]>

  getPublicLenserProfile(handle: string): Promise<LenserProfileDTO>
  getAuthenticatedLenser(): Promise<Lenser | null>

  // Existing features
  getLenserActions(lenserId: string): Promise<ActionRecord[]>
  getLenserNetwork(
    lenserId: string,
    type: 'followers' | 'following',
    page: number
  ): Promise<NetworkUser[]>
  getLenserById(id: string): Promise<Lenser | null>
  getLanguages(): Promise<Language[]>
  getTrendingLensers(limit?: number): Promise<TrendingLenser[]>

  // Phase 3: Follow graph
  followLenser(followingId: string): Promise<LenserFollowStatus>
  unfollowLenser(followingId: string): Promise<LenserFollowStatus>
  isFollowing(targetId: string): Promise<boolean>
  getLenserFollows(
    lenserId: string,
    type: 'followers' | 'following',
    offset?: number,
    limit?: number
  ): Promise<ApiResponseEnvelope<FollowsNetworkUser[]>>
  getSuggestedLensers(lenserId: string, limit?: number): Promise<SuggestedLenser[]>

  // Phase 4: Leaderboard
  getLeaderboard(period: FollowPeriod, limit?: number): Promise<LeaderboardLenser[]>
}
export class SupabaseLenserRepository implements LenserRepositoryPort {
  async getPublicLenserProfile(handle: string): Promise<LenserProfileDTO> {
    const { data, error } = await supabase.rpc('fn_lensers_get_public_profile', {
      p_handle: handle,
    })

    if (error) throw error
    if (!data) return null as any;

    return {
      id: data.id,
      handle: data.handle,
      display_name: data.display_name,
      avatar_url: data.avatar_url,
      headline: data.headline,
      join_order: data.join_order,
      total_xp: data.total_xp,
      current_level: data.current_level,
      badges: data.badges,
      created_at: data.created_at ?? '',
    }
  }

  async getAuthenticatedLenser(): Promise<Lenser | null> {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return null

    const { data, error } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .is('deletion_requested_at', null)
      .maybeSingle()

    if (error || !data) return null
    return data as Lenser
  }

  async createLenser(data: CreateLenserDTO): Promise<Lenser> {
    const { data: newLenser, error } = await supabase.rpc('fn_lensers_create_profile', {
      p_handle: data.handle,
      p_display_name: data.display_name,
      p_bio: data.bio || '',
    })

    if (error) throw error
    return newLenser as Lenser
  }

  async updateLenser(data: Partial<Lenser>): Promise<Lenser> {
    const updatePayload: Record<string, unknown> = {}
    if (data.display_name !== undefined) updatePayload.display_name = data.display_name
    if (data.avatar_url !== undefined) updatePayload.avatar_url = data.avatar_url
    if (data.banner_url !== undefined) updatePayload.banner_url = data.banner_url
    if (data.bio !== undefined) updatePayload.bio = data.bio
    if (data.headline !== undefined) updatePayload.headline = data.headline
    if (data.preferences !== undefined) updatePayload.preferences = data.preferences
    if (data.preferred_language !== undefined) updatePayload.preferred_language = data.preferred_language
    if (data.onboarding_step !== undefined) updatePayload.onboarding_step = data.onboarding_step
    if (data.onboarding_completed_at !== undefined) updatePayload.onboarding_completed_at = data.onboarding_completed_at

    const { data: updated, error } = await supabase.rpc('fn_lensers_update_profile', {
      p_data: updatePayload,
    })

    if (error) throw error
    return updated as Lenser
  }

  async requestDeletion(): Promise<void> {
    const { error } = await supabase.rpc('fn_lensers_request_deletion')
    if (error) throw error
  }

  async getRecentlyActive(limit: number): Promise<Lenser[]> {
    const { data, error } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('*')
      .eq('status', 'active')
      .is('deletion_requested_at', null)
      .order('last_active_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data as Lenser[]
  }

  async getLatestJoined(): Promise<Lenser[]> {
    // Fetch directly from lensers table using the join_order column
    const { data, error } = await supabase.from('vw_lensers_public_recent').select('*')
    if (error) throw error
    return data as Lenser[]
  }

  async getPromptsByLenser(
    handle: string,
    offset = 0,
    limit = 10,
    _viewerId?: string
  ): Promise<PromptTemplateRecord[]> {
    const query = supabase
      .from('vw_prompt_templates_public')
      .select('*') // Reads denormalized profile/tags directly
      .eq('handle', handle)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await query
    if (error) throw error
    return data as PromptTemplateRecord[]
  }

  async getThreadsByLenser(
    lenserId: string,
    offset = 0,
    limit = 10,
    viewerId?: string
  ): Promise<ThreadRecord[]> {
    let query = supabase
      .from('threads')
      .select('*')
      .eq('lenser_id', lenserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (viewerId !== lenserId) {
      query = query.eq('visibility', 'public')
    }

    const { data, error } = await query
    if (error) throw error
    return data as ThreadRecord[]
  }

  async getActivityTimeline(_lenserId: string): Promise<LenserActivityPoint[]> {
    return []
  }
  async getLenserActions(_lenserId: string): Promise<ActionRecord[]> {
    return []
  }
  async getLenserNetwork(
    _lenserId: string,
    _type: 'followers' | 'following',
    _page: number
  ): Promise<NetworkUser[]> {
    return []
  }
  async getLenserById(id: string): Promise<Lenser | null> {
    const { data, error } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) return null
    return data as Lenser
  }

  async getLanguages(): Promise<Language[]> {
    const { data, error } = await supabase.rpc('fn_core_languages_list')
    if (error) throw error
    return (data as Language[]) ?? []
  }

  async getTrendingLensers(limit = 10): Promise<TrendingLenser[]> {
    const { data, error } = await supabase.rpc('fn_lensers_get_trending', {
      p_limit: limit,
    })
    if (error) throw error
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      lenserId: row.lenser_id as string,
      handle: row.handle as string,
      displayName: row.display_name as string,
      avatarUrl: (row.avatar_url as string | null) ?? null,
      totalXp: Number(row.total_xp ?? 0),
      currentLevel: row.current_level as number,
      lenserScore: row.lenser_score as number,
    }))
  }

  private mapLenserScoreRow(row: Record<string, unknown>): TrendingLenser {
    return {
      lenserId: row.lenser_id as string,
      handle: row.handle as string,
      displayName: row.display_name as string,
      avatarUrl: (row.avatar_url as string | null) ?? null,
      totalXp: Number(row.total_xp ?? 0),
      currentLevel: row.current_level as number,
      lenserScore: row.lenser_score as number,
    }
  }

  // ── Phase 3: Follow graph ──────────────────────────────────────────────────

  async followLenser(followingId: string): Promise<LenserFollowStatus> {
    const { data, error } = await supabase.rpc('fn_lensers_follow', {
      p_following_id: followingId,
    })
    if (error) throw error
    return data as LenserFollowStatus
  }

  async unfollowLenser(followingId: string): Promise<LenserFollowStatus> {
    const { data, error } = await supabase.rpc('fn_lensers_unfollow', {
      p_following_id: followingId,
    })
    if (error) throw error
    return data as LenserFollowStatus
  }

  async isFollowing(targetId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('fn_lensers_is_following', {
      p_target_id: targetId,
    })
    if (error) return false
    return Boolean(data)
  }

  async getLenserFollows(
    lenserId: string,
    type: 'followers' | 'following',
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<FollowsNetworkUser[]>> {
    const start = Date.now()
    const { data, error } = await supabase.rpc('fn_lensers_get_follows', {
      p_lenser_id: lenserId,
      p_type: type,
      p_limit: limit,
      p_offset: offset,
    })
    if (error) throw error
    const rows = (data ?? []) as Record<string, unknown>[]
    const items: FollowsNetworkUser[] = rows.map((row) => ({
      lenserId: row.lenser_id as string,
      handle: row.handle as string,
      displayName: row.display_name as string,
      avatarUrl: (row.avatar_url as string | null) ?? null,
      isFollowing: Boolean(row.is_following),
    }))
    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: rows.length >= limit },
      { durationMs: Date.now() - start },
    )
  }

  async getSuggestedLensers(lenserId: string, limit = 10): Promise<SuggestedLenser[]> {
    const { data, error } = await supabase.rpc('fn_lensers_get_suggested', {
      p_lenser_id: lenserId,
      p_limit: limit,
    })
    if (error) throw error
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      ...this.mapLenserScoreRow(row),
      tagOverlapScore: (row.tag_overlap_score as number) ?? 0,
    }))
  }

  // ── Phase 4: Leaderboard ───────────────────────────────────────────────────

  async getLeaderboard(period: FollowPeriod = 'all_time', limit = 20): Promise<LeaderboardLenser[]> {
    const { data, error } = await supabase.rpc('fn_lensers_get_leaderboard', {
      p_period: period,
      p_limit: limit,
    })
    if (error) throw error
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      ...this.mapLenserScoreRow(row),
      rank: row.rank as number,
    }))
  }
}
