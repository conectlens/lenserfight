import {
  Language,
  Lenser,
  CreateLenserDTO,
  AuthProfileGate,
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
  LenserType,
  LenserListItem,
  ProfileAccessPayload,
  PendingFollowRequest,
} from '@lenserfight/types'
import { LensRecord } from '@lenserfight/types'
import { ThreadRecord } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'
import { ApiResponseEnvelope, paginatedResponse } from '@lenserfight/api/contracts'
import type { HandleValidationResult } from '@lenserfight/domain/identity-governance'

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
  ): Promise<LensRecord[]>
  getThreadsByLenser(
    lenserId: string,
    offset?: number,
    limit?: number,
    viewerId?: string
  ): Promise<ThreadRecord[]>
  getActivityTimeline(handle: string): Promise<LenserActivityPoint[]>

  getPublicLenserProfile(handle: string): Promise<LenserProfileDTO>
  checkHandle(handle: string): Promise<HandleValidationResult>
  getActiveLenser(): Promise<Lenser | null>
  getAuthenticatedLenser(): Promise<Lenser | null>
  getAuthenticatedProfileGate(): Promise<AuthProfileGate>

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

  // Lensers discovery
  listLensers(options: { type?: LenserType; limit?: number; offset?: number }): Promise<LenserListItem[]>

  // Social graph: Profile access
  getProfile(handle: string): Promise<ProfileAccessPayload>

  // Social graph: Follow requests
  requestFollow(targetId: string): Promise<{ status: string; reason?: string }>
  removeFollow(targetId: string): Promise<LenserFollowStatus>
  acceptFollowRequest(sourceId: string): Promise<{ success: boolean; reason?: string }>
  rejectFollowRequest(sourceId: string): Promise<{ success: boolean; reason?: string }>
  getPendingRequests(limit?: number, offset?: number): Promise<PendingFollowRequest[]>

  // Social graph: Block
  blockProfile(targetId: string): Promise<{ blocked: boolean }>
  unblockProfile(targetId: string): Promise<{ blocked: boolean }>

  // Account lifecycle
  deactivateAccount(): Promise<{ success: boolean }>
  scheduleAccountDeletion(): Promise<{ success: boolean; deadline?: string }>
  cancelDeletionOnLogin(): Promise<{ restored: boolean; from_status?: string }>

  // Battle invite search
  searchLensers(query: string, limit?: number): Promise<LenserSearchResult[]>
}

export interface LenserSearchResult {
  id: string
  handle: string
  display_name: string
  avatar_url: string | null
  type?: 'human' | 'ai'
}

type AuthProfileGateRow = Pick<Lenser, 'status' | 'deletion_requested_at' | 'onboarding_step'> & {
  deletion_deadline_at?: string | null
}

export const mapProfileToAuthProfileGate = (
  profile: AuthProfileGateRow | null | undefined
): AuthProfileGate => {
  if (!profile) {
    return { kind: 'new' }
  }

  if (profile.status === 'deleted') {
    return {
      kind: 'deleted',
      status: profile.status,
      deletionDeadlineAt: profile.deletion_deadline_at ?? null,
    }
  }

  // A profile that is "active" but still carries deletion flags is in a stale
  // recoverable state until login cleanup clears those flags.
  if (profile.deletion_requested_at) {
    return {
      kind: 'recoverable',
      status: profile.status,
      deletionDeadlineAt: profile.deletion_deadline_at ?? null,
    }
  }

  if (profile.status === 'active' && !profile.deletion_requested_at) {
    const onboardingStep = profile.onboarding_step ?? 0
    if (onboardingStep < 2) {
      return { kind: 'onboarding', status: 'active', onboardingStep }
    }

    return { kind: 'active', status: 'active' }
  }

  if (profile.status === 'pending_deletion' || profile.status === 'deactivated') {
    return {
      kind: 'recoverable',
      status: profile.status,
      deletionDeadlineAt: profile.deletion_deadline_at ?? null,
    }
  }

  return { kind: 'deleted', status: profile.status, deletionDeadlineAt: profile.deletion_deadline_at ?? null }
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
    return this.getActiveLenser()
  }

  async checkHandle(handle: string): Promise<HandleValidationResult> {
    const { data, error } = await supabase.rpc('fn_check_handle', {
      p_handle: handle,
    })

    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      return {
        verdict: 'deny',
        class_hit: null,
        risk_score: 100,
        reason_codes: ['rpc_empty_result'],
        is_available: false,
      }
    }

    return {
      verdict: row.verdict,
      class_hit: row.class_hit ?? null,
      risk_score: row.risk_score ?? 0,
      reason_codes: row.reason_codes ?? [],
      is_available: row.is_available ?? row.verdict === 'allow',
    }
  }

  async getActiveLenser(): Promise<Lenser | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return null

    const { data, error } = await supabase.rpc('fn_lensers_get_active_profile')

    if (error || !data) return null

    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as Lenser | null
  }

  async getAuthenticatedProfileGate(): Promise<AuthProfileGate> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { kind: 'new' }

    const { data, error } = await supabase.rpc('fn_get_auth_profile_gate')

    if (error) throw error
    return mapProfileToAuthProfileGate((data?.[0] as AuthProfileGateRow | null) ?? null)
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
    if (data.preferred_language !== undefined) updatePayload.preferred_language = data.preferred_language
    if (data.onboarding_step !== undefined) updatePayload.onboarding_step = data.onboarding_step
    if (data.onboarding_completed_at !== undefined) updatePayload.onboarding_completed_at = data.onboarding_completed_at
    if (data.visibility !== undefined) updatePayload.visibility = data.visibility

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
    const { data, error } = await supabase.rpc('fn_get_lenser_profile_brief', {
      p_handle: null,
      p_lenser_id: null,
    })
    if (error) throw error
    return ((data ?? []) as Lenser[]).slice(0, limit)
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
  ): Promise<LensRecord[]> {
    const query = supabase
      .from('vw_lenses_public')
      .select('*') // Reads denormalized profile/tags directly
      .eq('handle', handle)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await query
    if (error) throw error
    return data as LensRecord[]
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

  async getActivityTimeline(handle: string): Promise<LenserActivityPoint[]> {
    const { data, error } = await supabase.rpc('fn_get_lenser_activity_timeline', {
      p_handle: handle,
    })
    if (error) throw error
    return ((data ?? []) as Array<{ date: string; count: number }>).map((row) => ({
      date: row.date,
      count: Number(row.count),
    }))
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
    const { data, error } = await supabase.rpc('fn_get_lenser_profile_brief', {
      p_handle: null,
      p_lenser_id: id,
    })
    if (error) return null
    return (data?.[0] ?? null) as Lenser | null
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

  async listLensers({ type, limit = 20, offset = 0 }: { type?: LenserType; limit?: number; offset?: number } = {}): Promise<LenserListItem[]> {
    const { data, error } = await supabase.rpc('fn_lensers_list', {
      p_type: type ?? null,
      p_limit: limit,
      p_offset: offset,
    })
    if (error) throw error
    return (data ?? []) as LenserListItem[]
  }

  // ── Social Graph: Profile Access ────────────────────────────────────────────

  async getProfile(handle: string): Promise<ProfileAccessPayload> {
    const { data, error } = await supabase.rpc('fn_lensers_get_profile', {
      p_handle: handle,
    })
    if (error) throw error
    if (!data) {
      return {
        route_state: 'UNAVAILABLE_PROFILE',
        access_reason: 'not_found',
        relationship_state: null,
        profile: null,
      }
    }
    return data as ProfileAccessPayload
  }

  // ── Social Graph: Follow Requests ───────────────────────────────────────────

  async requestFollow(targetId: string): Promise<{ status: string; reason?: string }> {
    const { data, error } = await supabase.rpc('fn_request_follow', {
      p_target_profile_id: targetId,
    })
    if (error) throw error
    return data as { status: string; reason?: string }
  }

  async removeFollow(targetId: string): Promise<LenserFollowStatus> {
    const { data, error } = await supabase.rpc('fn_remove_follow', {
      p_target_profile_id: targetId,
    })
    if (error) throw error
    return data as LenserFollowStatus
  }

  async acceptFollowRequest(sourceId: string): Promise<{ success: boolean; reason?: string }> {
    const { data, error } = await supabase.rpc('fn_accept_follow_request', {
      p_source_profile_id: sourceId,
    })
    if (error) throw error
    return data as { success: boolean; reason?: string }
  }

  async rejectFollowRequest(sourceId: string): Promise<{ success: boolean; reason?: string }> {
    const { data, error } = await supabase.rpc('fn_reject_follow_request', {
      p_source_profile_id: sourceId,
    })
    if (error) throw error
    return data as { success: boolean; reason?: string }
  }

  async getPendingRequests(limit = 20, offset = 0): Promise<PendingFollowRequest[]> {
    const { data, error } = await supabase.rpc('fn_get_pending_requests', {
      p_limit: limit,
      p_offset: offset,
    })
    if (error) throw error
    return (data ?? []) as PendingFollowRequest[]
  }

  // ── Social Graph: Block ─────────────────────────────────────────────────────

  async blockProfile(targetId: string): Promise<{ blocked: boolean }> {
    const { data, error } = await supabase.rpc('fn_block_profile', {
      p_target_profile_id: targetId,
    })
    if (error) throw error
    return data as { blocked: boolean }
  }

  async unblockProfile(targetId: string): Promise<{ blocked: boolean }> {
    const { data, error } = await supabase.rpc('fn_unblock_profile', {
      p_target_profile_id: targetId,
    })
    if (error) throw error
    return data as { blocked: boolean }
  }

  // ── Account Lifecycle ───────────────────────────────────────────────────────

  async deactivateAccount(): Promise<{ success: boolean }> {
    const { data, error } = await supabase.rpc('fn_deactivate_account')
    if (error) throw error
    return data as { success: boolean }
  }

  async scheduleAccountDeletion(): Promise<{ success: boolean; deadline?: string }> {
    const { data, error } = await supabase.rpc('fn_schedule_account_deletion')
    if (error) throw error
    return data as { success: boolean; deadline?: string }
  }

  async cancelDeletionOnLogin(): Promise<{ restored: boolean; from_status?: string }> {
    const { data, error } = await supabase.rpc('fn_cancel_account_deletion_on_login')
    if (error) throw error
    return data as { restored: boolean; from_status?: string }
  }

  async searchLensers(query: string, limit = 8): Promise<LenserSearchResult[]> {
    const { data, error } = await supabase.rpc('fn_search_lensers', {
      p_query: query,
      p_limit: limit,
    })
    if (error) throw error
    return (data ?? []) as LenserSearchResult[]
  }
}
