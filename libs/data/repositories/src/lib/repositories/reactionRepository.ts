import { ReactionRecord, TargetType, ReactionType, ReactionCount } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

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
  getLenserHistory(handle: string, offset?: number, limit?: number): Promise<ReactionRecord[]>
}
export class SupabaseReactionRepository implements ReactionRepositoryPort {
  private getMapping(targetType: TargetType) {
    switch (targetType) {
      case 'prompt_template':
        return { table: 'prompt_reactions', idColumn: 'prompt_id' }
      case 'thread':
        return { table: 'thread_reactions', idColumn: 'thread_id' }
      case 'thread_reply':
        return { table: 'thread_reply_reactions', idColumn: 'reply_id' }
      default:
        throw new Error(`Invalid target type: ${targetType}`)
    }
  }

  private mapToRecord(r: any, targetType: TargetType, idColumn: string): ReactionRecord {
    return {
      id: r.id,
      lenser_id: r.user_id,
      target_type: targetType,
      target_id: r[idColumn],
      reaction: r.reaction,
      created_at: r.created_at,
    }
  }

  async getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]> {
    const { table, idColumn } = this.getMapping(targetType)
    const { data, error } = await supabase
      .schema('content')
      .from(table)
      .select('*')
      .eq(idColumn, targetId)

    if (error) throw error
    return (data ?? []).map((r) => this.mapToRecord(r, targetType, idColumn))
  }

  async getUserReaction(
    targetType: TargetType,
    targetId: string,
    _lenserId: string
  ): Promise<ReactionRecord[]> {
    const { data, error } = await supabase.rpc('fn_content_reactions_get_user_for_target', {
      p_target_type: targetType,
      p_target_id: targetId,
    })

    if (error) throw error
    return (data ?? []) as ReactionRecord[]
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
    return data as any
  }

  async getBatchUserReactions(
    targetType: TargetType,
    targetIds: string[],
    _lenserId: string
  ): Promise<ReactionRecord[]> {
    if (targetIds.length === 0) return []

    const { table, idColumn } = this.getMapping(targetType)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .schema('content')
      .from(table)
      .select('*')
      .eq('user_id', user.id)
      .in(idColumn, targetIds)

    if (error) throw error
    return (data ?? []).map((r) => this.mapToRecord(r, targetType, idColumn))
  }

  async countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]> {
    const { table, idColumn } = this.getMapping(targetType)

    // Using PostgREST to get all reactions for this target and counting in JS
    // This is the simplest way to migrate from RPC without grouping support in REST API
    const { data, error } = await supabase
      .schema('content')
      .from(table)
      .select('reaction')
      .eq(idColumn, targetId)

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

  async getLenserHistory(handle: string, offset = 0, limit = 20): Promise<ReactionRecord[]> {
    // 1. Resolve handle to ID
    const { data: profile, error: profileError } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('id')
      .eq('handle', handle)
      .single()

    if (profileError || !profile) return []
    const lenserId = profile.id

    // 2. Fetch from all 3 de-polymorphed tables
    const [pRes, tRes, rRes] = await Promise.all([
      supabase
        .schema('content')
        .from('prompt_reactions')
        .select('*')
        .eq('user_id', lenserId)
        .order('created_at', { ascending: false })
        .limit(limit + offset),
      supabase
        .schema('content')
        .from('thread_reactions')
        .select('*')
        .eq('user_id', lenserId)
        .order('created_at', { ascending: false })
        .limit(limit + offset),
      supabase
        .schema('content')
        .from('thread_reply_reactions')
        .select('*')
        .eq('user_id', lenserId)
        .order('created_at', { ascending: false })
        .limit(limit + offset),
    ])

    const allReactions: ReactionRecord[] = [
      ...(pRes.data ?? []).map((r) => this.mapToRecord(r, 'prompt_template', 'prompt_id')),
      ...(tRes.data ?? []).map((r) => this.mapToRecord(r, 'thread', 'thread_id')),
      ...(rRes.data ?? []).map((r) => this.mapToRecord(r, 'thread_reply', 'reply_id')),
    ]

    // 3. Sort and slice for manual pagination across tables
    return allReactions
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit)
  }
}
