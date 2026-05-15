import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import type { ExportRequest } from '@lenserfight/domain/exports'

import { CloudDownloadTransport } from './CloudDownloadTransport'
import { LocalDownloadTransport } from './LocalDownloadTransport'

// ── DOM stubs ─────────────────────────────────────────────────────────────────
// jsdom doesn't actually navigate on anchor.click(). We spy on the prototype
// to assert the download was triggered, and stub URL.createObjectURL /
// revokeObjectURL since jsdom's implementations are minimal.

let aClick: ReturnType<typeof vi.spyOn>

afterEach(() => {
  vi.restoreAllMocks()
})

beforeEach(() => {
  aClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

  if (typeof URL.createObjectURL !== 'function') {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:mock-url'),
    })
  } else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  }
})

const payload = {
  envelope: { checksum: 'abc' },
  serialized: '# hello\n',
  filename: 'lens-x--y--z.md',
}

const req: ExportRequest = { kind: 'lens', slug: 'lens-x', format: 'markdown' }

// ── CloudDownloadTransport ────────────────────────────────────────────────────

describe('CloudDownloadTransport', () => {
  // REGRESSION: previously called this.repo.enqueue() which hit the
  // exports-build Supabase edge function and threw
  // "exports-build failed: Edge Function returned a non-2xx status code".
  // Industry-standard pattern is pure client-side Blob + <a download>.
  it('does NOT make any network request — pure client-side download', async () => {
    const fetchSpy = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).fetch = fetchSpy

    const transport = new CloudDownloadTransport()
    await transport.deliver([payload], req)

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('triggers a browser <a download> click', async () => {
    const transport = new CloudDownloadTransport()
    await transport.deliver([payload], req)
    expect(aClick).toHaveBeenCalledTimes(1)
  })

  it('returns artifact metadata with sha256 and bytes', async () => {
    const transport = new CloudDownloadTransport()
    const result = await transport.deliver([payload], req)

    expect(result.transport).toBe('cloud-download')
    expect(result.artifacts).toHaveLength(1)
    expect(result.artifacts[0].filename).toBe(payload.filename)
    expect(result.artifacts[0].sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(result.artifacts[0].bytes).toBe(
      new TextEncoder().encode(payload.serialized).byteLength,
    )
    expect(result.artifacts[0].location).toBe(`download:${payload.filename}`)
  })

  // Backward compatibility: existing callers pass a SupabaseExportsRepository.
  // The constructor must accept (and ignore) it without throwing.
  it('accepts the optional legacy repo arg without throwing', () => {
    expect(() => new CloudDownloadTransport()).not.toThrow()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => new CloudDownloadTransport({ enqueue: vi.fn() } as any)).not.toThrow()
  })

  it('exposes correct capabilities for all runtime modes', () => {
    const caps = new CloudDownloadTransport().capabilities()
    expect(caps.availableIn).toEqual(
      expect.arrayContaining(['cloud', 'localhost-browser', 'localhost-desktop']),
    )
    // Capability copy should describe a client-side save, not a server round-trip.
    expect(caps.description.toLowerCase()).toContain('client-side')
    expect(caps.description.toLowerCase()).not.toContain('edge function')
  })

  it('handles multiple payloads in one delivery', async () => {
    const transport = new CloudDownloadTransport()
    const result = await transport.deliver([payload, { ...payload, filename: 'b.md' }], req)
    expect(result.artifacts).toHaveLength(2)
    expect(aClick).toHaveBeenCalledTimes(2)
  })
})

// ── LocalDownloadTransport ────────────────────────────────────────────────────

describe('LocalDownloadTransport', () => {
  it('triggers a browser <a download> click', async () => {
    const transport = new LocalDownloadTransport()
    await transport.deliver([payload])
    expect(aClick).toHaveBeenCalledTimes(1)
  })

  it('does not make any network request', async () => {
    const fetchSpy = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).fetch = fetchSpy

    const transport = new LocalDownloadTransport()
    await transport.deliver([payload])

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns artifact metadata with sha256 and bytes', async () => {
    const transport = new LocalDownloadTransport()
    const result = await transport.deliver([payload])

    expect(result.transport).toBe('local-download')
    expect(result.artifacts[0].sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(result.artifacts[0].location).toBe(`download:${payload.filename}`)
  })
})

// ── Parity check ──────────────────────────────────────────────────────────────

describe('Cloud and Local download parity', () => {
  // After the fix the two transports differ only in the id/label visible
  // to the user. Both must produce the same sha256 for the same input.
  it('produces identical artifact checksums for identical serialized input', async () => {
    const cloud = new CloudDownloadTransport()
    const local = new LocalDownloadTransport()
    const cloudResult = await cloud.deliver([payload], req)
    const localResult = await local.deliver([payload])
    expect(cloudResult.artifacts[0].sha256).toBe(localResult.artifacts[0].sha256)
    expect(cloudResult.artifacts[0].bytes).toBe(localResult.artifacts[0].bytes)
  })
})
