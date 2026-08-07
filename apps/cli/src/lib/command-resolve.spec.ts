import { normalizeTopLevel, resolveCommandPath, suggestSimilar } from './command-resolve'

const KNOWN = ['agents', 'battle', 'workflow', 'workflows', 'execute', 'schedule', 'memory', 'lenser', 'approval', 'config', 'doctor']

describe('normalizeTopLevel', () => {
  it('passes through an already-canonical command untouched', () => {
    expect(normalizeTopLevel(['agents', 'list'], KNOWN)).toEqual(['agents', 'list'])
  })

  it('fixes uppercase command names (the reported lf AGENTS bug)', () => {
    expect(normalizeTopLevel(['AGENTS'], KNOWN)).toEqual(['agents'])
    expect(normalizeTopLevel(['AGENTS', 'list'], KNOWN)).toEqual(['agents', 'list'])
  })

  it('fixes mixed-case command names', () => {
    expect(normalizeTopLevel(['Agents'], KNOWN)).toEqual(['agents'])
    expect(normalizeTopLevel(['ScHeDuLe'], KNOWN)).toEqual(['schedule'])
  })

  it('strips a redundant leading "lf" token, case-insensitively', () => {
    expect(normalizeTopLevel(['lf', 'agents'], KNOWN)).toEqual(['agents'])
    expect(normalizeTopLevel(['LF', 'agents'], KNOWN)).toEqual(['agents'])
  })

  it('strips a redundant leading "lenserfight" token', () => {
    expect(normalizeTopLevel(['lenserfight', 'AGENTS'], KNOWN)).toEqual(['agents'])
  })

  it('strips a leading slash (slash-command style)', () => {
    expect(normalizeTopLevel(['/agents'], KNOWN)).toEqual(['agents'])
    expect(normalizeTopLevel(['/AGENTS', 'list'], KNOWN)).toEqual(['agents', 'list'])
  })

  it('skips leading global flags before locating the command token', () => {
    expect(normalizeTopLevel(['--local', 'AGENTS'], KNOWN)).toEqual(['--local', 'agents'])
  })

  it('never touches argument values, only the command name token', () => {
    expect(normalizeTopLevel(['agents', 'get', 'MyAgentID', '--Status=Active'], KNOWN)).toEqual([
      'agents',
      'get',
      'MyAgentID',
      '--Status=Active',
    ])
  })

  it('leaves an unmatched token alone (unknown command, not corrupted)', () => {
    expect(normalizeTopLevel(['totallyUnknownThing'], KNOWN)).toEqual(['totallyUnknownThing'])
  })

  it('handles empty argv', () => {
    expect(normalizeTopLevel([], KNOWN)).toEqual([])
  })

  it('handles argv of only flags', () => {
    expect(normalizeTopLevel(['--local', '--debug'], KNOWN)).toEqual(['--local', '--debug'])
  })
})

describe('resolveCommandPath', () => {
  const PATHS = [
    ['agents', 'list'],
    ['agents', 'get'],
    ['agents', 'team', 'inspect'],
    ['battle', 'create'],
    ['battle', 'submit-media'],
    ['workflow'],
  ]

  it('normalizes two levels deep', () => {
    const r = resolveCommandPath(['AGENTS', 'LIST'], PATHS)
    expect(r).toEqual({ argv: ['agents', 'list'], matched: true, suggestions: [] })
  })

  it('normalizes three levels deep', () => {
    const r = resolveCommandPath(['agents', 'TEAM', 'Inspect'], PATHS)
    expect(r.argv).toEqual(['agents', 'team', 'inspect'])
    expect(r.matched).toBe(true)
  })

  it('stops normalizing once a token no longer matches a subcommand (start of args)', () => {
    const r = resolveCommandPath(['agents', 'get', 'SomeArgValue'], PATHS)
    expect(r.argv).toEqual(['agents', 'get', 'SomeArgValue'])
    expect(r.matched).toBe(true)
  })

  it('returns did-you-mean suggestions for a typo with no match', () => {
    const r = resolveCommandPath(['batle'], PATHS)
    expect(r.matched).toBe(false)
    expect(r.suggestions).toContain('battle')
  })

  it('strips lf/lenserfight prefix and slash before matching', () => {
    expect(resolveCommandPath(['lf', 'AGENTS', 'list'], PATHS).argv).toEqual(['agents', 'list'])
    expect(resolveCommandPath(['/AGENTS'], PATHS).argv).toEqual(['agents'])
  })
})

describe('suggestSimilar', () => {
  it('ranks closer matches first', () => {
    const result = suggestSimilar('batle', ['battle', 'battle-moderation', 'agents'])
    expect(result[0]).toBe('battle')
  })

  it('returns nothing for a totally unrelated input', () => {
    expect(suggestSimilar('xyzxyzxyz', ['battle', 'agents'])).toEqual([])
  })
})
