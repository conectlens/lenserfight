import { describe, it, expect, beforeEach } from 'vitest'

import {
  ExportEnvelopeFactory,
  ExportUnsupportedError,
  type ExportContext,
} from '@lenserfight/domain/exports'

import { bootstrapSerializers, __resetBootstrapForTests } from './bootstrap'
import { SerializerRegistry, __resetRegistryForTests } from './SerializerRegistry'

const owner: ExportContext = {
  userId: 'u1',
  tenantId: 't1',
  via: 'web',
  host: 'lenserfight.local',
  isOwner: true,
  isAuthenticated: true,
}

const anon: ExportContext = {
  userId: null,
  tenantId: null,
  via: 'web',
  host: 'lenserfight.local',
  isOwner: false,
  isAuthenticated: false,
}

beforeEach(() => {
  __resetRegistryForTests()
  __resetBootstrapForTests()
})

describe('SerializerRegistry', () => {
  it('resolves registered (kind, format) pair', () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    expect(r.supports('battle', 'json')).toBe(true)
    expect(r.supports('battle', 'markdown')).toBe(true)
    expect(r.supports('lens', 'json')).toBe(true)
  })

  it('throws ExportUnsupportedError for unregistered pair', () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    expect(() => r.resolve('agent', 'json')).toThrow(ExportUnsupportedError)
    expect(() => r.resolve('bundle', 'markdown')).toThrow(ExportUnsupportedError)
  })

  it('registers battle/lens/workflow × json/markdown/yaml', () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    for (const kind of ['battle', 'lens', 'workflow'] as const) {
      for (const format of ['json', 'markdown', 'yaml'] as const) {
        expect(r.supports(kind, format)).toBe(true)
      }
    }
  })

  // REGRESSION: previously bootstrap kept a module-scoped `bootstrapped`
  // flag. When Vite HMR reloaded bootstrap.ts but not SerializerRegistry.ts,
  // the flag reset while the registry singleton kept the serializers,
  // causing the next call to throw "duplicate registration for battle:json".
  // Bootstrap must now be safely callable repeatedly.
  it('is idempotent — repeated calls on the same registry do not throw', () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    expect(() => bootstrapSerializers(r)).not.toThrow()
    expect(() => bootstrapSerializers(r)).not.toThrow()
    // Adapter set is unchanged after repeated calls.
    expect(r.supports('battle', 'json')).toBe(true)
    expect(r.supports('battle', 'markdown')).toBe(true)
    expect(r.supports('lens', 'json')).toBe(true)
    expect(r.supports('lens', 'markdown')).toBe(true)
  })

  it('SerializerRegistry.register still rejects manual duplicates', () => {
    // The registry-level duplicate guard remains, protecting against
    // accidental double-registration of a single serializer.
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    // Re-registering one specific serializer directly must still throw.
    // (Use the bootstrap helper's class via a fresh instance.)
    const battleJson = r.resolve('battle', 'json')
    expect(() => r.register(battleJson)).toThrow(/duplicate/)
  })

  // Simulates the HMR scenario: bootstrap state is "lost" (imagine the
  // module reload), but the registry singleton still has the adapters.
  // Calling bootstrapSerializers again must not throw.
  it('survives HMR-style state loss (registry already populated)', () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r) // first load
    // Pretend bootstrap.ts was reloaded but the registry singleton wasn't.
    // (The fix removes any external state, so this is now trivially safe.)
    expect(() => bootstrapSerializers(r)).not.toThrow()
  })
})

describe('JSON serializer (Battle)', () => {
  it('emits canonical JSON identical for identical input', async () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    const factory = new ExportEnvelopeFactory()
    const data = { id: 'b1', slug: 'fast', title: 'Fast', tags: ['z', 'a'] }
    const e1 = await factory.build({ kind: 'battle', data, ctx: owner })
    const e2 = await factory.build({ kind: 'battle', data, ctx: owner })
    const ser = r.resolve('battle', 'json')
    const s1 = await ser.serialize(e1, { visibility: e1.visibility })
    const s2 = await ser.serialize(e2, { visibility: e2.visibility })
    // generatedAt differs, but the canonical JSON of both serialized strings
    // parses & re-canonicalizes identically modulo timestamp; we test the
    // checksum is stable instead.
    expect(e1.checksum).toBe(e2.checksum)
    // Validate output round-trips.
    const v1 = await ser.validate(s1)
    const v2 = await ser.validate(s2)
    expect(v1.ok).toBe(true)
    expect(v2.ok).toBe(true)
  })
})

describe('Markdown serializer (Battle)', () => {
  it('produces frontmatter + body + checksum footer', async () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    const factory = new ExportEnvelopeFactory()
    const env = await factory.build({
      kind: 'battle',
      data: { id: 'b1', slug: 'fast', title: 'My Battle', state: 'completed' },
      ctx: owner,
    })
    const ser = r.resolve('battle', 'markdown')
    const out = await ser.serialize(env, { visibility: env.visibility })
    expect(out.startsWith('---\n')).toBe(true)
    expect(out).toContain('schema: "lenserfight.export.v1"')
    expect(out).toMatch(/<!-- checksum: [0-9a-f]{64} -->/)
    expect(out).toContain('# My Battle')
  })

  it('escapes HTML/script in title (XSS hygiene)', async () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    const factory = new ExportEnvelopeFactory()
    const env = await factory.build({
      kind: 'battle',
      data: {
        id: 'b1',
        slug: 'evil',
        title: '<script>alert(1)</script>OK',
        description: '<img src=x onerror=alert(1)>',
      },
      ctx: owner,
    })
    const ser = r.resolve('battle', 'markdown')
    const out = await ser.serialize(env, { visibility: env.visibility })
    expect(out).not.toMatch(/<script>/i)
    expect(out).not.toMatch(/onerror=/i)
    expect(out).toContain('OK')
  })

  it('escapes YAML-breaking control chars in frontmatter strings', async () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    const factory = new ExportEnvelopeFactory()
    const env = await factory.build({
      kind: 'battle',
      // tenantId carrying a newline shouldn't break frontmatter
      data: { id: 'b1', slug: 'evil', title: 'OK' },
      ctx: { ...owner, host: 'host\nINJECTED: true' },
    })
    const ser = r.resolve('battle', 'markdown')
    const out = await ser.serialize(env, { visibility: env.visibility })
    expect(out).not.toMatch(/^INJECTED:/m)
  })

  it('renders redactions block when non-owner', async () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    const factory = new ExportEnvelopeFactory()
    const env = await factory.build({
      kind: 'battle',
      data: { id: 'b1', slug: 'x', title: 'X', apiKey: 'secret', email: 'a@b' },
      ctx: anon,
    })
    const ser = r.resolve('battle', 'markdown')
    const out = await ser.serialize(env, { visibility: env.visibility })
    expect(out).toContain('Redactions applied')
    expect(out).toContain('`apiKey`')
  })

  it('validate() rejects markdown lacking frontmatter or checksum', async () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    const ser = r.resolve('battle', 'markdown')
    const bad = await ser.validate('# title only\n')
    expect(bad.ok).toBe(false)
    expect(bad.issues.length).toBeGreaterThan(0)
  })
})
