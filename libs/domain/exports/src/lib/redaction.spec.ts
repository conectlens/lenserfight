import { describe, it, expect } from 'vitest'

import { applyRedactionPolicy } from './redaction'
import type { ExportContext } from './types'

const owner: ExportContext = {
  userId: 'u1',
  tenantId: 't1',
  via: 'web',
  host: 'lenserfight.local',
  isOwner: true,
  isAuthenticated: true,
}

const authed: ExportContext = { ...owner, isOwner: false }
const anon: ExportContext = { ...owner, userId: null, isOwner: false, isAuthenticated: false }

describe('applyRedactionPolicy', () => {
  it('strips secret fields for everyone, including owner', () => {
    const payload = {
      id: 'b1',
      title: 'My Battle',
      apiKey: 'sk-live-XXXX',
      api_key: 'sk-live-YYYY',
      authorization: 'Bearer xyz',
      byok: { providerToken: 'abc' },
      secrets: { signing_secret: 'zzz' },
    }
    const result = applyRedactionPolicy(payload, owner)
    expect(result.data).not.toHaveProperty('apiKey')
    expect(result.data).not.toHaveProperty('api_key')
    expect(result.data).not.toHaveProperty('authorization')
    expect(result.data).not.toHaveProperty('byok')
    expect(result.data).not.toHaveProperty('secrets')
    expect(result.redactions).toContain('apiKey')
    expect(result.redactions).toContain('authorization')
  })

  it('strips owner-only fields for non-owners', () => {
    const payload = { id: 'b1', email: 'a@b.com', billing: { plan: 'pro' } }
    const ownerResult = applyRedactionPolicy(payload, owner)
    expect(ownerResult.data).toHaveProperty('email')
    expect(ownerResult.data).toHaveProperty('billing')

    const authResult = applyRedactionPolicy(payload, authed)
    expect(authResult.data).not.toHaveProperty('email')
    expect(authResult.data).not.toHaveProperty('billing')
    expect(authResult.redactions).toContain('email')
    expect(authResult.redactions).toContain('billing')
  })

  it('strips authenticated-only fields for anonymous viewers', () => {
    const payload = {
      id: 'b1',
      judge_prompt: 'the secret prompt',
      evaluation_rationale: 'why',
    }
    const anonResult = applyRedactionPolicy(payload, anon)
    expect(anonResult.data).not.toHaveProperty('judge_prompt')
    expect(anonResult.data).not.toHaveProperty('evaluation_rationale')

    const authResult = applyRedactionPolicy(payload, authed)
    expect(authResult.data).toHaveProperty('judge_prompt')
  })

  it('walks nested objects and arrays', () => {
    const payload = {
      items: [
        { name: 'a', apiKey: 'x' },
        { name: 'b', secret: 'y' },
      ],
    }
    const result = applyRedactionPolicy(payload, owner)
    expect((result.data.items as Array<Record<string, unknown>>)[0]).not.toHaveProperty('apiKey')
    expect((result.data.items as Array<Record<string, unknown>>)[1]).not.toHaveProperty('secret')
    expect(result.redactions).toEqual(
      expect.arrayContaining(['items[0].apiKey', 'items[1].secret']),
    )
  })

  it('reports anonymous viewer as "public" visibility', () => {
    const result = applyRedactionPolicy({}, anon)
    expect(result.visibility).toBe('public')
  })

  it('owner visibility for owner caller', () => {
    const result = applyRedactionPolicy({}, owner)
    expect(result.visibility).toBe('owner')
  })

  it('does not mutate the original payload', () => {
    const payload = { id: 'b1', apiKey: 'x' }
    applyRedactionPolicy(payload, owner)
    expect(payload).toHaveProperty('apiKey')
  })
})
