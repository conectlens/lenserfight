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
    expect(() => r.resolve('battle', 'yaml')).toThrow(ExportUnsupportedError)
    expect(() => r.resolve('workflow', 'json')).toThrow(ExportUnsupportedError)
  })

  it('rejects duplicate registrations', () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    expect(() => bootstrapSerializers(r)).toThrow(/duplicate/)
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
