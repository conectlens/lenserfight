// Phase BI — CLI battle lifecycle integration spec.
//
// Runs the built `lf` CLI against a local Supabase instance and asserts that
// the JSON shape returned by each step is what the wizard and dev-cycle
// commands depend on.
//
// Skipped when SUPABASE_URL is not set so `pnpm nx test cli` stays green in
// CI without a live database. Driven by scripts/e2e-battle.sh.

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? ''
const SERVICE_ROLE = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
const HAS_LOCAL = Boolean(SUPABASE_URL) && Boolean(SERVICE_ROLE)

const CLI_BIN = resolve(__dirname, '../../../../../dist/apps/cli/main.js')
const E2E_BATTLE_SLUG = 'e2e-open-battle'

function runCli(args: string[]): { code: number; stdout: string; stderr: string } {
  const r = spawnSync('node', [CLI_BIN, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE,
      LF_USE_SERVICE_ROLE: '1',
    },
  })
  return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

const describeIfLocal = HAS_LOCAL ? describe : describe.skip

describeIfLocal('lf battle (e2e)', () => {
  beforeAll(() => {
    if (!existsSync(CLI_BIN)) {
      throw new Error(`CLI binary missing at ${CLI_BIN}. Run: pnpm nx build cli`)
    }
  })

  it('browse returns at least the seeded e2e battle', () => {
    const { code, stdout } = runCli(['battle', 'browse', '--limit', '5', '--json'])
    expect(code).toBe(0)
    const parsed = JSON.parse(stdout.trim() || '[]') as Array<{ slug: string }>
    expect(parsed.some((r) => r.slug === E2E_BATTLE_SLUG)).toBe(true)
  })
})
