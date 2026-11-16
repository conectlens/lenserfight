import { beforeEach, describe, expect, it } from 'vitest'

import { consumeConsent, rememberConsent } from './mcpConsent'

const SERVER = 'https://mcp.lenserfight.win'

describe('MCP consent record', () => {
  beforeEach(() => sessionStorage.clear())

  it('does not treat a missing record as consent', () => {
    expect(consumeConsent('req-1', SERVER)).toBe(false)
  })

  it('accepts a record written by the Allow click, exactly once', () => {
    rememberConsent('req-1', SERVER)
    expect(consumeConsent('req-1', SERVER)).toBe(true)
    expect(consumeConsent('req-1', SERVER)).toBe(false)
  })

  it('is bound to the authorization id', () => {
    rememberConsent('req-1', SERVER)
    expect(consumeConsent('req-2', SERVER)).toBe(false)
  })

  it('is bound to the MCP server and is removed even on mismatch', () => {
    rememberConsent('req-1', SERVER)
    expect(consumeConsent('req-1', 'https://other.example')).toBe(false)
    expect(consumeConsent('req-1', SERVER)).toBe(false)
  })
})
