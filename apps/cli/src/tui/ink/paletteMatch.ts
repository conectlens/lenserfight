export interface PaletteEntry {
  id: string
  kind: 'nav' | 'command'
  label: string
  description: string
}

/**
 * Subsequence fuzzy score: every query character must appear in order in the
 * target; contiguous / prefix matches score better. Returns null on no match.
 * Lower score is better (ranking sorts ascending).
 */
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (!q) return t.length
  if (t.startsWith(q)) return 0
  if (t.includes(q)) return 1

  let qi = 0
  let score = 0
  let lastMatch = -1
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += lastMatch >= 0 ? ti - lastMatch - 1 : ti
      lastMatch = ti
      qi++
    }
  }
  if (qi < q.length) return null
  return 2 + score
}

export function rankPaletteEntries(entries: PaletteEntry[], query: string, max = 8): PaletteEntry[] {
  if (!query.trim()) return entries.slice(0, max)
  const scored = entries
    .map((entry) => ({ entry, score: fuzzyScore(query, `${entry.label} ${entry.description}`) }))
    .filter((s): s is { entry: PaletteEntry; score: number } => s.score !== null)
  scored.sort((a, b) => a.score - b.score)
  return scored.slice(0, max).map((s) => s.entry)
}
