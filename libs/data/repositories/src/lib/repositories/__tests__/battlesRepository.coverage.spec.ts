// Phase BO — repository coverage spec.
//
// Asserts each newly-added method routes to the correct RPC name with the
// expected parameter shape. Mocks supabase.rpc — no live DB needed.

import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseBattlesRepository } from '../battlesRepository'

describe('battlesRepository — Phase BJ/BK/BM/BN/BP coverage', () => {
  let repo: SupabaseBattlesRepository

  beforeEach(() => {
    repo = new SupabaseBattlesRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ── BJ ────────────────────────────────────────────────────────────────────
  it('logModelTestRun → fn_log_model_test_run', async () => {
    mockRpc.mockResolvedValueOnce({ data: { id: 'mtr-1' }, error: null })
    const out = await repo.logModelTestRun({
      battleId: 'b-1', templateId: null,
      modelProvider: 'openai', modelId: 'gpt-4o-mini',
      promptHash: 'sha256:abc', passed: true,
      durationMs: 10, rawOutput: { ok: true }, violations: [],
    })
    expect(mockRpc).toHaveBeenCalledWith('fn_log_model_test_run', expect.objectContaining({
      p_battle_id: 'b-1', p_model_provider: 'openai',
    }))
    expect(out).toEqual({ id: 'mtr-1' })
  })

  it('getModelTestRuns → fn_get_model_test_runs', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ id: 'r-1' }], error: null })
    const out = await repo.getModelTestRuns('b-1', 10)
    expect(mockRpc).toHaveBeenCalledWith('fn_get_model_test_runs', {
      p_battle_id: 'b-1', p_limit: 10,
    })
    expect(out).toEqual([{ id: 'r-1' }])
  })

  // ── BK ────────────────────────────────────────────────────────────────────
  it('checkMediaQuality → fn_check_media_quality', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { submission_id: 's-1', passed: true, violations: [], checked_at: 'now' },
      error: null,
    })
    const out = await repo.checkMediaQuality('s-1')
    expect(mockRpc).toHaveBeenCalledWith('fn_check_media_quality', { p_submission_id: 's-1' })
    expect(out.passed).toBe(true)
  })

  // ── BM ────────────────────────────────────────────────────────────────────
  it('getMyVoteFull → fn_battles_get_my_vote', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { contender_id: 'c-1', vote_value: 'contender_a', updated_at: '2026-05-12T00:00:00Z' },
      error: null,
    })
    const out = await repo.getMyVoteFull('b-1')
    expect(mockRpc).toHaveBeenCalledWith('fn_battles_get_my_vote', { p_battle_id: 'b-1' })
    expect(out?.contender_id).toBe('c-1')
  })

  it('changeVote → fn_battles_change_vote', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { vote_id: 'v-1', updated_at: '2026-05-12T00:00:00Z' },
      error: null,
    })
    const out = await repo.changeVote('b-1', 'c-2')
    expect(mockRpc).toHaveBeenCalledWith('fn_battles_change_vote', {
      p_battle_id: 'b-1', p_new_contender_id: 'c-2',
    })
    expect(out.vote_id).toBe('v-1')
  })

  // ── BN ────────────────────────────────────────────────────────────────────
  it('renderTemplatePrompt → fn_battles_render_prompt', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'rendered prompt', error: null })
    const out = await repo.renderTemplatePrompt('t-1', { topic: 'cats' })
    expect(mockRpc).toHaveBeenCalledWith('fn_battles_render_prompt', {
      p_template_id: 't-1', p_variables: { topic: 'cats' },
    })
    expect(out).toBe('rendered prompt')
  })

  // ── BP ────────────────────────────────────────────────────────────────────
  it('browseBattles → fn_browse_battles (no cursor)', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null })
    await repo.browseBattles({ category: 'creative', status: 'open' }, undefined, 25)
    expect(mockRpc).toHaveBeenCalledWith('fn_browse_battles', expect.objectContaining({
      p_category: 'creative', p_status: 'open', p_after_created: null, p_after_id: null, p_limit: 25,
    }))
  })

  it('browseBattles clamps limit to [1,100]', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null })
    await repo.browseBattles({}, undefined, 999)
    expect(mockRpc).toHaveBeenLastCalledWith('fn_browse_battles', expect.objectContaining({
      p_limit: 100,
    }))
  })

  // ── BH cross-check (templates / series) ───────────────────────────────────
  it('createTemplate → fn_battles_create_template', async () => {
    mockRpc.mockResolvedValueOnce({ data: { id: 'tpl-1' }, error: null })
    await repo.createTemplate({ title: 't', taskPrompt: 'p' })
    expect(mockRpc).toHaveBeenCalledWith('fn_battles_create_template', expect.objectContaining({
      p_title: 't', p_task_prompt: 'p',
    }))
  })

  it('updateTemplate → fn_battles_update_template', async () => {
    mockRpc.mockResolvedValueOnce({ data: { id: 'tpl-1' }, error: null })
    await repo.updateTemplate('tpl-1', { title: 't2' })
    expect(mockRpc).toHaveBeenCalledWith('fn_battles_update_template', expect.objectContaining({
      p_template_id: 'tpl-1', p_title: 't2',
    }))
  })

  it('deleteTemplate → fn_battles_delete_template', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null })
    await repo.deleteTemplate('tpl-1')
    expect(mockRpc).toHaveBeenCalledWith('fn_battles_delete_template', { p_template_id: 'tpl-1' })
  })

  it('getTemplateById → fn_battles_get_template', async () => {
    mockRpc.mockResolvedValueOnce({ data: { id: 'tpl-1' }, error: null })
    await repo.getTemplateById('tpl-1')
    expect(mockRpc).toHaveBeenCalledWith('fn_battles_get_template', { p_template_id: 'tpl-1' })
  })

  it('createSeries → fn_create_battle_series', async () => {
    mockRpc.mockResolvedValueOnce({ data: { id: 's-1' }, error: null })
    await repo.createSeries('tpl-1', 'Series', 5)
    expect(mockRpc).toHaveBeenCalledWith('fn_create_battle_series', {
      p_template_id: 'tpl-1', p_title: 'Series', p_round_count: 5,
    })
  })

  it('advanceSeries → fn_advance_series', async () => {
    mockRpc.mockResolvedValueOnce({ data: { id: 's-1', current_round: 2 }, error: null })
    await repo.advanceSeries('s-1')
    expect(mockRpc).toHaveBeenCalledWith('fn_advance_series', { p_series_id: 's-1' })
  })

  it('getSeries → fn_get_series', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null })
    await repo.getSeries('s-1')
    expect(mockRpc).toHaveBeenCalledWith('fn_get_series', { p_series_id: 's-1' })
  })
})
