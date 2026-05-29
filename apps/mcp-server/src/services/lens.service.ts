import { SupabaseClient } from '@supabase/supabase-js';
import { McpError } from './mcp-error.js';

type RpcResult<T> = { data: T | null; error: { message: string } | null };
type Row = Record<string, unknown>;

export interface ListLensesArgs {
  limit: number;
  offset: number;
  visibility?: string | null;
  status?: string | null;
  lenser_id?: string | null;
  include_archived?: boolean;
}

export interface PagedResult { items: unknown[]; total: number }

export interface SearchLensesArgs {
  query: string;
  limit: number;
  offset: number;
  visibility?: string | null;
}

export interface CreateLensArgs {
  title: string;
  template_body: string;
  visibility: string;
  params: Array<{ label: string; optional: boolean }>;
  parent_lens_id?: string | null;
}

export interface UpdateLensArgs {
  lens_id: string;
  template_body?: string | null;
  visibility?: string | null;
  params?: Array<{ label: string; optional: boolean }> | null;
  changelog?: string | null;
}

export interface SetVisibilityArgs { lens_id: string; visibility: string }
export interface GetVersionArgs { lens_id: string; version_id?: string | null; semver?: string | null }

export interface ResolveTemplateArgs { lens_id: string; version_id?: string | null }
export interface ResolveTemplateResult {
  lens_id: string;
  version_id: string;
  template_body: string;
  parameters: Array<{ id: string; label: string; optional: boolean }>;
  title?: string | null;
  description?: string | null;
}

function mapError(message: string | undefined): McpError | null {
  if (!message) return null;
  if (message.includes('access_denied')) return new McpError('FORBIDDEN', 'You do not have access to this lens');
  if (message.includes('lens_not_found')) return new McpError('NOT_FOUND', 'Lens not found');
  return null;
}

export const lensService = {
  async list(sb: SupabaseClient, args: ListLensesArgs): Promise<PagedResult> {
    const { data, error } = (await sb.rpc('fn_mcp_lens_list' as never, {
      p_limit: args.limit,
      p_offset: args.offset,
      p_visibility: args.visibility ?? null,
      p_status: args.status ?? null,
      p_lenser_id: args.lenser_id ?? null,
      p_include_archived: args.include_archived ?? false,
    })) as unknown as RpcResult<{ data: unknown[]; count: number }>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return { items: data?.data ?? [], total: data?.count ?? 0 };
  },

  async search(sb: SupabaseClient, args: SearchLensesArgs): Promise<PagedResult> {
    const { data, error } = (await sb.rpc('fn_mcp_lens_search' as never, {
      p_query: args.query,
      p_limit: args.limit,
      p_offset: args.offset,
      p_visibility: args.visibility ?? null,
    })) as unknown as RpcResult<{ data: unknown[]; count: number }>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return { items: data?.data ?? [], total: data?.count ?? 0 };
  },

  async get(sb: SupabaseClient, lens_id: string): Promise<unknown | null> {
    const { data, error } = (await sb.rpc('fn_mcp_lens_get' as never, {
      p_lens_id: lens_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data ?? null;
  },

  async create(sb: SupabaseClient, args: CreateLensArgs): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_create_lens' as never, {
      p_title: args.title,
      p_template_body: args.template_body,
      p_visibility: args.visibility,
      p_params: JSON.stringify(args.params),
      p_parent_lens_id: args.parent_lens_id ?? null,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async update(sb: SupabaseClient, args: UpdateLensArgs): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_update_lens' as never, {
      p_lens_id: args.lens_id,
      p_template_body: args.template_body ?? null,
      p_visibility: args.visibility ?? null,
      p_params: args.params ? JSON.stringify(args.params) : null,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async archive(sb: SupabaseClient, lens_id: string): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_mcp_lens_archive' as never, {
      p_lens_id: lens_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async delete(sb: SupabaseClient, lens_id: string): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_mcp_lens_delete' as never, {
      p_lens_id: lens_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async setVisibility(sb: SupabaseClient, args: SetVisibilityArgs): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_mcp_lens_set_visibility' as never, {
      p_lens_id: args.lens_id,
      p_visibility: args.visibility,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data;
  },

  async listVersions(sb: SupabaseClient, lens_id: string): Promise<unknown> {
    const { data, error } = (await sb.rpc('fn_mcp_lens_versions' as never, {
      p_lens_id: lens_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data ?? { lens_id, versions: [], count: 0 };
  },

  async getVersion(sb: SupabaseClient, args: GetVersionArgs): Promise<unknown | null> {
    const { data, error } = (await sb.rpc('fn_mcp_lens_get_version' as never, {
      p_lens_id: args.lens_id,
      p_version_id: args.version_id ?? null,
      p_semver: args.semver ?? null,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data ?? null;
  },

  async resolveTemplate(sb: SupabaseClient, args: ResolveTemplateArgs): Promise<ResolveTemplateResult | null> {
    const { data, error } = (await sb.rpc('fn_mcp_lens_resolve_template' as never, {
      p_lens_id: args.lens_id,
      p_version_id: args.version_id ?? null,
    })) as unknown as RpcResult<ResolveTemplateResult>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data ?? null;
  },
};
