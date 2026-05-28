import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CONNECTOR_SCOPES } from './scopes'

/**
 * Phase 10 acceptance — RFC-0001 stability invariant.
 *
 * The v1 scope grammar lives in two places: `CONNECTOR_SCOPES` (TS) and
 * `connectors.fn_valid_scopes()` (Postgres). They MUST match. Any drift means a
 * token issued by the CLI may carry a scope the database does not accept, or
 * vice-versa. This test parses the migration source and asserts equality.
 *
 * When v1.x adds a scope: append to CONNECTOR_SCOPES, then add a row to
 * `fn_valid_scopes()` in the migration that introduces the scope. Both sources
 * change in the same PR. Phase 16 replaces this guard with a generator script.
 *
 * The cli-e2e live-RPC test (a connector with `lenses:read` cannot call
 * `fn_battles_create`) is deferred to Phase 12 once the battles RLS audit
 * migration lands and a CLI e2e harness exists.
 */

const MIGRATION_PATH = resolve(
  __dirname,
  '../../../../../supabase/migrations/20260519131536_remote_schema.sql',
)

function parseSqlAllowList(sql: string): string[] {
  const fnMatch = sql.match(/fn_valid_scopes[\s\S]*?ARRAY\[([\s\S]*?)\]/)
  if (!fnMatch) throw new Error('Could not find fn_valid_scopes ARRAY[...] block in migration')
  const body = fnMatch[1]
  const scopes: string[] = []
  for (const m of body.matchAll(/'([a-z]+:[a-z]+)'/g)) {
    scopes.push(m[1])
  }
  return scopes
}

describe('connector scope grammar invariant (RFC-0001)', () => {
  it('SQL fn_valid_scopes() matches CONNECTOR_SCOPES exactly', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8')
    const sqlScopes = parseSqlAllowList(sql)
    expect(sqlScopes.sort()).toEqual([...CONNECTOR_SCOPES].sort())
  })

  it('every scope follows the <resource>:<action> grammar', () => {
    for (const scope of CONNECTOR_SCOPES) {
      expect(scope).toMatch(/^[a-z]+:(read|write)$/)
    }
  })
})
