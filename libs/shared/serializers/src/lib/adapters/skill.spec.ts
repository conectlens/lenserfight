import { describe, it, expect, beforeEach } from 'vitest'

import {
  ExportEnvelopeFactory,
  type ExportContext,
} from '@lenserfight/domain/exports'

import {
  SkillJsonSerializer,
  SkillMarkdownSerializer,
  SkillYamlSerializer,
  type SkillExportPayload,
} from './skill'
import { bootstrapSerializers, __resetBootstrapForTests } from '../bootstrap'
import { SerializerRegistry, __resetRegistryForTests } from '../SerializerRegistry'

const owner: ExportContext = {
  userId: 'u1',
  tenantId: 't1',
  via: 'web',
  host: 'lenserfight.local',
  isOwner: true,
  isAuthenticated: true,
}

const payload: SkillExportPayload = {
  id: 'skill_competitor_research',
  slug: 'competitor-research',
  name: 'Competitor Research Skill',
  description: 'Repeatable method for researching competitors and building structured reports.',
  version: '0.1.0',
  tags: ['research', 'analysis'],
  activation: { keywords: ['competitor research'], requires_tools: ['web_search'] },
  purpose: 'Produce a structured competitor report.',
  whenToUse: 'When a user asks to research competitors.',
  workflow: 'Gather sources, extract facts, synthesize a report.',
}

beforeEach(() => {
  __resetRegistryForTests()
  __resetBootstrapForTests()
})

describe('Skill serializers', () => {
  it('registers skill:json, skill:yaml, skill:markdown after bootstrap', () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    expect(r.supports('skill', 'json')).toBe(true)
    expect(r.supports('skill', 'yaml')).toBe(true)
    expect(r.supports('skill', 'markdown')).toBe(true)
  })

  it('carries the correct kind/format/extension on each serializer', () => {
    expect(new SkillJsonSerializer().kind).toBe('skill')
    expect(new SkillJsonSerializer().format).toBe('json')
    expect(new SkillYamlSerializer().format).toBe('yaml')
    expect(new SkillMarkdownSerializer().format).toBe('markdown')
    expect(new SkillMarkdownSerializer().extension).toBe('md')
  })

  it('json round-trips the payload (canonical form validates)', async () => {
    const factory = new ExportEnvelopeFactory()
    const env = await factory.build({ kind: 'skill', data: payload, ctx: owner })
    const ser = new SkillJsonSerializer()
    const out = await ser.serialize(env, { visibility: env.visibility })
    const parsed = JSON.parse(out)
    expect(parsed.kind).toBe('skill')
    expect(parsed.data.name).toBe(payload.name)
    expect(parsed.data.description).toBe(payload.description)
    expect(parsed.data.activation.keywords).toEqual(['competitor research'])
    const v = await ser.validate(out)
    expect(v.ok).toBe(true)
  })

  it('yaml output validates (block style, no anchors/flow)', async () => {
    const factory = new ExportEnvelopeFactory()
    const env = await factory.build({ kind: 'skill', data: payload, ctx: owner })
    const ser = new SkillYamlSerializer()
    const out = await ser.serialize(env, { visibility: env.visibility })
    expect(out).toContain('kind: "skill"')
    expect(out).toContain('name: "Competitor Research Skill"')
    const v = await ser.validate(out)
    expect(v.ok).toBe(true)
  })

  it('markdown emits SKILL.md frontmatter (kind/name/description) and required sections', async () => {
    const factory = new ExportEnvelopeFactory()
    const env = await factory.build({ kind: 'skill', data: payload, ctx: owner })
    const ser = new SkillMarkdownSerializer()
    const out = await ser.serialize(env, { visibility: env.visibility })

    // Frontmatter block carries kind + name + description.
    const frontmatter = out.slice(0, out.indexOf('\n---\n', 4) + 5)
    expect(frontmatter.startsWith('---\n')).toBe(true)
    expect(frontmatter).toContain('kind: "skill"')
    expect(frontmatter).toContain('name: "Competitor Research Skill"')
    expect(frontmatter).toContain('description:')

    // Title (name) as H1.
    expect(out).toContain('# Competitor Research Skill')

    // Required SKILL.md sections per spec-governance.
    expect(out).toContain('## Purpose')
    expect(out).toContain('## When To Use')
    expect(out).toContain('## Workflow')

    // Checksum footer preserved by base.
    expect(out).toMatch(/<!-- checksum: [0-9a-f]{64} -->/)

    const v = await ser.validate(out)
    expect(v.ok).toBe(true)
  })

  it('resolves skill serializers through the registry end-to-end', async () => {
    const r = new SerializerRegistry()
    bootstrapSerializers(r)
    const factory = new ExportEnvelopeFactory()
    const env = await factory.build({ kind: 'skill', data: payload, ctx: owner })
    for (const format of ['json', 'yaml', 'markdown'] as const) {
      const ser = r.resolve('skill', format)
      const out = await ser.serialize(env, { visibility: env.visibility })
      expect(out.length).toBeGreaterThan(0)
      expect((await ser.validate(out)).ok).toBe(true)
    }
  })
})
