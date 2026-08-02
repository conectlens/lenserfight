import { describe, expect, it, vi } from 'vitest'

import { composeLensPayload } from './lens.compose'

import type { RpcCaller } from './rpc-caller'

describe('composeLensPayload', () => {
  it('maps fn_mcp_lens_get into a LensExportPayload, using id as slug', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue({
      id: 'lens-1',
      title: 'Market Brief',
      content: 'fallback content',
      head_version: {
        semver: '1.2.0',
        template_body: 'Produce a brief for [[topic]].',
        parameters: [
          { label: 'topic', optional: false },
          { label: 'context', optional: true },
        ],
      },
      tags: [{ slug: 'research' }, { slug: 'market' }],
    })

    const payload = await composeLensPayload(rpc, 'lens-1')

    expect(rpc).toHaveBeenCalledWith('fn_mcp_lens_get', { p_lens_id: 'lens-1' })
    expect(payload).toEqual({
      id: 'lens-1',
      slug: 'lens-1',
      title: 'Market Brief',
      body: 'Produce a brief for [[topic]].',
      version: '1.2.0',
      tags: ['research', 'market'],
      parameters: [
        { label: 'topic', type: 'string', required: true },
        { label: 'context', type: 'string', required: false },
      ],
    })
  })

  it('falls back to content when there is no head version', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue({
      id: 'lens-2',
      title: 'Draft',
      content: 'raw body',
      head_version: null,
      tags: [],
    })

    const payload = await composeLensPayload(rpc, 'lens-2')

    expect(payload.body).toBe('raw body')
    expect(payload.version).toBeNull()
    expect(payload.parameters).toEqual([])
  })

  it('throws when the lens does not exist', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue(null)
    await expect(composeLensPayload(rpc, 'missing')).rejects.toThrow('Lens not found: missing')
  })
})
