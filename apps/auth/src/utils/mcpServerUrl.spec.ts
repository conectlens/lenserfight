import { describe, expect, it } from 'vitest'

import { isSafeRedirectTarget, resolveMcpServerUrl } from './mcpServerUrl'

const CONFIGURED = 'https://mcp.lenserfight.com'
const prod = { configured: CONFIGURED, isDev: false }
const dev = { configured: CONFIGURED, isDev: true }

describe('resolveMcpServerUrl', () => {
  it('uses the configured server when no parameter is given', () => {
    expect(resolveMcpServerUrl(null, prod)).toBe(CONFIGURED)
  })

  it.each([
    'https://abc123.trycloudflare.com',
    'https://abc123.ngrok-free.app',
    'https://attacker.example',
    'http://127.0.0.1:9999',
    'http://localhost:8787',
  ])('ignores %s in production builds', (server) => {
    expect(resolveMcpServerUrl(server, prod)).toBe(CONFIGURED)
  })

  it('accepts the configured origin', () => {
    expect(resolveMcpServerUrl(`${CONFIGURED}/`, prod)).toBe(CONFIGURED)
  })

  it('allows loopback and tunnel hosts in development builds', () => {
    expect(resolveMcpServerUrl('http://localhost:8787', dev)).toBe('http://localhost:8787')
    expect(resolveMcpServerUrl('https://abc.trycloudflare.com', dev)).toBe(
      'https://abc.trycloudflare.com'
    )
  })

  it.each([
    'https://attacker.example',
    'javascript:alert(1)',
    'http://abc.trycloudflare.com',
    'https://user:pw@abc.trycloudflare.com',
    'not a url',
  ])('rejects %s even in development builds', (server) => {
    expect(resolveMcpServerUrl(server, dev)).toBe(CONFIGURED)
  })
})

describe('isSafeRedirectTarget', () => {
  it.each([
    'https://client.example.com/oauth/callback',
    'http://127.0.0.1:33418/callback',
    'http://localhost:6274/oauth/callback',
    'cursor://anysphere.cursor-mcp/oauth/callback',
    'vscode://publisher.ext/callback',
    'com.example.app://callback',
  ])('allows %s', (value) => {
    expect(isSafeRedirectTarget(new URL(value))).toBe(true)
  })

  it.each([
    'javascript:alert(document.cookie)//',
    'JavaScript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'blob:https://example.com/uuid',
    'file:///etc/passwd',
    'ms-msdt:/id PCWDiagnostic',
    'search-ms:query=x',
    'myapp://callback',
    'http://attacker.example/cb',
  ])('rejects %s', (value) => {
    expect(isSafeRedirectTarget(new URL(value))).toBe(false)
  })
})
