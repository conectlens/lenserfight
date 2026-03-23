import { ReactionRecord, TargetType, ReactionType, ReactionCount } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'
import { ApiResponseEnvelope, paginatedResponse } from 'contracts'

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
  getLenserHistory(handle: string, offset?: number, limit?: number): Promise<ApiResponseEnvelope<ReactionRecord[]>>
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
    const { data, error } = await supabase
      .schema('content')
      .from('reactions')
      .select('*')
      .eq('entity_type', targetType)
      .eq('entity_id', targetId)

    if (error) throw error
    return (data ?? []).map((r) => this.mapToRecord(r))
  }

  async getUserReaction(
    targetType: TargetType,
    targetId: string,
    _lenserId: string
  ): Promise<ReactionRecord[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .schema('content')
      .from('reactions')
      .select('*')
      .eq('entity_type', targetType)
      .eq('entity_id', targetId)
      .eq('lenser_id', user.id)

    if (error) throw error
    return (data ?? []).map((r) => this.mapToRecord(r))
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

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .schema('content')
      .from('reactions')
      .select('*')
      .eq('entity_type', targetType)
      .eq('lenser_id', user.id)
      .in('entity_id', targetIds)

    if (error) throw error
    return (data ?? []).map((r) => this.mapToRecord(r))
  }

  async countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]> {
    const { data, error } = await supabase
      .schema('content')
      .from('reactions')
      .select('reaction')
      .eq('entity_type', targetType)
      .eq('entity_id', targetId)

    if (error) throw error

    const counts: Record<string, number> = {}
    data?.forEach((r: any) => {
      counts[r.reaction] = (counts[r.reaction] || 0) + 1
    })

    return Object.entries(counts).map(([reaction, count]) => ({
      reaction: reaction as ReactionType,
      count: count as number,
    }))
  }

  async getLenserHistory(handle: string, offset = 0, limit = 20): Promise<ApiResponseEnvelope<ReactionRecord[]>> {
    const start = Date.now()

    const { data: profile, error: profileError } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('id')
      .eq('handle', handle)
      .single()

    if (profileError || !profile) {
      return paginatedResponse([], { limit, offset, total: 0, hasNextPage: false }, { durationMs: Date.now() - start })
    }

    const { data, error } = await supabase
      .schema('content')
      .from('reactions')
      .select('*')
      .eq('lenser_id', profile.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const records = (data ?? []).map((r) => this.mapToRecord(r))
    const hasNextPage = records.length === limit
    const page = records

    return paginatedResponse(
      page,
      { limit, offset, hasNextPage },
      { durationMs: Date.now() - start },
    )
  }
}
