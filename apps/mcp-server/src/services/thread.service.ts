import { SupabaseClient } from '@supabase/supabase-js';

import { McpError } from './mcp-error.js';

type RpcResult<T> = { data: T | null; error: { message: string } | null };

export interface CreateThreadArgs {
  title: string;
  content: string;
  visibility: string;
  tag_ids: string[];
}

export interface ListMyThreadsArgs {
  limit: number;
  offset: number;
}

export interface UpdateThreadArgs {
  thread_id: string;
  title?: string | null;
  content?: string | null;
  visibility?: string | null;
}

export interface ThreadDetail extends Record<string, unknown> {
  id: string;
  title: string | null;
  content: string | null;
}

function mapError(message: string | undefined): McpError | null {
  if (!message) return null;
  if (message.includes('Unauthenticated')) {
    return new McpError(
      'UNAUTHENTICATED',
      'You must be signed in with a lenser profile to manage threads'
    );
  }
  return null;
}

/** Owner-only lookup: raw thread row (`fn_get_thread_by_id_private`) hydrated with its
 * original translation (`fn_get_entity_translation`). Both RPCs are pre-existing and
 * already scope to the caller via `lensers.get_auth_lenser_id()`. */
async function getThreadDetail(sb: SupabaseClient, thread_id: string): Promise<ThreadDetail | null> {
  const { data: row, error } = (await sb.rpc('fn_get_thread_by_id_private' as never, {
    p_thread_id: thread_id,
  })) as unknown as RpcResult<Record<string, unknown>>;
  if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
  if (!row) return null;

  const { data: translations, error: tError } = (await sb.rpc('fn_get_entity_translation' as never, {
    p_entity_type: 'thread',
    p_entity_id: thread_id,
  })) as unknown as RpcResult<Array<{ title: string; content: string }>>;
  if (tError) throw mapError(tError.message) ?? new McpError('DB_ERROR', tError.message);

  const translation = translations?.[0];
  return { ...row, id: thread_id, title: translation?.title ?? null, content: translation?.content ?? null };
}

export const threadService = {
  async create(sb: SupabaseClient, args: CreateThreadArgs): Promise<{ id: string }> {
    const { data, error } = (await sb.rpc('fn_content_create_thread' as never, {
      p_title: args.title,
      p_content: args.content,
      p_visibility: args.visibility,
      p_tag_ids: args.tag_ids,
    })) as unknown as RpcResult<string>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    if (!data) throw new McpError('DB_ERROR', 'Thread creation did not return an id');
    return { id: data };
  },

  async listMine(sb: SupabaseClient, args: ListMyThreadsArgs): Promise<unknown[]> {
    const { data, error } = (await sb.rpc('fn_content_get_personal_threads' as never, {
      p_limit: args.limit,
      p_offset: args.offset,
    })) as unknown as RpcResult<unknown[]>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    return data ?? [];
  },

  get: getThreadDetail,

  async update(sb: SupabaseClient, args: UpdateThreadArgs): Promise<void> {
    if (args.title != null || args.content != null) {
      const existing = await getThreadDetail(sb, args.thread_id);
      if (!existing) throw new McpError('NOT_FOUND', `Thread ${args.thread_id} not found`);
      const { error } = (await sb.rpc('fn_update_thread_translation' as never, {
        p_thread_id: args.thread_id,
        p_title: args.title ?? existing.title ?? '',
        p_content: args.content ?? existing.content ?? '',
      })) as unknown as RpcResult<unknown>;
      if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    }

    if (args.visibility != null) {
      const { error } = (await sb.rpc('fn_update_thread_visibility' as never, {
        p_thread_id: args.thread_id,
        p_visibility: args.visibility,
      })) as unknown as RpcResult<unknown>;
      if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
    }
  },

  async delete(sb: SupabaseClient, thread_id: string): Promise<void> {
    const { error } = (await sb.rpc('fn_delete_thread' as never, {
      p_thread_id: thread_id,
    })) as unknown as RpcResult<unknown>;
    if (error) throw mapError(error.message) ?? new McpError('DB_ERROR', error.message);
  },
};
