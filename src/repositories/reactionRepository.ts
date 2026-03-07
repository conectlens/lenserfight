import { ReactionRecord, TargetType, ReactionType, ReactionCount } from '../types/reactions.types'
import { supabase } from '../core/supabase/client'

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
  async getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]> {
    const { data, error } = await supabase.rpc('fn_content_reactions_get_for_target', {
      p_target_type: targetType,
      p_target_id: targetId,
    })

    if (error) throw error
    return (data ?? []) as ReactionRecord[]
  }

  async getUserReaction(
    targetType: TargetType,
    targetId: string,
    _lenserId: string // used in RPC maybe? or just for port compatibility
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
    _lenserId: string, // kept for interface compatibility; ignored
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

    const { data, error } = await supabase.rpc('fn_content_reactions_get_batch_user', {
      p_target_type: targetType,
      p_target_ids: targetIds,
    })

    if (error) throw error
    return (data ?? []) as ReactionRecord[]
  }

  // addReaction/removeReaction can be modeled via toggleReaction or separate RPCs if you really need them.
  // With the unique index, toggle covers both use cases.

  async countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]> {
    const { data, error } = await supabase.rpc('fn_content_reactions_get_summary', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_lenser_id: null,
    })

    if (error) throw error
    const summary = data as {
      counts: Record<string, number>
      total: number
      userReactions: string[]
    }

    return Object.entries(summary.counts).map(([reaction, count]) => ({
      reaction: reaction as ReactionType,
      count,
    }))
  }

  async getLenserHistory(handle: string, offset = 0, limit = 20): Promise<ReactionRecord[]> {
    const { data, error } = await supabase.rpc('fn_content_reactions_get_lenser_history', {
      p_handle: handle,
      p_offset: offset,
      p_limit: limit,
    })

    if (error) throw error
    return (data ?? []) as ReactionRecord[]
  }
}
