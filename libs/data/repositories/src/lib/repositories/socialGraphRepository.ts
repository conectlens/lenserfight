import { supabase } from '@lenserfight/data/supabase'

export type FollowStatus = 'none' | 'pending' | 'following'

export interface SocialFollowRecord {
  lenser_id: string
  handle: string
  display_name: string
  avatar_url: string | null
  is_following: boolean
}

export interface SocialGraphRepositoryPort {
  follow(targetProfileId: string): Promise<void>
  unfollow(targetProfileId: string): Promise<void>
  acceptRequest(sourceProfileId: string): Promise<void>
  getFollowStatus(targetProfileId: string): Promise<FollowStatus>
  listFollowers(lenserId: string, limit?: number, offset?: number): Promise<SocialFollowRecord[]>
  listFollowing(lenserId: string, limit?: number, offset?: number): Promise<SocialFollowRecord[]>
}

export class SupabaseSocialGraphRepository implements SocialGraphRepositoryPort {
  async follow(targetProfileId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_request_follow', {
      p_target_profile_id: targetProfileId,
    })
    if (error) throw error
  }

  async unfollow(targetProfileId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_remove_follow', {
      p_target_profile_id: targetProfileId,
    })
    if (error) throw error
  }

  async acceptRequest(sourceProfileId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_accept_follow_request', {
      p_source_profile_id: sourceProfileId,
    })
    if (error) throw error
  }

  async getFollowStatus(targetProfileId: string): Promise<FollowStatus> {
    const { data, error } = await supabase.rpc('fn_get_follow_status', {
      p_target_profile_id: targetProfileId,
    })
    if (error) throw error
    return (data as FollowStatus) ?? 'none'
  }

  async listFollowers(lenserId: string, limit = 20, offset = 0): Promise<SocialFollowRecord[]> {
    const { data, error } = await supabase.rpc('fn_lensers_get_follows', {
      p_lenser_id: lenserId,
      p_type:      'followers',
      p_limit:     limit,
      p_offset:    offset,
    })
    if (error) throw error
    return (data ?? []) as SocialFollowRecord[]
  }

  async listFollowing(lenserId: string, limit = 20, offset = 0): Promise<SocialFollowRecord[]> {
    const { data, error } = await supabase.rpc('fn_lensers_get_follows', {
      p_lenser_id: lenserId,
      p_type:      'following',
      p_limit:     limit,
      p_offset:    offset,
    })
    if (error) throw error
    return (data ?? []) as SocialFollowRecord[]
  }
}

export const socialGraphRepository = new SupabaseSocialGraphRepository()
