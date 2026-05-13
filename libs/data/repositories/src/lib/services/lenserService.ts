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

import { createLenserRepository, createShareRepository } from '../factory'


const lenserRepo = createLenserRepository()
const shareRepo = createShareRepository()

const enrichLenserProfile = async (lenser: Lenser | null): Promise<Lenser | null> => {
  if (!lenser || !lenser.website_url) return lenser

  const appDomain = window.location.host
  if (lenser.website_url.includes(appDomain) && lenser.website_url.includes('/s/')) {
    try {
      const parts = lenser.website_url.split('/s/')
      const shortId = parts[1]
      if (shortId) {
        const result = await shareRepo.resolveLink(shortId)
        if (result && result.link.display_name) {
          return { ...lenser, website_display_name: result.link.display_name }
        }
      }
    } catch (e) {
      console.warn('Failed to resolve profile website link metadata', e)
    }
  }
  return lenser
}

export const lenserService = {
  getActiveLenser: async (): Promise<Lenser | null> => {
    const lenser = await lenserRepo.getActiveLenser()
    return enrichLenserProfile(lenser)
  },

  getAuthenticatedLenser: async (): Promise<Lenser | null> => {
    return lenserService.getActiveLenser()
  },

  getAuthenticatedProfileGate: async (): Promise<AuthProfileGate> => {
    return lenserRepo.getAuthenticatedProfileGate()
  },

  getPublicLenserProfile: async (handle: string): Promise<LenserProfileDTO> => {
    return await lenserRepo.getPublicLenserProfile(handle)
  },

  getLenserByHandle: async (handle: string): Promise<LenserProfileDTO | null> => {
    return await lenserRepo.getPublicLenserProfile(handle)
  },

  createLenserProfile: async (data: CreateLenserDTO): Promise<Lenser> => {
    if (!data) throw new Error('Data is required')

    // Moderation Check
    // TODO: moderation policy will not be used in the beta version
    // await contentModerationService.validate(data.handle, data.display_name, data.bio);

    return lenserRepo.createLenser(data)
  },

  updateLenserProfile: async (data: Partial<Lenser>): Promise<Lenser> => {
    if (!data) throw new Error('Lenser handle is required')

    if (data.website_url) {
      const url = data.website_url.trim()
      data.website_url = url && !/^https?:\/\//i.test(url) ? `https://${url}` : url || undefined
    }

    const updated = await lenserRepo.updateLenser(data)
    return enrichLenserProfile(updated) as Promise<Lenser>
  },

  requestAccountDeletion: async (handle: string): Promise<void> => {
    if (!handle) throw new Error('Handle is required')
    await lenserRepo.requestDeletion(handle)
  },

  getLenserPrompts: async (
    lenserId: string,
    offset = 0,
    limit = 10,
    viewerId?: string
  ): Promise<LensRecord[]> => {
    return lenserRepo.getPromptsByLenser(lenserId, offset, limit, viewerId)
  },

  getLenserThreads: async (
    lenserId: string,
    offset = 0,
    limit = 10,
    viewerId?: string
  ): Promise<ThreadRecord[]> => {
    return lenserRepo.getThreadsByLenser(lenserId, offset, limit, viewerId)
  },

  getLenserActivity: async (lenserId: string): Promise<LenserActivityPoint[]> => {
    return lenserRepo.getActivityTimeline(lenserId)
  },

  getRecentlyActiveLensers: async (limit: number = 5): Promise<Lenser[]> => {
    return lenserRepo.getRecentlyActive(limit)
  },

  getLatestJoinedLensers: async (): Promise<Lenser[]> => {
    return lenserRepo.getLatestJoined()
  },

  getLenserActions: async (lenserId: string): Promise<ActionRecord[]> => {
    return lenserRepo.getLenserActions(lenserId)
  },

  getLenserNetwork: async (
    lenserId: string,
    type: 'followers' | 'following',
    page: number
  ): Promise<NetworkUser[]> => {
    return lenserRepo.getLenserNetwork(lenserId, type, page)
  },

  getLanguages: async (): Promise<Language[]> => {
    return lenserRepo.getLanguages()
  },

  getTrendingLensers: async (limit = 10): Promise<TrendingLenser[]> => {
    return lenserRepo.getTrendingLensers(limit)
  },

  // ── Phase 3: Follow graph ─────────────────────────────────────────────────

  followLenser: async (followingId: string): Promise<LenserFollowStatus> => {
    return lenserRepo.followLenser(followingId)
  },

  unfollowLenser: async (followingId: string): Promise<LenserFollowStatus> => {
    return lenserRepo.unfollowLenser(followingId)
  },

  isFollowing: async (targetId: string): Promise<boolean> => {
    return lenserRepo.isFollowing(targetId)
  },

  getLenserFollows: async (
    lenserId: string,
    type: 'followers' | 'following',
    offset = 0,
    limit = 20
  ) => {
    return lenserRepo.getLenserFollows(lenserId, type, offset, limit)
  },

  getSuggestedLensers: async (lenserId: string, limit = 10): Promise<SuggestedLenser[]> => {
    return lenserRepo.getSuggestedLensers(lenserId, limit)
  },

  // ── Phase 4: Leaderboard ──────────────────────────────────────────────────

  getLeaderboard: async (period: FollowPeriod = 'all_time', limit = 20): Promise<LeaderboardLenser[]> => {
    return lenserRepo.getLeaderboard(period, limit)
  },

  // ── Lensers discovery ─────────────────────────────────────────────────────

  listLensers: async (options: { type?: LenserType; limit?: number; offset?: number } = {}): Promise<LenserListItem[]> => {
    return lenserRepo.listLensers(options)
  },

  // ── Social Graph: Profile Access ────────────────────────────────────────

  getProfile: async (handle: string): Promise<ProfileAccessPayload> => {
    return lenserRepo.getProfile(handle)
  },

  // ── Social Graph: Follow Requests ───────────────────────────────────────

  requestFollow: async (targetId: string): Promise<{ status: string; reason?: string }> => {
    return lenserRepo.requestFollow(targetId)
  },

  removeFollow: async (targetId: string): Promise<LenserFollowStatus> => {
    return lenserRepo.removeFollow(targetId)
  },

  acceptFollowRequest: async (sourceId: string): Promise<{ success: boolean; reason?: string }> => {
    return lenserRepo.acceptFollowRequest(sourceId)
  },

  rejectFollowRequest: async (sourceId: string): Promise<{ success: boolean; reason?: string }> => {
    return lenserRepo.rejectFollowRequest(sourceId)
  },

  getPendingRequests: async (limit = 20, offset = 0): Promise<PendingFollowRequest[]> => {
    return lenserRepo.getPendingRequests(limit, offset)
  },

  // ── Social Graph: Block ─────────────────────────────────────────────────

  blockProfile: async (targetId: string): Promise<{ blocked: boolean }> => {
    return lenserRepo.blockProfile(targetId)
  },

  unblockProfile: async (targetId: string): Promise<{ blocked: boolean }> => {
    return lenserRepo.unblockProfile(targetId)
  },

  // ── Account Lifecycle ───────────────────────────────────────────────────

  deactivateAccount: async (): Promise<{ success: boolean }> => {
    return lenserRepo.deactivateAccount()
  },

  scheduleAccountDeletion: async (): Promise<{ success: boolean; deadline?: string }> => {
    return lenserRepo.scheduleAccountDeletion()
  },

  cancelDeletionOnLogin: async (): Promise<{ restored: boolean; from_status?: string }> => {
    return lenserRepo.cancelDeletionOnLogin()
  },

  searchLensers: (query: string, limit?: number) =>
    lenserRepo.searchLensers(query, limit),
}
