/**
 * Provider response fixture loader.
 *
 * Fixtures are committed JSON files under
 * `libs/providers/src/lib/__tests__/__fixtures__/<provider>/<scenario>.json`.
 * They mirror real provider response shapes (sensitive fields replaced with
 * stub URLs / base64 sentinels) so adapter tests assert against actual wire
 * formats instead of inline literals scattered across spec files.
 *
 * GRASP — *Pure Fabrication*. One reader, one path convention.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Resolve the on-disk path for a fixture without reading it. */
export function fixturePath(provider: string, scenario: string): string {
  return resolve(
    __dirname,
    '..',
    '__tests__',
    '__fixtures__',
    provider,
    `${scenario}.json`,
  )
}

/**
 * Load a fixture as a typed object. Throws a helpful error including the
 * resolved path when the file is missing.
 */
export function loadFixture<T = unknown>(provider: string, scenario: string): T {
  const path = fixturePath(provider, scenario)
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Fixture not found: ${path} — ${reason}`)
  }
}
