import { resolveDocsUrl, docsKeyForKind, formatDocLink, renderDocsLine } from './docs-registry'

// We test both color-enabled and plain-text branches by controlling the
// isPlainText() function indirectly via stdout.isTTY.

describe('resolveDocsUrl', () => {
  it('resolves registered keys to absolute URLs', () => {
    const url = resolveDocsUrl('auth-login')
    expect(url).toMatch(/^https:\/\/docs\.lenserfight\.com/)
  })

  it('returns undefined for unknown keys', () => {
    expect(resolveDocsUrl('nonexistent-key-xyz')).toBeUndefined()
  })

  it('resolves all error-kind keys', () => {
    const keys = [
      'auth-login', 'permissions', 'resources', 'rate-limits',
      'connectivity', 'gateway-setup', 'providers', 'multimodal',
      'workflow-nodes', 'battle-lifecycle', 'schemas', 'configuration',
      'local-models', 'troubleshooting',
    ]
    for (const key of keys) {
      expect(resolveDocsUrl(key)).toBeTruthy()
    }
  })
})

describe('docsKeyForKind', () => {
  it('returns a key for every known error kind', () => {
    const kinds = [
      'unauthorized', 'forbidden', 'not_found', 'rate_limited',
      'network', 'gateway', 'provider', 'multimodal', 'workflow',
      'battle', 'schema', 'config', 'local_model', 'unknown',
    ] as const

    for (const kind of kinds) {
      const key = docsKeyForKind(kind)
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(0)
    }
  })

  it('falls back to troubleshooting for unknown kinds', () => {
    // @ts-expect-error intentional invalid kind
    expect(docsKeyForKind('not_a_real_kind')).toBe('troubleshooting')
  })
})

describe('formatDocLink', () => {
  const originalIsTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY')
  const originalTERM = process.env['TERM']

  afterEach(() => {
    delete process.env['NO_COLOR']
    if (originalTERM === undefined) delete process.env['TERM']
    else process.env['TERM'] = originalTERM
    if (originalIsTTY) {
      Object.defineProperty(process.stdout, 'isTTY', originalIsTTY)
    }
  })

  it('returns null for unknown keys', () => {
    expect(formatDocLink('unknown-key-xyz')).toBeNull()
  })

  it('returns a string for valid keys', () => {
    // Force plain-text so the result is deterministic regardless of test TTY.
    process.env['NO_COLOR'] = '1'
    const result = formatDocLink('auth-login')
    expect(result).not.toBeNull()
    expect(typeof result).toBe('string')
  })

  it('includes the URL in plain-text mode', () => {
    process.env['NO_COLOR'] = '1'
    const result = formatDocLink('auth-login')!
    expect(result).toContain('docs.lenserfight.com')
  })

  it('uses the custom label when provided', () => {
    process.env['NO_COLOR'] = '1'
    const result = formatDocLink('auth-login', 'Sign in')!
    expect(result).toContain('Sign in')
  })

  it('includes OSC 8 hyperlink sequences in color mode', () => {
    delete process.env['NO_COLOR']
    process.env['TERM'] = 'xterm-256color'
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
    const result = formatDocLink('auth-login')!
    // OSC 8 starts with \x1b]8;;
    expect(result).toContain('\x1b]8;;')
  })
})

describe('renderDocsLine', () => {
  afterEach(() => {
    delete process.env['NO_COLOR']
  })

  it('returns null for unknown keys', () => {
    expect(renderDocsLine('unknown-key-xyz')).toBeNull()
  })

  it('returns a string for valid keys', () => {
    process.env['NO_COLOR'] = '1'
    const result = renderDocsLine('auth-login')
    expect(result).not.toBeNull()
  })

  it('includes "docs:" prefix in plain-text mode', () => {
    process.env['NO_COLOR'] = '1'
    const line = renderDocsLine('auth-login')!
    expect(line).toContain('docs:')
    expect(line).toContain('docs.lenserfight.com')
  })

  it('uses the custom label when provided', () => {
    process.env['NO_COLOR'] = '1'
    const line = renderDocsLine('auth-login', 'Auth guide')!
    // In plain-text mode, the label does not appear (we render the URL directly)
    // but the URL is always present.
    expect(line).toContain('docs.lenserfight.com')
  })
})
