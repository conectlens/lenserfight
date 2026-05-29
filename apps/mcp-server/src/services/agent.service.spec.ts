import { SupabaseClient } from '@supabase/supabase-js';
import { agentService } from './agent.service';
import { McpError } from './mcp-error';

interface RpcArgs { name: string; args: Record<string, unknown> }
interface MockSb {
  rpc: jest.Mock;
  schema: jest.Mock;
  calls: RpcArgs[];
}

function makeSb(rpcResult: { data?: unknown; error?: { message: string } | null }): MockSb {
  const calls: RpcArgs[] = [];
  const rpc = jest.fn((name: string, args: Record<string, unknown>) => {
    calls.push({ name, args });
    return Promise.resolve({ data: rpcResult.data ?? null, error: rpcResult.error ?? null });
  });
  // schema('agents').rpc(...) routes back through the same rpc fn
  const schema = jest.fn(() => ({ rpc }));
  return { rpc, schema, calls };
}

function asClient(sb: MockSb): SupabaseClient {
  return sb as unknown as SupabaseClient;
}

describe('agentService', () => {
  describe('list', () => {
    it('calls fn_list_agents_by_owner and wraps items+total', async () => {
      const sb = makeSb({ data: [{ id: 'a1' }, { id: 'a2' }] });
      const result = await agentService.list(asClient(sb), { owner_lenser_id: 'owner-1' });
      expect(sb.rpc).toHaveBeenCalledWith('fn_list_agents_by_owner', { p_owner_lenser_id: 'owner-1' });
      expect(result).toEqual({ items: [{ id: 'a1' }, { id: 'a2' }], total: 2 });
    });

    it('throws McpError(DB_ERROR) on rpc error', async () => {
      const sb = makeSb({ error: { message: 'boom' } });
      await expect(agentService.list(asClient(sb), { owner_lenser_id: 'x' })).rejects.toBeInstanceOf(McpError);
    });

    it('maps access_denied error to FORBIDDEN', async () => {
      const sb = makeSb({ error: { message: 'access_denied: nope' } });
      await expect(agentService.list(asClient(sb), { owner_lenser_id: 'x' })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });
  });

  describe('get', () => {
    it('returns null when data is null', async () => {
      const sb = makeSb({ data: null });
      const result = await agentService.get(asClient(sb), 'a1');
      expect(result).toBeNull();
    });

    it('passes ai_lenser_id to fn_get_agent_profile', async () => {
      const sb = makeSb({ data: { id: 'a1' } });
      await agentService.get(asClient(sb), 'a1');
      expect(sb.rpc).toHaveBeenCalledWith('fn_get_agent_profile', { p_ai_lenser_id: 'a1' });
    });
  });

  describe('create', () => {
    it('forwards all four create params', async () => {
      const sb = makeSb({ data: { profile_id: 'p1', ai_lenser_id: 'a1', status: 'active' } });
      await agentService.create(asClient(sb), {
        owner_lenser_id: 'owner-1',
        handle: 'cool-bot',
        display_name: 'Cool Bot',
        ai_model_id: 'm1',
      });
      expect(sb.rpc).toHaveBeenCalledWith('fn_create_ai_lenser', {
        p_owner_lenser_id: 'owner-1',
        p_handle: 'cool-bot',
        p_display_name: 'Cool Bot',
        p_ai_model_id: 'm1',
      });
    });

    it('maps handle_taken to CONFLICT', async () => {
      const sb = makeSb({ error: { message: 'handle_taken' } });
      await expect(
        agentService.create(asClient(sb), { owner_lenser_id: 'o', handle: 'h', display_name: 'd', ai_model_id: null })
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });

  describe('update', () => {
    it('returns patched keys in stable order', async () => {
      const sb = makeSb({ data: null });
      const r = await agentService.update(asClient(sb), { ai_lenser_id: 'a1', patch: { bio: 'b', display_name: 'd' } });
      expect(r.patched_keys.sort()).toEqual(['bio', 'display_name']);
    });
  });

  describe('archive', () => {
    it('uses fn_archive_agent and falls back to status: archived on null data', async () => {
      const sb = makeSb({ data: null });
      const result = await agentService.archive(asClient(sb), { ai_lenser_id: 'a1' });
      expect(sb.rpc).toHaveBeenCalledWith('fn_archive_agent', { p_ai_lenser_id: 'a1' });
      expect(result).toEqual({ ai_lenser_id: 'a1', status: 'archived' });
    });
  });

  describe('listTools', () => {
    it('returns next_cursor when items.length === limit', async () => {
      const items = Array.from({ length: 3 }, (_, i) => ({ id: `t${i}` }));
      const sb = makeSb({ data: items });
      const result = await agentService.listTools(asClient(sb), { ai_lenser_id: 'a1', limit: 3, cursor: null });
      expect(result.next_cursor).toBe('t2');
    });

    it('returns next_cursor=null when items.length < limit', async () => {
      const sb = makeSb({ data: [{ id: 't0' }] });
      const result = await agentService.listTools(asClient(sb), { ai_lenser_id: 'a1', limit: 50, cursor: null });
      expect(result.next_cursor).toBeNull();
    });
  });

  describe('assignTool / revokeTool', () => {
    it('assign forwards all four params', async () => {
      const sb = makeSb({ data: { id: 'asg1' } });
      await agentService.assignTool(asClient(sb), { ai_lenser_id: 'a', tool_id: 't', profile_id: 'p', allowed: true });
      expect(sb.rpc).toHaveBeenCalledWith('fn_assign_tool', {
        p_ai_lenser_id: 'a', p_tool_id: 't', p_profile_id: 'p', p_allowed: true,
      });
    });

    it('revoke returns boolean from data', async () => {
      const sb = makeSb({ data: true });
      const r = await agentService.revokeTool(asClient(sb), { ai_lenser_id: 'a', tool_id: 't' });
      expect(r).toBe(true);
    });

    it('revoke returns false when data is not strictly true', async () => {
      const sb = makeSb({ data: null });
      const r = await agentService.revokeTool(asClient(sb), { ai_lenser_id: 'a', tool_id: 't' });
      expect(r).toBe(false);
    });
  });

  describe('runAction', () => {
    it('routes via .schema("agents")', async () => {
      const sb = makeSb({ data: { result: 'success' } });
      await agentService.runAction(asClient(sb), {
        ai_lenser_id: 'a',
        action_type: 'vote',
        context_type: 'battle',
        context_id: 'b1',
        metadata: { x: 1 },
      });
      expect(sb.schema).toHaveBeenCalledWith('agents');
      expect(sb.rpc).toHaveBeenCalledWith('fn_agent_action', {
        p_ai_lenser_id: 'a',
        p_action_type: 'vote',
        p_context_type: 'battle',
        p_context_id: 'b1',
        p_metadata: { x: 1 },
      });
    });
  });

  describe('startTeamRun', () => {
    it('returns team_run_id when data is a uuid string', async () => {
      const sb = makeSb({ data: 'run-1' });
      const r = await agentService.startTeamRun(asClient(sb), { ai_lenser_id: 'a', workflow_id: 'w', inputs: {}, policy: 'auto' });
      expect(r).toEqual({ team_run_id: 'run-1' });
      expect(sb.schema).toHaveBeenCalledWith('agents');
    });

    it('throws NOT_FOUND when data is null', async () => {
      const sb = makeSb({ data: null });
      await expect(
        agentService.startTeamRun(asClient(sb), { ai_lenser_id: 'a', workflow_id: 'w', inputs: {}, policy: 'auto' })
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('maps quota_exceeded to THROTTLED', async () => {
      const sb = makeSb({ error: { message: 'quota_exceeded' } });
      await expect(
        agentService.startTeamRun(asClient(sb), { ai_lenser_id: 'a', workflow_id: 'w', inputs: {}, policy: 'auto' })
      ).rejects.toMatchObject({ code: 'THROTTLED' });
    });
  });

  describe('cancelRun', () => {
    it('forwards both ids', async () => {
      const sb = makeSb({});
      await agentService.cancelRun(asClient(sb), { team_run_id: 'r1', ai_lenser_id: 'a1' });
      expect(sb.rpc).toHaveBeenCalledWith('fn_cancel_agent_run', {
        p_team_run_id: 'r1',
        p_ai_lenser_id: 'a1',
      });
    });
  });

  describe('listRunEvents', () => {
    it('forwards optional filters as null when missing', async () => {
      const sb = makeSb({ data: [] });
      await agentService.listRunEvents(asClient(sb), {
        ai_lenser_id: 'a1', run_id: null, event_type: null, limit: 100,
      });
      expect(sb.rpc).toHaveBeenCalledWith('fn_agent_run_events', {
        p_ai_lenser_id: 'a1',
        p_run_id: null,
        p_event_type: null,
        p_limit: 100,
      });
    });
  });
});
