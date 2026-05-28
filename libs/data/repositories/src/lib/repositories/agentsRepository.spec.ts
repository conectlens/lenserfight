import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseAgentsRepository } from './agentsRepository'

const AGENT_ID = 'agent-uuid-1'
const OWNER_ID = 'owner-uuid-1'
const PROFILE_ID = 'profile-uuid-1'
const LENS_ID = 'lens-uuid-1'
const MODEL_ID = 'model-uuid-1'

const rawAgentProfile = {
  id: AGENT_ID,
  ai_lenser_id: AGENT_ID,
  profile_id: PROFILE_ID,
  handle: 'mybot',
  display_name: 'My Bot',
  avatar_url: null,
  runtime_pref: 'cloud',
  is_active: true,
  suspended_at: null,
  suspended_reason: null,
  can_join_battles: true,
  can_vote: false,
  can_create_battles: false,
  can_receive_sponsorship: false,
  model_binding_mode: 'fixed',
  max_daily_battles: 10,
  max_daily_votes: 0,
  allowed_battle_types: ['ai_vs_ai'],
  spending_limit_credits: 100,
  is_public_policy: true,
  model_count: 1,
  lens_count: 2,
  battles_used: 0,
  votes_used: 0,
  credits_spent: 0,
  owner_lenser_id: OWNER_ID,
  owner_handle: 'alice',
  owner_display_name: 'Alice',
  owner_avatar_url: null,
  total_battles: 5,
  battles_won: 3,
  battles_lost: 2,
  win_rate: 0.6,
}

describe('SupabaseAgentsRepository', () => {
  let repo: SupabaseAgentsRepository

  beforeEach(() => {
    repo = new SupabaseAgentsRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // getAgentProfile
  // ---------------------------------------------------------------------------
  describe('getAgentProfile', () => {
    it('calls fn_get_agent_profile with p_ai_lenser_id', async () => {
      mockRpc.mockResolvedValue({ data: rawAgentProfile, error: null })
      const result = await repo.getAgentProfile(AGENT_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_agent_profile', { p_ai_lenser_id: AGENT_ID })
      expect(result).toEqual(rawAgentProfile)
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getAgentProfile(AGENT_ID)).toBeNull()
    })

    it('throws "Agent not found." on PGRST116', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'row not found' } })
      await expect(repo.getAgentProfile(AGENT_ID)).rejects.toThrow('Agent not found.')
    })

    it('rethrows generic errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('db error') })
      await expect(repo.getAgentProfile(AGENT_ID)).rejects.toThrow('db error')
    })
  })

  // ---------------------------------------------------------------------------
  // getAgentProfileByProfileId
  // ---------------------------------------------------------------------------
  describe('getAgentProfileByProfileId', () => {
    it('calls fn_get_agent_profile_by_profile_id with p_profile_id', async () => {
      mockRpc.mockResolvedValue({ data: rawAgentProfile, error: null })
      const result = await repo.getAgentProfileByProfileId(PROFILE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_agent_profile_by_profile_id', { p_profile_id: PROFILE_ID })
      expect(result).toEqual(rawAgentProfile)
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getAgentProfileByProfileId(PROFILE_ID)).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('fail') })
      await expect(repo.getAgentProfileByProfileId(PROFILE_ID)).rejects.toThrow('fail')
    })
  })

  // ---------------------------------------------------------------------------
  // getAgentsByOwner
  // ---------------------------------------------------------------------------
  describe('getAgentsByOwner', () => {
    it('calls fn_list_agents_by_owner with p_owner_lenser_id', async () => {
      mockRpc.mockResolvedValue({ data: [rawAgentProfile], error: null })
      const result = await repo.getAgentsByOwner(OWNER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_agents_by_owner', { p_owner_lenser_id: OWNER_ID })
      expect(result).toEqual([rawAgentProfile])
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getAgentsByOwner(OWNER_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('owner error') })
      await expect(repo.getAgentsByOwner(OWNER_ID)).rejects.toThrow('owner error')
    })
  })

  // ---------------------------------------------------------------------------
  // createAgent
  // ---------------------------------------------------------------------------
  describe('createAgent', () => {
    const rawResult = { profile_id: PROFILE_ID, ai_lenser_id: AGENT_ID, status: 'active' }

    it('calls fn_create_ai_lenser with all parameters', async () => {
      mockRpc.mockResolvedValue({ data: rawResult, error: null })
      const result = await repo.createAgent({
        owner_lenser_id: OWNER_ID,
        handle: 'mybot',
        display_name: 'My Bot',
        ai_model_id: MODEL_ID,
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_create_ai_lenser', {
        p_owner_lenser_id: OWNER_ID,
        p_handle: 'mybot',
        p_display_name: 'My Bot',
        p_ai_model_id: MODEL_ID,
      })
      expect(result).toEqual({ profile_id: PROFILE_ID, ai_lenser_id: AGENT_ID })
    })

    it('strips status from result — only returns profile_id and ai_lenser_id', async () => {
      mockRpc.mockResolvedValue({ data: rawResult, error: null })
      const result = await repo.createAgent({ owner_lenser_id: OWNER_ID, handle: 'b', display_name: 'B', ai_model_id: null })
      expect(result).not.toHaveProperty('status')
      expect(result).toHaveProperty('profile_id')
      expect(result).toHaveProperty('ai_lenser_id')
    })

    it('passes null for ai_model_id when not provided', async () => {
      mockRpc.mockResolvedValue({ data: rawResult, error: null })
      await repo.createAgent({ owner_lenser_id: OWNER_ID, handle: 'b', display_name: 'B' })
      expect(mockRpc).toHaveBeenCalledWith('fn_create_ai_lenser', expect.objectContaining({ p_ai_model_id: null }))
    })

    it('throws custom error when owner_must_be_active_human_lenser constraint fires', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'owner_must_be_active_human_lenser' } })
      await expect(repo.createAgent({ owner_lenser_id: OWNER_ID, handle: 'b', display_name: 'B' }))
        .rejects.toThrow('Your account must be active to create AI agents. Try refreshing the page.')
    })

    it('rethrows generic errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('create error') })
      await expect(repo.createAgent({ owner_lenser_id: OWNER_ID, handle: 'b', display_name: 'B' })).rejects.toThrow('create error')
    })
  })

  // ---------------------------------------------------------------------------
  // recordAction
  // ---------------------------------------------------------------------------
  describe('recordAction', () => {
    it('calls fn_agent_action with all parameters', async () => {
      const response = { allowed: true, reason: null }
      mockRpc.mockResolvedValue({ data: response, error: null })
      const result = await repo.recordAction({
        ai_lenser_id: AGENT_ID,
        action_type: 'vote',
        context_type: 'battle',
        context_id: 'b-1',
        metadata: { foo: 'bar' },
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_agent_action', {
        p_ai_lenser_id: AGENT_ID,
        p_action_type: 'vote',
        p_context_type: 'battle',
        p_context_id: 'b-1',
        p_metadata: { foo: 'bar' },
      })
      expect(result).toEqual(response)
    })

    it('passes null for optional fields when absent', async () => {
      mockRpc.mockResolvedValue({ data: {}, error: null })
      await repo.recordAction({ ai_lenser_id: AGENT_ID, action_type: 'ping' })
      expect(mockRpc).toHaveBeenCalledWith('fn_agent_action', expect.objectContaining({
        p_context_type: null,
        p_context_id: null,
        p_metadata: {},
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('action error') })
      await expect(repo.recordAction({ ai_lenser_id: AGENT_ID, action_type: 'ping' })).rejects.toThrow('action error')
    })
  })

  // ---------------------------------------------------------------------------
  // getActionLogs
  // ---------------------------------------------------------------------------
  describe('getActionLogs', () => {
    it('calls fn_list_agent_action_logs with default limit 50', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getActionLogs(AGENT_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_agent_action_logs', {
        p_ai_lenser_id: AGENT_ID,
        p_limit: 50,
      })
    })

    it('enforces limit when custom value passed', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getActionLogs(AGENT_ID, 10)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_agent_action_logs', { p_ai_lenser_id: AGENT_ID, p_limit: 10 })
    })

    it('returns action log records', async () => {
      const logs = [{ id: 'log-1', action_type: 'vote', created_at: '2026-01-01T00:00:00Z' }]
      mockRpc.mockResolvedValue({ data: logs, error: null })
      expect(await repo.getActionLogs(AGENT_ID)).toEqual(logs)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getActionLogs(AGENT_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('logs error') })
      await expect(repo.getActionLogs(AGENT_ID)).rejects.toThrow('logs error')
    })
  })

  // ---------------------------------------------------------------------------
  // getAutomationFeed
  // ---------------------------------------------------------------------------
  describe('getAutomationFeed', () => {
    it('calls fn_get_agent_automation_feed with default limit 100 and offset 0', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getAutomationFeed(AGENT_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_agent_automation_feed', {
        p_ai_lenser_id: AGENT_ID,
        p_limit: 100,
        p_offset: 0,
      })
    })

    it('supports custom limit and offset', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getAutomationFeed(AGENT_ID, 20, 40)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_agent_automation_feed', {
        p_ai_lenser_id: AGENT_ID,
        p_limit: 20,
        p_offset: 40,
      })
    })

    it('normalizes null payload to empty object', async () => {
      const raw = [{ id: 'feed-1', payload: null }]
      mockRpc.mockResolvedValue({ data: raw, error: null })
      const [item] = await repo.getAutomationFeed(AGENT_ID)
      expect(item.payload).toEqual({})
    })

    it('preserves existing payload when present', async () => {
      const raw = [{ id: 'feed-2', payload: { key: 'value' } }]
      mockRpc.mockResolvedValue({ data: raw, error: null })
      const [item] = await repo.getAutomationFeed(AGENT_ID)
      expect(item.payload).toEqual({ key: 'value' })
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getAutomationFeed(AGENT_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('feed error') })
      await expect(repo.getAutomationFeed(AGENT_ID)).rejects.toThrow('feed error')
    })
  })

  // ---------------------------------------------------------------------------
  // getQuotaSnapshot
  // ---------------------------------------------------------------------------
  describe('getQuotaSnapshot', () => {
    it('calls fn_get_agent_quota_snapshot with explicit date', async () => {
      const snapshot = { battles_used: 2, votes_used: 0 }
      mockRpc.mockResolvedValue({ data: [snapshot], error: null })
      const result = await repo.getQuotaSnapshot(AGENT_ID, '2026-01-01')
      expect(mockRpc).toHaveBeenCalledWith('fn_get_agent_quota_snapshot', {
        p_ai_lenser_id: AGENT_ID,
        p_period_date: '2026-01-01',
      })
      expect(result).toEqual(snapshot)
    })

    it('uses today\'s date when no date provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getQuotaSnapshot(AGENT_ID)
      const call = mockRpc.mock.calls[0]
      expect(call[1].p_period_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('returns null when data array is empty', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getQuotaSnapshot(AGENT_ID, '2026-01-01')).toBeNull()
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getQuotaSnapshot(AGENT_ID, '2026-01-01')).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('quota error') })
      await expect(repo.getQuotaSnapshot(AGENT_ID, '2026-01-01')).rejects.toThrow('quota error')
    })
  })

  // ---------------------------------------------------------------------------
  // getLensBindings
  // ---------------------------------------------------------------------------
  describe('getLensBindings', () => {
    it('calls fn_list_agent_lens_bindings with default limit 50 and offset 0', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getLensBindings(AGENT_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_agent_lens_bindings', {
        p_ai_lenser_id: AGENT_ID,
        p_limit: 50,
        p_offset: 0,
      })
    })

    it('supports pagination', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getLensBindings(AGENT_ID, 10, 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_agent_lens_bindings', expect.objectContaining({ p_limit: 10, p_offset: 20 }))
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getLensBindings(AGENT_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('bindings error') })
      await expect(repo.getLensBindings(AGENT_ID)).rejects.toThrow('bindings error')
    })
  })

  // ---------------------------------------------------------------------------
  // getModelBindings
  // ---------------------------------------------------------------------------
  describe('getModelBindings', () => {
    it('calls fn_list_agent_model_bindings with default limit 50 and offset 0', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getModelBindings(AGENT_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_agent_model_bindings', {
        p_ai_lenser_id: AGENT_ID,
        p_limit: 50,
        p_offset: 0,
      })
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getModelBindings(AGENT_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('model bindings error') })
      await expect(repo.getModelBindings(AGENT_ID)).rejects.toThrow('model bindings error')
    })
  })

  // ---------------------------------------------------------------------------
  // setMainLensBinding
  // ---------------------------------------------------------------------------
  describe('setMainLensBinding', () => {
    const binding = { id: 'binding-1', ai_lenser_id: AGENT_ID, lens_id: LENS_ID, is_default: true }

    it('calls fn_upsert_agent_lens_binding with all params', async () => {
      mockRpc.mockResolvedValue({ data: [binding], error: null })
      const result = await repo.setMainLensBinding(AGENT_ID, LENS_ID, 'v-1', ['code'])
      expect(mockRpc).toHaveBeenCalledWith('fn_upsert_agent_lens_binding', {
        p_ai_lenser_id: AGENT_ID,
        p_lens_id: LENS_ID,
        p_version_id: 'v-1',
        p_is_default: true,
        p_category_tags: ['code'],
      })
      expect(result).toEqual(binding)
    })

    it('handles non-array data response', async () => {
      mockRpc.mockResolvedValue({ data: binding, error: null })
      const result = await repo.setMainLensBinding(AGENT_ID, LENS_ID)
      expect(result).toEqual(binding)
    })

    it('passes null versionId and empty categoryTags by default', async () => {
      mockRpc.mockResolvedValue({ data: [binding], error: null })
      await repo.setMainLensBinding(AGENT_ID, LENS_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_upsert_agent_lens_binding', expect.objectContaining({
        p_version_id: null,
        p_category_tags: [],
      }))
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.setMainLensBinding(AGENT_ID, LENS_ID)).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('binding error') })
      await expect(repo.setMainLensBinding(AGENT_ID, LENS_ID)).rejects.toThrow('binding error')
    })
  })

  // ---------------------------------------------------------------------------
  // setDefaultModelBinding
  // ---------------------------------------------------------------------------
  describe('setDefaultModelBinding', () => {
    const modelBinding = { id: 'mb-1', ai_lenser_id: AGENT_ID, model_id: MODEL_ID, is_default: true }

    it('calls fn_upsert_agent_model_binding with p_is_default=true', async () => {
      mockRpc.mockResolvedValue({ data: [modelBinding], error: null })
      const result = await repo.setDefaultModelBinding(AGENT_ID, MODEL_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_upsert_agent_model_binding', {
        p_ai_lenser_id: AGENT_ID,
        p_model_id: MODEL_ID,
        p_is_default: true,
      })
      expect(result).toEqual(modelBinding)
    })

    it('handles non-array data response', async () => {
      mockRpc.mockResolvedValue({ data: modelBinding, error: null })
      expect(await repo.setDefaultModelBinding(AGENT_ID, MODEL_ID)).toEqual(modelBinding)
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.setDefaultModelBinding(AGENT_ID, MODEL_ID)).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('model binding error') })
      await expect(repo.setDefaultModelBinding(AGENT_ID, MODEL_ID)).rejects.toThrow('model binding error')
    })
  })

  // ---------------------------------------------------------------------------
  // updatePolicy
  // ---------------------------------------------------------------------------
  describe('updatePolicy', () => {
    it('calls fn_update_agent_policy with p_ai_lenser_id and p_patch', async () => {
      const patch = { can_vote: true, max_daily_votes: 5 }
      await repo.updatePolicy(AGENT_ID, patch)
      expect(mockRpc).toHaveBeenCalledWith('fn_update_agent_policy', {
        p_ai_lenser_id: AGENT_ID,
        p_patch: patch,
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('policy error') })
      await expect(repo.updatePolicy(AGENT_ID, {})).rejects.toThrow('policy error')
    })
  })

  // ---------------------------------------------------------------------------
  // updateAgentProfile
  // ---------------------------------------------------------------------------
  describe('updateAgentProfile', () => {
    it('calls fn_update_agent_profile with p_ai_lenser_id and p_patch', async () => {
      const patch = { display_name: 'New Name', bio: 'hi' }
      await repo.updateAgentProfile(PROFILE_ID, patch)
      expect(mockRpc).toHaveBeenCalledWith('fn_update_agent_profile', {
        p_ai_lenser_id: PROFILE_ID,
        p_patch: patch,
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('profile error') })
      await expect(repo.updateAgentProfile(PROFILE_ID, {})).rejects.toThrow('profile error')
    })
  })

  // ---------------------------------------------------------------------------
  // updatePersonality
  // ---------------------------------------------------------------------------
  describe('updatePersonality', () => {
    it('calls fn_update_agent_personality with p_ai_lenser_id and p_personality_note', async () => {
      await repo.updatePersonality(AGENT_ID, 'Be concise.')
      expect(mockRpc).toHaveBeenCalledWith('fn_update_agent_personality', {
        p_ai_lenser_id: AGENT_ID,
        p_personality_note: 'Be concise.',
      })
    })

    it('passes null when note is null', async () => {
      await repo.updatePersonality(AGENT_ID, null)
      expect(mockRpc).toHaveBeenCalledWith('fn_update_agent_personality', {
        p_ai_lenser_id: AGENT_ID,
        p_personality_note: null,
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('personality error') })
      await expect(repo.updatePersonality(AGENT_ID, null)).rejects.toThrow('personality error')
    })
  })
})
