import type {
  ActionRecord,
  AuthProfileGate,
  CreateLenserDTO,
  FollowPeriod,
  FollowsNetworkUser,
  Language,
  Lenser,
  LenserActivityPoint,
  LenserFollowStatus,
  LenserListItem,
  LenserProfileDTO,
  LenserType,
  NetworkUser,
  PendingFollowRequest,
  ProfileAccessPayload,
  SuggestedLenser,
  TrendingLenser,
  LeaderboardLenser,
} from '@lenserfight/types'
import type { LensRecord } from '@lenserfight/types'
import type { ThreadRecord } from '@lenserfight/types'
import type { ApiResponseEnvelope } from '@lenserfight/api/contracts'
import { paginatedResponse } from '@lenserfight/api/contracts'
import { FileDataStore } from '@lenserfight/infra/storage'
import { generateUUID } from '@lenserfight/utils/text'
import type { LenserRepositoryPort, LenserSearchResult } from '../lenserRepository'

const FILE_MODE_LENSER_ID = 'file-lenser-00000000-0000-0000-0000-000000000001'
const FILE_MODE_USER_ID = 'file-user-00000000-0000-0000-0000-000000000001'

const DEV_LENSER: Lenser = {
  id: FILE_MODE_LENSER_ID,
  user_id: FILE_MODE_USER_ID,
  handle: 'dev',
  display_name: 'Local Dev',
  bio: 'File-storage dev user. No Supabase required.',
  headline: 'Developing locally',
  avatar_url: null,
  banner_url: null,
  type: 'human',
  status: 'active',
  visibility: 'public',
  onboarding_step: 2,
  onboarding_completed_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const COMMON_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native_name: 'English', direction: 'ltr', is_active: true },
  { code: 'tr', name: 'Turkish', native_name: 'Türkçe', direction: 'ltr', is_active: true },
  { code: 'de', name: 'German', native_name: 'Deutsch', direction: 'ltr', is_active: true },
  { code: 'fr', name: 'French', native_name: 'Français', direction: 'ltr', is_active: true },
  { code: 'es', name: 'Spanish', native_name: 'Español', direction: 'ltr', is_active: true },
  { code: 'ar', name: 'Arabic', native_name: 'العربية', direction: 'rtl', is_active: true },
]

interface FollowEdge {
  id: string
  follower_id: string
  following_id: string
  created_at: string
  status: 'active' | 'pending' | 'rejected'
}

const profileStore = new FileDataStore<Lenser>('lensers_profiles')
const followStore = new FileDataStore<FollowEdge>('lensers_follows')

async function seedDevLenser(): Promise<void> {
  const existing = await profileStore.findById(FILE_MODE_LENSER_ID)
  if (!existing) {
    await profileStore.save(DEV_LENSER)
  }
}

export class FileLenserRepository implements LenserRepositoryPort {
  async getActiveLenser(): Promise<Lenser | null> {
    await seedDevLenser()
    return profileStore.findById(FILE_MODE_LENSER_ID) as Promise<Lenser>
  }

  async getAuthenticatedLenser(): Promise<Lenser | null> {
    return this.getActiveLenser()
  }

  async getAuthenticatedProfileGate(): Promise<AuthProfileGate> {
    return { kind: 'active', status: 'active' }
  }

  async cancelDeletionOnLogin(): Promise<{ restored: boolean; from_status?: string }> {
    return { restored: false }
  }

  async createLenser(data: CreateLenserDTO): Promise<Lenser> {
    const lenser: Lenser = {
      ...DEV_LENSER,
      id: generateUUID(),
      handle: data.handle,
      display_name: data.display_name,
      bio: data.bio ?? undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await profileStore.save(lenser)
    return lenser
  }

  async updateLenser(data: Partial<Lenser>): Promise<Lenser> {
    await seedDevLenser()
    const existing = (await profileStore.findById(FILE_MODE_LENSER_ID))!
    const updated: Lenser = { ...existing, ...data, updated_at: new Date().toISOString() }
    await profileStore.save(updated)
    return updated
  }

  async requestDeletion(_handle?: string): Promise<void> {
    // No-op in file mode.
  }

  async getLenserById(id: string): Promise<Lenser | null> {
    return (await profileStore.findById(id)) ?? null
  }

  async checkHandle(handle: string) {
    const clean = (handle ?? '').toLowerCase()
    const isShort = clean.length < 4
    return {
      verdict: isShort ? ('deny' as const) : ('allow' as const),
      class_hit: null,
      risk_score: isShort ? 100 : 0,
      reason_codes: isShort ? ['syntax_too_short'] : [],
      is_available: !isShort,
    }
  }

  async getPublicLenserProfile(handle: string): Promise<LenserProfileDTO> {
    const profiles = await profileStore.findWhere((p) => p.handle === handle)
    const p = profiles[0]
    if (!p) return null as any
    return {
      id: p.id,
      handle: p.handle,
      display_name: p.display_name,
      avatar_url: p.avatar_url ?? null,
      headline: p.headline ?? undefined,
      join_order: p.join_order ?? 1,
      total_xp: '0',
      current_level: 1,
      created_at: p.created_at,
    }
  }

  async getProfile(handle: string): Promise<ProfileAccessPayload> {
    const profiles = await profileStore.findWhere((p) => p.handle === handle)
    const profile = profiles[0] ?? null
    if (!profile) {
      return { route_state: 'UNAVAILABLE_PROFILE', access_reason: 'not_found', relationship_state: null, profile: null }
    }
    return {
      route_state: 'FULL_PROFILE',
      access_reason: 'file_mode',
      relationship_state: null,
      profile: profile as any,
    }
  }

  async getRecentlyActive(limit: number): Promise<Lenser[]> {
    const all = await profileStore.findAll()
    return all.slice(0, limit)
  }

  async getLatestJoined(): Promise<Lenser[]> {
    return profileStore.findAll()
  }

  async listLensers({ type, limit = 20, offset = 0 }: { type?: LenserType; limit?: number; offset?: number } = {}): Promise<LenserListItem[]> {
    let all = await profileStore.findAll()
    if (type) all = all.filter((p) => p.type === type)
    return all.slice(offset, offset + limit).map((p) => ({
      id: p.id,
      handle: p.handle,
      display_name: p.display_name,
      avatar_url: p.avatar_url ?? null,
      type: p.type ?? 'human',
    } as LenserListItem))
  }

  async getPromptsByLenser(_lenserId: string, _offset?: number, _limit?: number, _viewerId?: string): Promise<LensRecord[]> {
    return []
  }

  async getThreadsByLenser(_lenserId: string, _offset?: number, _limit?: number, _viewerId?: string): Promise<ThreadRecord[]> {
    return []
  }

  async getActivityTimeline(_handle: string): Promise<LenserActivityPoint[]> {
    return []
  }

  async getLenserActions(_lenserId: string): Promise<ActionRecord[]> {
    return []
  }

  async getLenserNetwork(_lenserId: string, _type: 'followers' | 'following', _page: number): Promise<NetworkUser[]> {
    return []
  }

  async getLanguages(): Promise<Language[]> {
    return COMMON_LANGUAGES
  }

  async getTrendingLensers(_limit = 10): Promise<TrendingLenser[]> {
    return []
  }

  async getSuggestedLensers(_lenserId: string, _limit = 10): Promise<SuggestedLenser[]> {
    return []
  }

  async getLeaderboard(_period: FollowPeriod = 'all_time', _limit = 20): Promise<LeaderboardLenser[]> {
    return []
  }

  // ── Follow graph ─────────────────────────────────────────────────────────────

  async followLenser(followingId: string): Promise<LenserFollowStatus> {
    const existing = await followStore.findWhere(
      (e) => e.follower_id === FILE_MODE_LENSER_ID && e.following_id === followingId
    )
    if (existing.length === 0) {
      await followStore.save({
        id: generateUUID(),
        follower_id: FILE_MODE_LENSER_ID,
        following_id: followingId,
        created_at: new Date().toISOString(),
        status: 'active',
      })
    }
    return { following: true }
  }

  async unfollowLenser(followingId: string): Promise<LenserFollowStatus> {
    const edges = await followStore.findWhere(
      (e) => e.follower_id === FILE_MODE_LENSER_ID && e.following_id === followingId
    )
    for (const e of edges) await followStore.remove(e.id)
    return { following: false }
  }

  async isFollowing(targetId: string): Promise<boolean> {
    const edges = await followStore.findWhere(
      (e) => e.follower_id === FILE_MODE_LENSER_ID && e.following_id === targetId && e.status === 'active'
    )
    return edges.length > 0
  }

  async getLenserFollows(
    lenserId: string,
    type: 'followers' | 'following',
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<FollowsNetworkUser[]>> {
    const start = Date.now()
    const edges = await followStore.findWhere((e) =>
      type === 'following' ? e.follower_id === lenserId : e.following_id === lenserId
    )
    const items: FollowsNetworkUser[] = edges.slice(offset, offset + limit).map((e) => ({
      lenserId: type === 'following' ? e.following_id : e.follower_id,
      handle: 'unknown',
      displayName: 'Unknown',
      avatarUrl: null,
      isFollowing: false,
    }))
    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: edges.length > offset + limit },
      { durationMs: Date.now() - start }
    )
  }

  async requestFollow(targetId: string): Promise<{ status: string; reason?: string }> {
    await this.followLenser(targetId)
    return { status: 'followed' }
  }

  async removeFollow(targetId: string): Promise<LenserFollowStatus> {
    return this.unfollowLenser(targetId)
  }

  async acceptFollowRequest(_sourceId: string): Promise<{ success: boolean; reason?: string }> {
    return { success: true }
  }

  async rejectFollowRequest(_sourceId: string): Promise<{ success: boolean; reason?: string }> {
    return { success: true }
  }

  async getPendingRequests(_limit = 20, _offset = 0): Promise<PendingFollowRequest[]> {
    return []
  }

  async blockProfile(_targetId: string): Promise<{ blocked: boolean }> {
    return { blocked: true }
  }

  async unblockProfile(_targetId: string): Promise<{ blocked: boolean }> {
    return { blocked: false }
  }

  async deactivateAccount(): Promise<{ success: boolean }> {
    return { success: true }
  }

  async scheduleAccountDeletion(): Promise<{ success: boolean; deadline?: string }> {
    return { success: true }
  }

  async searchLensers(query: string, limit = 8): Promise<LenserSearchResult[]> {
    const all = await profileStore.findAll()
    const q = query.toLowerCase()
    return all
      .filter((p) => p.handle.includes(q) || p.display_name.toLowerCase().includes(q))
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        handle: p.handle,
        display_name: p.display_name,
        avatar_url: p.avatar_url ?? null,
        type: (p as { type?: 'human' | 'ai' }).type ?? 'human',
      }))
  }
}
