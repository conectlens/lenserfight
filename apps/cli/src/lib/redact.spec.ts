import { redact, redactHeaders, redactUrl } from './redact'

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ.abc123'

describe('redact', () => {
  it('redacts a JWT token', () => {
    expect(redact(JWT)).toBe('[REDACTED]')
  })

  it('redacts a 40-char generic token', () => {
    expect(redact('abcdefghijklmnopqrstuvwxyz0123456789ABCD')).toBe('[REDACTED]')
  })

  it('passes short mode strings unchanged', () => {
    expect(redact('local')).toBe('local')
    expect(redact('cloud')).toBe('cloud')
  })

  it('passes localhost URLs unchanged', () => {
    expect(redact('http://localhost:8786')).toBe('http://localhost:8786')
  })

  it('passes empty string unchanged', () => {
    expect(redact('')).toBe('')
  })
})

describe('redactHeaders', () => {
  it('redacts authorization header value', () => {
    const result = redactHeaders({ authorization: `Bearer ${JWT}` })
    expect(result['authorization']).toBe('[REDACTED]')
  })

  it('redacts x-api-key header value', () => {
    const result = redactHeaders({ 'x-api-key': 'some-key-value' })
    expect(result['x-api-key']).toBe('[REDACTED]')
  })

  it('redacts apikey header', () => {
    const result = redactHeaders({ apikey: 'some-anon-key' })
    expect(result['apikey']).toBe('[REDACTED]')
  })

  it('redacts cookie header', () => {
    const result = redactHeaders({ cookie: 'session=abc' })
    expect(result['cookie']).toBe('[REDACTED]')
  })

  it('leaves content-type unchanged', () => {
    const result = redactHeaders({ 'content-type': 'application/json' })
    expect(result['content-type']).toBe('application/json')
  })

  it('leaves accept unchanged', () => {
    const result = redactHeaders({ accept: 'application/json' })
    expect(result['accept']).toBe('application/json')
  })
})

describe('redactUrl', () => {
  it('redacts token query param', () => {
    const url = redactUrl('http://localhost:8786/path?token=secret123')
    expect(url).not.toContain('secret123')
  })

  it('redacts key query param', () => {
    const url = redactUrl('http://localhost:54321/rest/v1/table?key=myapikey')
    expect(url).not.toContain('myapikey')
  })

  it('redacts access_token query param', () => {
    const url = redactUrl('http://example.com/auth?access_token=tok123')
    expect(url).not.toContain('tok123')
  })

  it('leaves non-sensitive params intact', () => {
    const url = redactUrl('http://localhost:8786/path?format=json&limit=10')
    expect(url).toContain('format=json')
    expect(url).toContain('limit=10')
  })

  it('handles URLs with no query string', () => {
    expect(redactUrl('http://localhost:8786/path')).toBe('http://localhost:8786/path')
  })

  it('handles invalid URLs gracefully (returns original)', () => {
    const bad = 'not-a-valid-url'
    expect(redactUrl(bad)).toBe(bad)
  })
})
