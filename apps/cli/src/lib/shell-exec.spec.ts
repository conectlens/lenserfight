import { execShell, parseCd, type ShellStreamLine } from './shell-exec'

describe('parseCd', () => {
  it('returns null for a non-cd command', () => {
    expect(parseCd('ls -la', '/repo')).toBeNull()
  })

  it('resolves a relative path against cwd', () => {
    const result = parseCd('cd ..', '/repo/apps/cli')
    expect(result).toBe(require('node:path').resolve('/repo/apps/cli', '..'))
  })

  it('handles quoted paths', () => {
    const result = parseCd('cd "some dir"', '/repo')
    expect(result).toBe(require('node:path').resolve('/repo', 'some dir'))
  })

  it('resolves bare cd / cd ~ to home', () => {
    const home = process.env['HOME'] || process.env['USERPROFILE'] || '/repo'
    expect(parseCd('cd', '/repo')).toBe(home)
    expect(parseCd('cd ~', '/repo')).toBe(home)
  })
})

describe('execShell', () => {
  it('streams stdout lines and reports exit code 0', async () => {
    const lines: ShellStreamLine[] = []
    const result = await execShell(`node -e "console.log('a'); console.log('b')"`, {
      cwd: process.cwd(),
      onLine: (l) => lines.push(l),
    })
    expect(result.exitCode).toBe(0)
    expect(result.cancelled).toBe(false)
    expect(lines.filter((l) => l.stream === 'stdout').map((l) => l.text)).toEqual(['a', 'b'])
  })

  it('reports a non-zero exit code', async () => {
    const result = await execShell(`node -e "process.exit(3)"`, { cwd: process.cwd(), onLine: () => undefined })
    expect(result.exitCode).toBe(3)
  })

  it('is cancellable via an AbortSignal', async () => {
    const ac = new AbortController()
    const promise = execShell(`node -e "setTimeout(() => {}, 5000)"`, {
      cwd: process.cwd(),
      onLine: () => undefined,
      signal: ac.signal,
    })
    ac.abort()
    const result = await promise
    expect(result.cancelled).toBe(true)
  }, 10000)
})
