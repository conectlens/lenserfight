import { SupabaseClient } from '@supabase/supabase-js';
import { McpError } from './mcp-error.js';

type RpcResult<T> = { data: T | null; error: { message: string } | null };

export interface ListBattlesArgs {
  limit: number;
  offset: number;
  status?: string | null;
  battle_type?: string | null;
  creator_lenser_id?: string | null;
}
export interface PagedResult { items: unknown[]; total: number }

export interface CreateBattleArgs {
  title: string;
  slug: string;
  task_prompt: string;
  rubric_id: string | null;
}

export interface UpdateBattleConfigArgs {
  battle_id: string;
  battle_type: string | null;
  judging_mode: string | null;
  max_contenders: number | null;
  ai_judge_model_key: string | null;
}

export interface AddContenderArgs {
  battle_id: string;
  display_name: string;
  contender_type: string;
  contender_ref_id: string;
  slot: string | null;
}

export interface SubmitRunArgs {
  battle_id: string;
  contender_id: string;
  content_text: string;
}

export interface SetStatusArgs { battle_id: string; status: string }

export interface ListHistoryArgs {
  lenser_id: string | null;
  limit: number;
  offset: number;
  status?: string | null;
}

function mapError(message: string | undefined): McpError | null {
  if (!message) return null;
  if (message.includes('slots_full')) return new McpError('SLOTS_FULL', 'All 26 contender slots are taken');
  if (message.includes('access_denied')) return new McpError('FORBIDDEN', 'You do not own this battle');
  if (message.includes('battle_not_found')) return new McpError('NOT_FOUND', 'Battle not found');
  if (message.includes('invalid_status_transition') || message.includes('transition'))
    return new McpError('INVALID_TRANSITION', message);
  return null;
}

export const battleService = {
  async list(sb: SupabaseClient, args: ListBattlesArgs): Promise<PagedResult> {
    const { data, error } = (await sb.rpc('fn_mcp_battle_list' as never, {
      p_limit: args.limit,
      p_offset: args.offset,
      p_status: args.status ?? null,
      p_battle_type: args.battle_type ?? null,
      p_creator_lenser_id: args.creator_lenser_id ?? null,
    })) as unknown as RpcResult<{ data: unknown[]; count: number }>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return { items: data?.data ?? [], total: data?.count ?? 0 };
  },

  async get(sb: SupabaseClient, battle_id: string): Promise<unknown | null> {
    const { data, error } = (await sb.rpc('fn_mcp_battle_get' as never, {
      p_battle_id: battle_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data ?? null;
  },

  async create(sb: SupabaseClient, args: CreateBattleArgs): Promise<string> {
    const { data, error } = (await sb.rpc('fn_battles_create' as never, {
      p_title: args.title,
      p_slug: args.slug,
      p_task_prompt: args.task_prompt,
      p_rubric_id: args.rubric_id,
    })) as unknown as RpcResult<string>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    if (!data) throw new McpError('DB_ERROR', 'No battle ID returned');
    return data;
  },

  async updateConfig(sb: SupabaseClient, args: UpdateBattleConfigArgs): Promise<void> {
    const { error } = (await sb.rpc('fn_mcp_battle_update_config' as never, {
      p_battle_id: args.battle_id,
      p_battle_type: args.battle_type,
      p_judging_mode: args.judging_mode,
      p_max_contenders: args.max_contenders,
      p_ai_judge_model_key: args.ai_judge_model_key,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
  },

  async addContender(sb: SupabaseClient, args: AddContenderArgs): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_mcp_battle_add_contender' as never, {
      p_battle_id: args.battle_id,
      p_display_name: args.display_name,
      p_contender_type: args.contender_type,
      p_contender_ref_id: args.contender_ref_id,
      p_slot: args.slot,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async submitRun(sb: SupabaseClient, args: SubmitRunArgs): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_battles_submit' as never, {
      p_battle_id: args.battle_id,
      p_contender_id: args.contender_id,
      p_content_text: args.content_text,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data ?? { submitted: true };
  },

  async score(sb: SupabaseClient, battle_id: string): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_mcp_battle_score' as never, {
      p_battle_id: battle_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async setStatus(sb: SupabaseClient, args: SetStatusArgs): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_mcp_battle_set_status' as never, {
      p_battle_id: args.battle_id,
      p_status: args.status,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async history(sb: SupabaseClient, args: ListHistoryArgs): Promise<PagedResult> {
    const { data, error } = (await sb.rpc('fn_mcp_battle_history' as never, {
      p_lenser_id: args.lenser_id,
      p_limit: args.limit,
      p_offset: args.offset,
      p_status: args.status ?? null,
    })) as unknown as RpcResult<{ data: unknown[]; count: number }>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return { items: data?.data ?? [], total: data?.count ?? 0 };
  },
};
