import { supabase } from '@lenserfight/data/supabase'

export type ModerationDecisionType =
  | 'flagged'
  | 'approved'
  | 'rejected'
  | 'removed'
  | 'restored'
  | 'warned'

export interface ModerationDecisionRecord {
  decision_id: string
  occurred_at: string
  target_entity_id: string
  decision_type: ModerationDecisionType
  reason: string | null
  is_ai_moderated: boolean
  battle_id: string | null
  battle_title: string | null
  battle_slug: string | null
  ai_confidence: number | null
}

export interface ModerationRepositoryPort {
  getModerationDecisionsForOwner(
    status: ModerationDecisionType | 'all',
    limit: number
  ): Promise<ModerationDecisionRecord[]>
  overrideModerationDecision(input: {
    decisionId: string
    overrideDecisionType: ModerationDecisionType
    reason: string
  }): Promise<void>
}

export class SupabaseModerationRepository implements ModerationRepositoryPort {
  async getModerationDecisionsForOwner(
    status: ModerationDecisionType | 'all',
    limit: number
  ): Promise<ModerationDecisionRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_moderation_decisions_for_owner', {
      p_status: status === 'all' ? null : status,
      p_limit: limit,
    })
    if (error) throw error
    return (data ?? []) as ModerationDecisionRecord[]
  }

  async overrideModerationDecision(input: {
    decisionId: string
    overrideDecisionType: ModerationDecisionType
    reason: string
  }): Promise<void> {
    const { error } = await supabase.rpc('fn_decide_moderation_override', {
      p_decision_id: input.decisionId,
      p_override_decision_type: input.overrideDecisionType,
      p_reason: input.reason,
    })
    if (error) throw error
  }
}

export const moderationRepository = new SupabaseModerationRepository()
