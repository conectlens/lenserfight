import { SupabaseClient } from '@supabase/supabase-js';
import { McpError } from './mcp-error.js';

type RpcResult<T> = { data: T | null; error: { message: string } | null };

export interface ListWorkflowsArgs {
  limit: number;
  offset: number;
  status?: string | null;
  lenser_id?: string | null;
}
export interface PagedResult { items: unknown[]; total: number }

export interface CreateWorkflowArgs {
  lenser_id: string;
  title: string;
  description: string | null;
  visibility: string;
}

export interface StartRunArgs {
  workflow_id: string;
  inputs: Record<string, unknown>;
  global_model_id: string | null;
  idempotency_key: string | null;
  metadata: Record<string, unknown>;
}

function mapError(message: string | undefined): McpError | null {
  if (!message) return null;
  if (message.includes('access_denied')) return new McpError('FORBIDDEN', 'You do not have access to this workflow');
  if (message.includes('workflow_not_found')) return new McpError('NOT_FOUND', 'Workflow not found');
  if (message.includes('run_not_found')) return new McpError('NOT_FOUND', 'Workflow run not found');
  return null;
}

export const workflowService = {
  async list(sb: SupabaseClient, args: ListWorkflowsArgs): Promise<PagedResult> {
    const { data, error } = (await sb.rpc('fn_mcp_workflow_list' as never, {
      p_limit: args.limit,
      p_offset: args.offset,
      p_status: args.status ?? null,
      p_lenser_id: args.lenser_id ?? null,
    })) as unknown as RpcResult<{ data: unknown[]; count: number }>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return { items: data?.data ?? [], total: data?.count ?? 0 };
  },

  async get(sb: SupabaseClient, workflow_id: string): Promise<unknown | null> {
    const { data, error } = (await sb.rpc('fn_mcp_workflow_get' as never, {
      p_workflow_id: workflow_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data ?? null;
  },

  async create(sb: SupabaseClient, args: CreateWorkflowArgs): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_mcp_workflow_create' as never, {
      p_lenser_id: args.lenser_id,
      p_title: args.title,
      p_description: args.description,
      p_visibility: args.visibility,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async startRun(sb: SupabaseClient, args: StartRunArgs): Promise<{ id: string } | null> {
    const { data, error } = (await sb.rpc('fn_mcp_workflow_run_start' as never, {
      p_workflow_id: args.workflow_id,
      p_inputs: args.inputs,
      p_global_model_id: args.global_model_id,
      p_idempotency_key: args.idempotency_key,
      p_metadata: args.metadata,
    })) as unknown as RpcResult<{ id: string }>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async runStatus(sb: SupabaseClient, run_id: string): Promise<unknown | null> {
    const { data, error } = (await sb.rpc('fn_mcp_workflow_run_status' as never, {
      p_run_id: run_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data ?? null;
  },

  async runLogs(sb: SupabaseClient, run_id: string): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_mcp_workflow_run_logs' as never, {
      p_run_id: run_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data ?? { run: null, node_results: [] };
  },

  async retry(sb: SupabaseClient, run_id: string): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_mcp_workflow_retry' as never, {
      p_run_id: run_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async summarize(sb: SupabaseClient, run_id: string): Promise<unknown | null> {
    const { data, error } = (await sb.rpc('fn_mcp_workflow_summarize' as never, {
      p_run_id: run_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data ?? null;
  },
};
