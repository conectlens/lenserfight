import { ok, fail, paginated } from '../types';

describe('tool result envelopes', () => {
  describe('ok', () => {
    it('wraps data with success=true and meta', () => {
      const t0 = Date.now() - 50;
      const result = ok({ foo: 'bar' }, 'test_tool', t0);
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual({ foo: 'bar' });
      expect(parsed.meta.tool).toBe('test_tool');
      expect(parsed.meta.elapsed_ms).toBeGreaterThanOrEqual(50);
      expect(parsed.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('returns content as MCP text part', () => {
      const result = ok({}, 'x', Date.now());
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('fail', () => {
    it('wraps error with success=false and code/message/details', () => {
      const result = fail('NOT_FOUND', 'gone', { id: 'x' }, 'test_tool', Date.now());
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.success).toBe(false);
      expect(parsed.error.code).toBe('NOT_FOUND');
      expect(parsed.error.message).toBe('gone');
      expect(parsed.error.details).toEqual({ id: 'x' });
      expect(parsed.meta.tool).toBe('test_tool');
    });
  });

  describe('paginated', () => {
    it('wraps items with total/limit/offset/has_more', () => {
      const result = paginated([1, 2, 3], 25, 3, 0, 'list_tool', Date.now());
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.success).toBe(true);
      expect(parsed.data.items).toEqual([1, 2, 3]);
      expect(parsed.data.total).toBe(25);
      expect(parsed.data.limit).toBe(3);
      expect(parsed.data.offset).toBe(0);
      expect(parsed.data.has_more).toBe(true);
    });

    it('has_more=false when offset+items.length >= total', () => {
      const result = paginated([1, 2], 4, 2, 2, 'list_tool', Date.now());
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data.has_more).toBe(false);
    });

    it('handles empty page', () => {
      const result = paginated([], 0, 20, 0, 'list_tool', Date.now());
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data.items).toEqual([]);
      expect(parsed.data.has_more).toBe(false);
    });
  });
});
