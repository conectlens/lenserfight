/**
 * Drift gate that proves `PROVIDER_SUPPORT_LEVEL` in `capability-matrix.ts`
 * matches the runtime truth in `supabase/seeds/04_ai_providers.sql`.
 *
 * Reads the seed file as text, regex-extracts each provider's tuple, and
 * asserts the TS map. If the seed adds a provider or changes a support tier
 * without updating the TS map, this fails — keeping the matrix and the DB
 * from silently disagreeing.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PROVIDER_SUPPORT_LEVEL } from '../capability-matrix'

// supabase/seeds is at the workspace root. From this spec file:
// libs/providers/src/lib/__tests__/<file>.spec.ts → ../../../../../supabase/seeds/...
const SEED_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'supabase',
  'seeds',
  '04_ai_providers.sql',
)

interface SeedRow {
  key: string
  supportLevel: string
}

/**
 * Each `provider_seed` row is shaped:
 *   ('<key>',
 *    '<display_name>',
 *    '<base_url>',
 *    '<docs_url>',
 *    '<support_level>',
 *    ...)
 *
 * We capture rows by matching that literal layout. The fifth single-quoted
 * literal in a row is the support_level.
 */
function parseSeed(text: string): SeedRow[] {
  const out: SeedRow[] = []
  // Match each VALUES tuple: `(\n  'key',\n  'display',\n  'base',\n  'docs',\n  'support', ...)`
  // We scope by matching from `(\n` followed by a single-quoted key to the
  // first `support_level`-shaped string. Tolerant of inconsistent whitespace.
  const tupleRe = /\(\s*'([a-z_]+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'(runnable|byok_only|catalog_only|deprecated)'/g
  let m: RegExpExecArray | null
  while ((m = tupleRe.exec(text)) !== null) {
    out.push({ key: m[1], supportLevel: m[2] })
  }
  return out
}

describe('provider support parity — seed ↔ capability-matrix', () => {
  let seedRows: SeedRow[]

  beforeAll(() => {
    const text = readFileSync(SEED_PATH, 'utf8')
    seedRows = parseSeed(text)
  })

  it('extracts at least 20 provider rows from the seed', () => {
    expect(seedRows.length).toBeGreaterThanOrEqual(20)
  })

  it('every seed provider key appears in PROVIDER_SUPPORT_LEVEL', () => {
    const missing = seedRows.filter((r) => !(r.key in PROVIDER_SUPPORT_LEVEL))
    expect(missing.map((r) => r.key)).toEqual([])
  })

  it('every PROVIDER_SUPPORT_LEVEL key appears in the seed', () => {
    const seedKeys = new Set(seedRows.map((r) => r.key))
    const missing = Object.keys(PROVIDER_SUPPORT_LEVEL).filter((k) => !seedKeys.has(k))
    expect(missing).toEqual([])
  })

  it('every provider\'s seed support_level matches the TS map', () => {
    const mismatches: string[] = []
    for (const row of seedRows) {
      const tsLevel = PROVIDER_SUPPORT_LEVEL[row.key]
      if (tsLevel !== row.supportLevel) {
        mismatches.push(`${row.key}: seed='${row.supportLevel}' ts='${tsLevel}'`)
      }
    }
    expect(mismatches).toEqual([])
  })
})
