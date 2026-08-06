import { fuzzyScore, rankPaletteEntries, type PaletteEntry } from './paletteMatch'

describe('fuzzyScore', () => {
  it('scores an exact prefix match best', () => {
    expect(fuzzyScore('bat', 'battle list')).toBe(0)
  })

  it('scores a substring match better than a scattered subsequence', () => {
    const substring = fuzzyScore('list', 'battle list')
    const subsequence = fuzzyScore('btl', 'battle list')
    expect(substring).not.toBeNull()
    expect(subsequence).not.toBeNull()
    expect(substring as number).toBeLessThan(subsequence as number)
  })

  it('returns null when characters are out of order', () => {
    expect(fuzzyScore('tlb', 'battle')).toBeNull()
  })

  it('treats an empty query as always matching', () => {
    expect(fuzzyScore('', 'anything')).not.toBeNull()
  })
})

describe('rankPaletteEntries', () => {
  const entries: PaletteEntry[] = [
    { id: '1', kind: 'nav', label: 'Agents', description: 'Go to Agents' },
    { id: '2', kind: 'command', label: 'battle list', description: 'List recent battles' },
    { id: '3', kind: 'command', label: 'agents logs', description: 'Show agent logs' },
  ]

  it('ranks the prefix/exact match first', () => {
    const ranked = rankPaletteEntries(entries, 'agents')
    expect(ranked[0].id).toBe('1')
  })

  it('excludes entries that do not fuzzy-match at all', () => {
    const ranked = rankPaletteEntries(entries, 'zzz')
    expect(ranked).toHaveLength(0)
  })

  it('returns entries unranked (head slice) for an empty query', () => {
    const ranked = rankPaletteEntries(entries, '', 2)
    expect(ranked).toHaveLength(2)
  })
})
