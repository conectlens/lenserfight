import { describe, expect, it } from 'vitest'

import { ExportOrchestrator } from './ExportOrchestrator'
import { MemoryTransport } from './MemoryTransport'

import type { ExportContext, ExportRequest } from '../types'
import type { SerializerRegistryPort } from './ExportOrchestrator'

const fakeSerializer = {
  serialize: async (envelope: { data: unknown }) => JSON.stringify(envelope.data),
  validate: async () => ({ ok: true, issues: [] }),
}

const fakeRegistry: SerializerRegistryPort = {
  resolve: () => fakeSerializer,
}

const payload = { id: 'lens-1', title: 'Market Brief' }
const request: ExportRequest = { kind: 'lens', slug: 'lens-1', format: 'json' }

function ctxFor(via: ExportContext['via'], host: string): ExportContext {
  return {
    userId: 'user-1',
    tenantId: null,
    via,
    host,
    isOwner: true,
    isAuthenticated: true,
  }
}

/**
 * The CLI and MCP server each build their own ExportContext (different
 * `via`/`host`) but run identical payload data through this SAME
 * orchestrator + registry. This is the actual "single source of truth"
 * invariant the export feature promises: the checksum — computed only
 * from the (redacted) data, never from context/timestamp metadata — must
 * be identical regardless of which caller produced it.
 */
describe('ExportOrchestrator cross-caller consistency', () => {
  it('produces identical checksums for identical data via CLI-shaped and MCP-shaped contexts', async () => {
    const orchestrator = new ExportOrchestrator(fakeRegistry)

    const cliTransport = new MemoryTransport()
    await orchestrator.run({
      request,
      ctx: ctxFor('cli', 'cli'),
      fetchPayload: async () => payload,
      transport: cliTransport,
      title: payload.title,
    })

    const mcpTransport = new MemoryTransport()
    await orchestrator.run({
      request,
      ctx: ctxFor('api', 'mcp'),
      fetchPayload: async () => payload,
      transport: mcpTransport,
      title: payload.title,
    })

    const cliEnvelope = cliTransport.captured[0]?.envelope
    const mcpEnvelope = mcpTransport.captured[0]?.envelope

    expect(cliEnvelope?.checksum).toBeDefined()
    expect(cliEnvelope?.checksum).toBe(mcpEnvelope?.checksum)
    expect(cliEnvelope?.data).toEqual(mcpEnvelope?.data)
    // Context metadata legitimately differs — that's the caller's identity, not the data.
    expect(cliEnvelope?.generatedBy.via).toBe('cli')
    expect(mcpEnvelope?.generatedBy.via).toBe('api')
  })
})
