import { ReactionRecord, TargetType, ReactionType, ReactionCount } from '@lenserfight/types'
import { supabase, getCachedSession } from '@lenserfight/data/supabase'
import { ApiResponseEnvelope, paginatedResponse } from '@lenserfight/api/contracts'

export interface ReactionRepositoryPort {
  toggleReaction(
    targetType: TargetType,
    targetId: string,
    lenserId: string,
    reaction: ReactionType
  ): Promise<{
    added: boolean
    summary: {
      counts: Record<ReactionType, number>
      total: number
      userReactions: ReactionType[]
    }
  }>
  getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]>
  getUserReaction(
    targetType: TargetType,
    targetId: string,
    lenserId: string
  ): Promise<ReactionRecord[]>
  getBatchUserReactions(
    targetType: TargetType,
    targetIds: string[],
    lenserId: string
  ): Promise<ReactionRecord[]>
  countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]>
  getLenserHistory(
    handle: string,
    offset?: number,
    limit?: number
  ): Promise<ApiResponseEnvelope<ReactionRecord[]>>
}

export class SupabaseReactionRepository implements ReactionRepositoryPort {
  private mapToRecord(r: any): ReactionRecord {
    return {
      id: r.id,
      lenser_id: r.lenser_id,
      target_type: r.entity_type as TargetType,
      target_id: r.entity_id,
      reaction: r.reaction,
      created_at: r.created_at,
    }
  }

  async getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_entity_reactions_by_lenser', {
      p_entity_type: targetType,
      p_entity_id: targetId,
      p_lenser_id: null,
    })

    if (error) throw error
    return (data ?? []).map((r: any) => this.mapToRecord(r))
  }

  async getUserReaction(
    targetType: TargetType,
    targetId: string,
    _lenserId: string
  ): Promise<ReactionRecord[]> {
    const user = getCachedSession()?.user
    if (!user) return []

    const { data, error } = await supabase.rpc('fn_get_entity_reaction_status', {
      p_entity_type: targetType,
      p_entity_id: targetId,
    })

    if (error) throw error
    return (data ?? [])
      .filter((r: any) => r.reacted)
      .map((r: any) => ({
        id: '',
        lenser_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reaction: r.reaction,
        created_at: '',
      }))
  }

  async toggleReaction(
    targetType: TargetType,
    targetId: string,
    _lenserId: string,
    reaction: ReactionType
  ): Promise<{
    added: boolean
    summary: {
      counts: Record<ReactionType, number>
      total: number
      userReactions: ReactionType[]
    }
  }> {
    const { data, error } = await supabase.rpc('fn_content_reactions_toggle', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_reaction: reaction,
    })

    if (error) throw error

    const rpcResult = data as { added: boolean; counts: Record<string, number> }
    const raw = rpcResult.counts ?? {}
    const counts: Record<ReactionType, number> = {
      like: raw['like'] ?? 0,
      love: raw['love'] ?? 0,
      clap: raw['clap'] ?? 0,
      saved: raw['saved'] ?? 0,
      copy: raw['copy'] ?? 0,
    }
    const total = counts.like + counts.love + counts.clap

    const userReactionRecords = await this.getUserReaction(targetType, targetId, _lenserId)
    const userReactions = userReactionRecords.map((r) => r.reaction)

    return { added: rpcResult.added, summary: { counts, total, userReactions } }
  }

  async getBatchUserReactions(
    targetType: TargetType,
    targetIds: string[],
    _lenserId: string
  ): Promise<ReactionRecord[]> {
    if (targetIds.length === 0) return []

    const user = getCachedSession()?.user
    if (!user) return []

    const results = await Promise.all(
      targetIds.map((id) =>
        supabase.rpc('fn_get_entity_reactions_by_lenser', {
          p_entity_type: targetType,
          p_entity_id: id,
          p_lenser_id: user.id,
        })
      )
    )

    return results.flatMap(({ data, error }) => {
      if (error) return []
      return (data ?? []).map((r: any) => this.mapToRecord(r))
    })
  }

  async countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]> {
    const { data, error } = await supabase.rpc('fn_get_entity_reaction_counts', {
      p_entity_type: targetType,
      p_entity_id: targetId,
    })

    if (error) throw error

    return (data ?? []).map((r: any) => ({
      reaction: r.reaction as ReactionType,
      count: Number(r.count),
    }))
  }

  async getLenserHistory(
    handle: string,
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<ReactionRecord[]>> {
    const start = Date.now()

    const { data: profileData, error: profileError } = await supabase.rpc(
      'fn_get_lenser_profile_brief',
      {
        p_handle: handle,
        p_lenser_id: null,
      }
    )

    if (profileError || !profileData?.[0]) {
      return paginatedResponse(
        [],
        { limit, offset, total: 0, hasNextPage: false },
        { durationMs: Date.now() - start }
      )
    }

    const profile = profileData[0]

    const { data, error } = await supabase.rpc('fn_get_entity_reactions_by_lenser', {
      p_entity_type: 'thread',
      p_entity_id: null,
      p_lenser_id: profile.id,
    })

    if (error) throw error

    const allRecords = (data ?? []).map((r: any) => this.mapToRecord(r))
    const page = allRecords.slice(offset, offset + limit)
    const hasNextPage = page.length === limit

    return paginatedResponse(
      page,
      { limit, offset, hasNextPage },
      { durationMs: Date.now() - start }
    )
  }
}
