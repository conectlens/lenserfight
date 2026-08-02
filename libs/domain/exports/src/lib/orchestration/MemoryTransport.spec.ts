import { describe, expect, it } from 'vitest'

import type { ExportEnvelope, ExportRequest } from '../types'

import { MemoryTransport } from './MemoryTransport'

const envelope = { checksum: 'abc' } as ExportEnvelope<unknown>
const payload = { envelope, serialized: '# hello\n', filename: 'lens-x--y--z.md' }
const req: ExportRequest = { kind: 'lens', slug: 'lens-x', format: 'markdown' }

describe('MemoryTransport', () => {
  it('captures delivered payloads without any side effect', async () => {
    const transport = new MemoryTransport()
    await transport.deliver([payload], req)
    expect(transport.captured).toEqual([payload])
  })

  it('returns artifact metadata with sha256 and bytes', async () => {
    const transport = new MemoryTransport()
    const result = await transport.deliver([payload], req)

    expect(result.transport).toBe('local-workspace')
    expect(result.artifacts).toHaveLength(1)
    expect(result.artifacts[0].filename).toBe(payload.filename)
    expect(result.artifacts[0].sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(result.artifacts[0].bytes).toBe(
      new TextEncoder().encode(payload.serialized).byteLength,
    )
    expect(result.artifacts[0].location).toBe('memory')
  })

  it('handles multiple payloads in one delivery', async () => {
    const transport = new MemoryTransport()
    const result = await transport.deliver([payload, { ...payload, filename: 'b.md' }], req)
    expect(result.artifacts).toHaveLength(2)
    expect(transport.captured).toHaveLength(2)
  })

  it('accumulates captures across multiple deliver() calls', async () => {
    const transport = new MemoryTransport()
    await transport.deliver([payload], req)
    await transport.deliver([{ ...payload, filename: 'b.md' }], req)
    expect(transport.captured).toHaveLength(2)
  })
})
