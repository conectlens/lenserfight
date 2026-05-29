import { SupabaseClient } from '@supabase/supabase-js';
import { McpError } from './mcp-error.js';

type Row = Record<string, unknown>;
type RpcResult<T> = { data: T | null; error: { message: string } | null };

export interface ListAgentsArgs { owner_lenser_id: string }
export interface ListAgentsResult { items: unknown[]; total: number }

export interface ListAgentToolsArgs { ai_lenser_id: string; limit: number; cursor: string | null }
export interface ListAgentToolsResult { items: Row[]; total: number; next_cursor: string | null }

export interface CreateAiLenserArgs {
  owner_lenser_id: string;
  handle: string;
  display_name: string;
  ai_model_id: string | null;
}

export interface UpdateAiLenserArgs { ai_lenser_id: string; patch: Record<string, unknown> }
export interface AssignToolArgs { ai_lenser_id: string; tool_id: string; profile_id: string | null; allowed: boolean }
export interface RevokeToolArgs { ai_lenser_id: string; tool_id: string }
export interface ArchiveAiLenserArgs { ai_lenser_id: string }
export interface CancelAgentRunArgs { team_run_id: string; ai_lenser_id: string }

export interface RunAgentActionArgs {
  ai_lenser_id: string;
  action_type: string;
  context_type: string | null;
  context_id: string | null;
  metadata: Record<string, unknown>;
}

export interface StartTeamRunArgs {
  ai_lenser_id: string;
  workflow_id: string;
  inputs: Record<string, unknown>;
  policy: 'auto' | 'manual';
}

export interface ListRunEventsArgs {
  ai_lenser_id: string;
  run_id: string | null;
  event_type: string | null;
  limit: number;
}

/**
 * Translate known RPC error fragments to typed McpError codes.
 * Returns null when the message has no known mapping.
 */
function mapKnownError(message: string | undefined): McpError | null {
  if (!message) return null;
  if (message.includes('access_denied')) return new McpError('FORBIDDEN', 'You do not own this AI Lenser');
  if (message.includes('handle_taken')) return new McpError('CONFLICT', 'Handle is already in use');
  if (message.includes('quota_exceeded')) return new McpError('THROTTLED', 'Daily team-run quota exceeded for this AI Lenser');
  if (message.includes('not_found')) return new McpError('NOT_FOUND', 'Resource not found');
  if (message.includes('owner_must_be_active_human_lenser')) return new McpError('FORBIDDEN', 'The owner lenser must be an active human profile. Call get_me to verify your identity.');
  return null;
}

export const agentService = {
  async list(sb: SupabaseClient, args: ListAgentsArgs): Promise<ListAgentsResult> {
    const { data, error } = (await sb.rpc('fn_list_agents_by_owner' as never, {
      p_owner_lenser_id: args.owner_lenser_id,
    })) as unknown as RpcResult<unknown[]>;
    if (error) throw mapKnownError(error.message) ?? new McpError('DB_ERROR', error.message);
    const items = data ?? [];
    return { items, total: items.length };
  },

  async get(sb: SupabaseClient, ai_lenser_id: string): Promise<unknown | null> {
    const { data, error } = (await sb.rpc('fn_get_agent_profile' as never, {
      p_ai_lenser_id: ai_lenser_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapKnownError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data ?? null;
  },

  async create(sb: SupabaseClient, args: CreateAiLenserArgs): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_create_ai_lenser' as never, {
      p_owner_lenser_id: args.owner_lenser_id,
      p_handle: args.handle,
      p_display_name: args.display_name,
      p_ai_model_id: args.ai_model_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapKnownError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async update(sb: SupabaseClient, args: UpdateAiLenserArgs): Promise<{ patched_keys: string[] }> {
    const { error } = (await sb.rpc('fn_update_agent_profile' as never, {
      p_ai_lenser_id: args.ai_lenser_id,
      p_patch: args.patch,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapKnownError(error.message) ?? new McpError('DB_ERROR', error.message);
    return { patched_keys: Object.keys(args.patch) };
  },

  async archive(sb: SupabaseClient, args: ArchiveAiLenserArgs): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_archive_agent' as never, {
      p_ai_lenser_id: args.ai_lenser_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapKnownError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data ?? { ai_lenser_id: args.ai_lenser_id, status: 'archived' };
  },

  async listTools(sb: SupabaseClient, args: ListAgentToolsArgs): Promise<ListAgentToolsResult> {
    const { data, error } = (await sb.rpc('fn_list_agent_tools' as never, {
      p_ai_lenser_id: args.ai_lenser_id,
      p_limit: args.limit,
      p_cursor: args.cursor,
    })) as unknown as RpcResult<Row[]>;
    if (error) throw mapKnownError(error.message) ?? new McpError('DB_ERROR', error.message);
    const items = data ?? [];
    const last = items[items.length - 1];
    const next_cursor =
      items.length === args.limit && last && typeof last === 'object' && 'id' in last
        ? (last['id'] as string)
        : null;
    return { items, total: items.length, next_cursor };
  },

  async assignTool(sb: SupabaseClient, args: AssignToolArgs): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_assign_tool' as never, {
      p_ai_lenser_id: args.ai_lenser_id,
      p_tool_id: args.tool_id,
      p_profile_id: args.profile_id,
      p_allowed: args.allowed,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapKnownError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async revokeTool(sb: SupabaseClient, args: RevokeToolArgs): Promise<boolean> {
    const { data, error } = (await sb.rpc('fn_revoke_tool' as never, {
      p_ai_lenser_id: args.ai_lenser_id,
      p_tool_id: args.tool_id,
    })) as unknown as RpcResult<boolean>;
    if (error) throw mapKnownError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data === true;
  },

  async runAction(sb: SupabaseClient, args: RunAgentActionArgs): Promise<unknown> {
    const { data, error } = (await sb
      .schema('agents' as never)
      .rpc('fn_agent_action' as never, {
        p_ai_lenser_id: args.ai_lenser_id,
        p_action_type: args.action_type,
        p_context_type: args.context_type,
        p_context_id: args.context_id,
        p_metadata: args.metadata,
      })) as unknown as RpcResult<unknown>;
    if (error) throw mapKnownError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async startTeamRun(sb: SupabaseClient, args: StartTeamRunArgs): Promise<{ team_run_id: string }> {
    const { data, error } = (await sb
      .schema('agents' as never)
      .rpc('fn_start_team_run' as never, {
        p_ai_lenser_id: args.ai_lenser_id,
        p_workflow_id: args.workflow_id,
        p_inputs: args.inputs,
        p_policy: args.policy,
      })) as unknown as RpcResult<string>;
    if (error) throw mapKnownError(error.message) ?? new McpError('DB_ERROR', error.message);
    if (!data) throw new McpError('NOT_FOUND', 'Failed to start team run — agent or workflow missing');
    return { team_run_id: data };
  },

  async cancelRun(sb: SupabaseClient, args: CancelAgentRunArgs): Promise<void> {
    const { error } = (await sb.rpc('fn_cancel_agent_run' as never, {
      p_team_run_id: args.team_run_id,
      p_ai_lenser_id: args.ai_lenser_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapKnownError(error.message) ?? new McpError('DB_ERROR', error.message);
  },

  async listRunEvents(sb: SupabaseClient, args: ListRunEventsArgs): Promise<{ items: unknown[]; total: number }> {
    const { data, error } = (await sb.rpc('fn_agent_run_events' as never, {
      p_ai_lenser_id: args.ai_lenser_id,
      p_run_id: args.run_id,
      p_event_type: args.event_type,
      p_limit: args.limit,
    })) as unknown as RpcResult<unknown[]>;
    if (error) throw mapKnownError(error.message) ?? new McpError('DB_ERROR', error.message);
    const items = data ?? [];
    return { items, total: items.length };
  },
};
