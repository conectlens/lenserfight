import { SupabaseClient } from '@supabase/supabase-js';
import { lensService } from './lens.service';
import { McpError } from './mcp-error';

function makeSb(result: { data?: unknown; error?: { message: string } | null }) {
  const rpc = jest.fn(() => Promise.resolve({ data: result.data ?? null, error: result.error ?? null }));
  return { rpc, sb: { rpc } as unknown as SupabaseClient };
}

describe('lensService', () => {
  describe('list / search / get', () => {
    it('list unpacks data.data + count', async () => {
      const { sb, rpc } = makeSb({ data: { data: [{ id: 'l1' }], count: 7 } });
      const result = await lensService.list(sb, { limit: 10, offset: 0 });
      expect(rpc).toHaveBeenCalledWith('fn_mcp_lens_list', expect.objectContaining({ p_limit: 10, p_offset: 0 }));
      expect(result).toEqual({ items: [{ id: 'l1' }], total: 7 });
    });

    it('search forwards visibility', async () => {
      const { sb, rpc } = makeSb({ data: { data: [], count: 0 } });
      await lensService.search(sb, { query: 'q', limit: 20, offset: 0, visibility: 'public' });
      expect(rpc).toHaveBeenCalledWith('fn_mcp_lens_search', expect.objectContaining({ p_query: 'q', p_visibility: 'public' }));
    });

    it('get returns null when data is null', async () => {
      const { sb } = makeSb({ data: null });
      const result = await lensService.get(sb, 'l1');
      expect(result).toBeNull();
    });

    it('maps access_denied to FORBIDDEN', async () => {
      const { sb } = makeSb({ error: { message: 'access_denied' } });
      await expect(lensService.get(sb, 'l1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('maps lens_not_found to NOT_FOUND', async () => {
      const { sb } = makeSb({ error: { message: 'lens_not_found' } });
      await expect(lensService.get(sb, 'l1')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('create / update', () => {
    it('create stringifies params', async () => {
      const { sb, rpc } = makeSb({ data: { id: 'l1' } });
      await lensService.create(sb, {
        title: 'T', template_body: 'B', visibility: 'public',
        params: [{ label: 'L', optional: false }],
      });
      expect(rpc).toHaveBeenCalledWith('fn_create_lens', expect.objectContaining({
        p_params: JSON.stringify([{ label: 'L', optional: false }]),
        p_parent_lens_id: null,
      }));
    });

    it('create forwards parent_lens_id for forks', async () => {
      const { sb, rpc } = makeSb({ data: {} });
      await lensService.create(sb, {
        title: 'T', template_body: 'B', visibility: 'public', params: [], parent_lens_id: 'src-1',
      });
      expect(rpc).toHaveBeenCalledWith('fn_create_lens', expect.objectContaining({ p_parent_lens_id: 'src-1' }));
    });

    it('update passes null when params is undefined', async () => {
      const { sb, rpc } = makeSb({ data: {} });
      await lensService.update(sb, { lens_id: 'l1' });
      expect(rpc).toHaveBeenCalledWith('fn_update_lens', expect.objectContaining({ p_params: null, p_visibility: null }));
    });
  });

  describe('archive / delete / setVisibility', () => {
    it('archive forwards lens_id', async () => {
      const { sb, rpc } = makeSb({ data: { ok: true } });
      await lensService.archive(sb, 'l1');
      expect(rpc).toHaveBeenCalledWith('fn_mcp_lens_archive', { p_lens_id: 'l1' });
    });

    it('delete throws McpError on access_denied', async () => {
      const { sb } = makeSb({ error: { message: 'access_denied' } });
      await expect(lensService.delete(sb, 'l1')).rejects.toBeInstanceOf(McpError);
    });

    it('setVisibility forwards both fields', async () => {
      const { sb, rpc } = makeSb({ data: { ok: true } });
      await lensService.setVisibility(sb, { lens_id: 'l1', visibility: 'private' });
      expect(rpc).toHaveBeenCalledWith('fn_mcp_lens_set_visibility', { p_lens_id: 'l1', p_visibility: 'private' });
    });
  });

  describe('versions / getVersion / resolveTemplate', () => {
    it('listVersions falls back to empty list when null', async () => {
      const { sb } = makeSb({ data: null });
      const result = await lensService.listVersions(sb, 'l1');
      expect(result).toEqual({ lens_id: 'l1', versions: [], count: 0 });
    });

    it('getVersion forwards version_id when supplied, null when not', async () => {
      const { sb, rpc } = makeSb({ data: {} });
      await lensService.getVersion(sb, { lens_id: 'l1', version_id: 'v1' });
      expect(rpc).toHaveBeenLastCalledWith('fn_mcp_lens_get_version', expect.objectContaining({ p_version_id: 'v1', p_semver: null }));
      await lensService.getVersion(sb, { lens_id: 'l1', semver: '1.0.0' });
      expect(rpc).toHaveBeenLastCalledWith('fn_mcp_lens_get_version', expect.objectContaining({ p_version_id: null, p_semver: '1.0.0' }));
    });

    it('resolveTemplate returns the data shape', async () => {
      const payload = { lens_id: 'l1', version_id: 'v1', template_body: 'hi', parameters: [] };
      const { sb } = makeSb({ data: payload });
      const result = await lensService.resolveTemplate(sb, { lens_id: 'l1' });
      expect(result).toEqual(payload);
    });
  });
});
