import { SupabaseClient } from '@supabase/supabase-js';
import { battleService } from './battle.service';
import { McpError } from './mcp-error';

function makeSb(result: { data?: unknown; error?: { message: string } | null }) {
  const rpc = jest.fn(() => Promise.resolve({ data: result.data ?? null, error: result.error ?? null }));
  return { rpc, sb: { rpc } as unknown as SupabaseClient };
}

describe('battleService', () => {
  describe('list', () => {
    it('unpacks data.data + count from paged RPC', async () => {
      const { sb } = makeSb({ data: { data: [{ id: 'b1' }], count: 3 } });
      const r = await battleService.list(sb, { limit: 10, offset: 0 });
      expect(r).toEqual({ items: [{ id: 'b1' }], total: 3 });
    });

    it('maps battle_not_found to NOT_FOUND', async () => {
      const { sb } = makeSb({ error: { message: 'battle_not_found' } });
      await expect(battleService.list(sb, { limit: 10, offset: 0 })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('create / updateConfig', () => {
    it('create returns the new battle id', async () => {
      const { sb, rpc } = makeSb({ data: 'b1' });
      const id = await battleService.create(sb, { title: 'T', slug: 's', task_prompt: 'p', rubric_id: null });
      expect(id).toBe('b1');
      expect(rpc).toHaveBeenCalledWith('fn_battles_create', expect.objectContaining({ p_slug: 's' }));
    });

    it('create throws when RPC returns null data', async () => {
      const { sb } = makeSb({ data: null });
      await expect(battleService.create(sb, { title: 'T', slug: 's', task_prompt: 'p', rubric_id: null }))
        .rejects.toBeInstanceOf(McpError);
    });

    it('updateConfig forwards all 5 config fields', async () => {
      const { sb, rpc } = makeSb({ data: null });
      await battleService.updateConfig(sb, {
        battle_id: 'b1', battle_type: 'ai_vs_ai', judging_mode: 'ai_judge',
        max_contenders: 4, ai_judge_model_key: 'k',
      });
      expect(rpc).toHaveBeenCalledWith('fn_mcp_battle_update_config', {
        p_battle_id: 'b1', p_battle_type: 'ai_vs_ai', p_judging_mode: 'ai_judge',
        p_max_contenders: 4, p_ai_judge_model_key: 'k',
      });
    });
  });

  describe('addContender / submitRun / score / setStatus / history', () => {
    it('addContender maps slots_full to SLOTS_FULL', async () => {
      const { sb } = makeSb({ error: { message: 'slots_full' } });
      await expect(
        battleService.addContender(sb, { battle_id: 'b', display_name: 'n', contender_type: 'human', contender_ref_id: 'r', slot: null })
      ).rejects.toMatchObject({ code: 'SLOTS_FULL' });
    });

    it('submitRun returns { submitted: true } when data is null', async () => {
      const { sb } = makeSb({ data: null });
      const r = await battleService.submitRun(sb, { battle_id: 'b', contender_id: 'c', content_text: 'x' });
      expect(r).toEqual({ submitted: true });
    });

    it('setStatus maps invalid_status_transition to INVALID_TRANSITION', async () => {
      const { sb } = makeSb({ error: { message: 'invalid_status_transition: draft → published' } });
      await expect(battleService.setStatus(sb, { battle_id: 'b', status: 'published' }))
        .rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    });

    it('history unpacks paged result', async () => {
      const { sb } = makeSb({ data: { data: [{ id: 'h1' }], count: 1 } });
      const r = await battleService.history(sb, { lenser_id: 'L', limit: 10, offset: 0 });
      expect(r).toEqual({ items: [{ id: 'h1' }], total: 1 });
    });
  });
});
