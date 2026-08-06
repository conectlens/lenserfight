import { SupabaseClient } from '@supabase/supabase-js';

import { McpError } from './mcp-error';
import { threadService } from './thread.service';

function makeSb(results: Array<{ data?: unknown; error?: { message: string } | null }>) {
  const rpc = jest.fn();
  for (const r of results) {
    rpc.mockImplementationOnce(() => Promise.resolve({ data: r.data ?? null, error: r.error ?? null }));
  }
  return { rpc, sb: { rpc } as unknown as SupabaseClient };
}

describe('threadService', () => {
  describe('create', () => {
    it('forwards title/content/visibility/tag_ids and wraps the returned id', async () => {
      const { sb, rpc } = makeSb([{ data: 'thread-1' }]);
      const result = await threadService.create(sb, {
        title: 'T',
        content: 'C',
        visibility: 'public',
        tag_ids: ['tag-1'],
      });
      expect(rpc).toHaveBeenCalledWith('fn_content_create_thread', {
        p_title: 'T',
        p_content: 'C',
        p_visibility: 'public',
        p_tag_ids: ['tag-1'],
      });
      expect(result).toEqual({ id: 'thread-1' });
    });

    it('maps an unauthenticated RPC error to UNAUTHENTICATED', async () => {
      const { sb } = makeSb([{ error: { message: 'Unauthenticated or no active lenser profile' } }]);
      await expect(
        threadService.create(sb, { title: 'T', content: 'C', visibility: 'public', tag_ids: [] })
      ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    });

    it('throws DB_ERROR when the RPC returns no id', async () => {
      const { sb } = makeSb([{ data: null }]);
      await expect(
        threadService.create(sb, { title: 'T', content: 'C', visibility: 'public', tag_ids: [] })
      ).rejects.toBeInstanceOf(McpError);
    });
  });

  describe('listMine', () => {
    it('returns the rows array', async () => {
      const { sb, rpc } = makeSb([{ data: [{ id: 't1' }, { id: 't2' }] }]);
      const result = await threadService.listMine(sb, { limit: 20, offset: 0 });
      expect(rpc).toHaveBeenCalledWith('fn_content_get_personal_threads', { p_limit: 20, p_offset: 0 });
      expect(result).toEqual([{ id: 't1' }, { id: 't2' }]);
    });

    it('falls back to an empty array when data is null', async () => {
      const { sb } = makeSb([{ data: null }]);
      const result = await threadService.listMine(sb, { limit: 20, offset: 0 });
      expect(result).toEqual([]);
    });
  });

  describe('get', () => {
    it('returns null when the owner row is not found', async () => {
      const { sb } = makeSb([{ data: null }]);
      const result = await threadService.get(sb, 't1');
      expect(result).toBeNull();
    });

    it('hydrates the row with its original translation', async () => {
      const { sb, rpc } = makeSb([
        { data: { lenser_id: 'l1', visibility: 'private' } },
        { data: [{ title: 'Hello', content: 'World' }] },
      ]);
      const result = await threadService.get(sb, 't1');
      expect(rpc).toHaveBeenNthCalledWith(1, 'fn_get_thread_by_id_private', { p_thread_id: 't1' });
      expect(rpc).toHaveBeenNthCalledWith(2, 'fn_get_entity_translation', {
        p_entity_type: 'thread',
        p_entity_id: 't1',
      });
      expect(result).toEqual({ lenser_id: 'l1', visibility: 'private', id: 't1', title: 'Hello', content: 'World' });
    });
  });

  describe('update', () => {
    it('rewrites title+content together, filling the omitted one from the existing row', async () => {
      const { sb, rpc } = makeSb([
        { data: { lenser_id: 'l1' } }, // fn_get_thread_by_id_private (via getThreadDetail)
        { data: [{ title: 'Old title', content: 'Old content' }] }, // fn_get_entity_translation
        { data: null }, // fn_update_thread_translation
      ]);
      await threadService.update(sb, { thread_id: 't1', content: 'New content' });
      expect(rpc).toHaveBeenNthCalledWith(3, 'fn_update_thread_translation', {
        p_thread_id: 't1',
        p_title: 'Old title',
        p_content: 'New content',
      });
    });

    it('throws NOT_FOUND when the thread is not owned by the caller', async () => {
      const { sb } = makeSb([{ data: null }]);
      await expect(threadService.update(sb, { thread_id: 't1', title: 'X' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('updates visibility independently without touching the translation', async () => {
      const { sb, rpc } = makeSb([{ data: null }]);
      await threadService.update(sb, { thread_id: 't1', visibility: 'private' });
      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledWith('fn_update_thread_visibility', {
        p_thread_id: 't1',
        p_visibility: 'private',
      });
    });
  });

  describe('delete', () => {
    it('forwards thread_id', async () => {
      const { sb, rpc } = makeSb([{ data: null }]);
      await threadService.delete(sb, 't1');
      expect(rpc).toHaveBeenCalledWith('fn_delete_thread', { p_thread_id: 't1' });
    });

    it('throws DB_ERROR on RPC failure', async () => {
      const { sb } = makeSb([{ error: { message: 'boom' } }]);
      await expect(threadService.delete(sb, 't1')).rejects.toBeInstanceOf(McpError);
    });
  });
});
