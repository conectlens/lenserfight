import { supabase } from '@lenserfight/data/supabase'
import { TagFollowRecord, ContentReportDTO } from '@lenserfight/types'

export interface TagFollowsRepositoryPort {
  followTag(tagId: string): Promise<{ following: boolean }>
  unfollowTag(tagId: string): Promise<{ following: boolean }>
  getFollowedTags(lenserId: string, limit?: number): Promise<TagFollowRecord[]>
  reportContent(dto: ContentReportDTO): Promise<{ reported: boolean }>
}

export class SupabaseTagFollowsRepository implements TagFollowsRepositoryPort {
  async followTag(tagId: string): Promise<{ following: boolean }> {
    const { data, error } = await supabase.rpc('fn_content_follow_tag', {
      p_tag_id: tagId,
    })
    if (error) throw error
    return data as { following: boolean }
  }

  async unfollowTag(tagId: string): Promise<{ following: boolean }> {
    const { data, error } = await supabase.rpc('fn_content_unfollow_tag', {
      p_tag_id: tagId,
    })
    if (error) throw error
    return data as { following: boolean }
  }

  async getFollowedTags(lenserId: string, limit = 50): Promise<TagFollowRecord[]> {
    const { data, error } = await supabase.rpc('fn_content_get_followed_tags', {
      p_lenser_id: lenserId,
    })
    if (error) throw error
    return ((data ?? []) as Record<string, unknown>[])
      .slice(0, limit) // TS-layer cap; replace with RPC p_limit param when migration lands
      .map((row) => ({
        tagId: row.tag_id as string,
        slug: row.slug as string,
        name: row.name as string,
        followedAt: row.followed_at as string,
      }))
  }

  async reportContent(dto: ContentReportDTO): Promise<{ reported: boolean }> {
    const { data, error } = await supabase.rpc('fn_content_report', {
      p_target_type: dto.targetType,
      p_target_id: dto.targetId,
      p_reason: dto.reason,
    })
    if (error) throw error
    return data as { reported: boolean }
  }
}
