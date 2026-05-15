import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCALES, type LocaleCode } from '../index'

const DEFERRED_DB_CODES = new Set(['ar', 'zh-CN', 'zh-TW'])

const SEED_PATH = join(__dirname, '../../../../../supabase/seeds/01_core_languages.sql')

interface SeedRow {
  code: string
  direction: 'ltr' | 'rtl'
}

function parseSeed(): SeedRow[] {
  const sql = readFileSync(SEED_PATH, 'utf8')
  const rows: SeedRow[] = []
  const re = /\(\s*'([^']+)'\s*,\s*'[^']+'\s*,\s*'[^']+'\s*,\s*'(ltr|rtl)'\s*,\s*true\s*\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(sql)) !== null) {
    rows.push({ code: match[1], direction: match[2] as 'ltr' | 'rtl' })
  }
  return rows
}

describe('locale parity with Supabase seed', () => {
  const rows = parseSeed()

  it('found rows in the seed file', () => {
    expect(rows.length).toBeGreaterThan(0)
  })

  it('every non-deferred active DB locale is declared in LOCALES with matching direction', () => {
    const tsCodes = new Map(LOCALES.map((l) => [l.code as string, l]))
    const missing: string[] = []
    const directionMismatches: string[] = []

    for (const row of rows) {
      if (DEFERRED_DB_CODES.has(row.code)) continue
      const ts = tsCodes.get(row.code)
      if (!ts) {
        missing.push(row.code)
        continue
      }
      if (ts.direction !== row.direction) {
        directionMismatches.push(
          `${row.code}: seed=${row.direction} ts=${ts.direction}`,
        )
      }
    }

    expect(missing).toEqual([])
    expect(directionMismatches).toEqual([])
  })

  it('every declared LOCALES code (except none) is also active in the seed', () => {
    const seedCodes = new Set(rows.map((r) => r.code))
    const orphans: LocaleCode[] = []
    for (const ts of LOCALES) {
      if (!seedCodes.has(ts.code)) orphans.push(ts.code)
    }
    expect(orphans).toEqual([])
  })
})
