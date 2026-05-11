import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseModerationRepository } from './moderationRepository'

const DECISION_ID = 'decision-uuid-1'

describe('SupabaseModerationRepository', () => {
  let repo: SupabaseModerationRepository

  beforeEach(() => {
    repo = new SupabaseModerationRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // getModerationDecisionsForOwner
  // ---------------------------------------------------------------------------
  describe('getModerationDecisionsForOwner', () => {
    it('calls fn_get_moderation_decisions_for_owner with status and limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getModerationDecisionsForOwner('flagged', 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_moderation_decisions_for_owner', {
        p_status: 'flagged',
        p_limit: 20,
      })
    })

    it('passes null for p_status when status is "all"', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getModerationDecisionsForOwner('all', 10)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_moderation_decisions_for_owner', {
        p_status: null,
        p_limit: 10,
      })
    })

    it('returns decisions from RPC', async () => {
      const decision = {
        decision_id: DECISION_ID,
        occurred_at: '2026-01-01T00:00:00Z',
        target_entity_id: 'entity-1',
        decision_type: 'flagged',
        reason: 'spam',
        is_ai_moderated: true,
        battle_id: null,
        battle_title: null,
        battle_slug: null,
        ai_confidence: 0.95,
      }
      mockRpc.mockResolvedValue({ data: [decision], error: null })
      const result = await repo.getModerationDecisionsForOwner('flagged', 10)
      expect(result).toHaveLength(1)
      expect(result[0].decision_id).toBe(DECISION_ID)
      expect(result[0].ai_confidence).toBe(0.95)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getModerationDecisionsForOwner('all', 10)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('moderation error') })
      await expect(repo.getModerationDecisionsForOwner('all', 10)).rejects.toThrow('moderation error')
    })
  })

  // ---------------------------------------------------------------------------
  // overrideModerationDecision
  // ---------------------------------------------------------------------------
  describe('overrideModerationDecision', () => {
    it('calls fn_decide_moderation_override with all fields', async () => {
      await repo.overrideModerationDecision({
        decisionId: DECISION_ID,
        overrideDecisionType: 'approved',
        reason: 'False positive — content is acceptable',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_decide_moderation_override', {
        p_decision_id: DECISION_ID,
        p_override_decision_type: 'approved',
        p_reason: 'False positive — content is acceptable',
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('override error') })
      await expect(repo.overrideModerationDecision({ decisionId: DECISION_ID, overrideDecisionType: 'rejected', reason: 'reason' })).rejects.toThrow('override error')
    })
  })
})
