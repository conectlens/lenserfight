// Phase BI — battles repository round-trip integration spec.
//
// Skipped when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not present so
// `pnpm nx test repositories` stays green in CI without a live database.
// Invoked from scripts/e2e-battle.sh which boots a local Supabase, applies
// supabase/seeds/52_battle_e2e_seed.sql, then runs this spec.

import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, beforeAll } from 'vitest'

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? ''
const SERVICE_ROLE = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
const HAS_LOCAL_SUPABASE = Boolean(SUPABASE_URL) && Boolean(SERVICE_ROLE)

const E2E_BATTLE_SLUG = 'e2e-open-battle'
const E2E_BATTLE_ID = 'e2eba771-0000-0000-0000-000000000001'
const E2E_TEMPLATE_ID = 'e2e0e2e0-0000-0000-0000-000000000001'

describe.skipIf(!HAS_LOCAL_SUPABASE)('battlesRepository (e2e)', () => {
  let client: ReturnType<typeof createClient>

  beforeAll(() => {
    client = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  })

  it('reads the seeded template via RPC', async () => {
    const { data, error } = await client.rpc('fn_battles_get_template', {
      p_template_id: E2E_TEMPLATE_ID,
    })
    expect(error).toBeNull()
    expect(data).toMatchObject({ id: E2E_TEMPLATE_ID, is_public: true })
  })

  it('resolves the seeded battle by slug', async () => {
    const { data, error } = await client.rpc('fn_get_battle_by_slug', {
      p_slug: E2E_BATTLE_SLUG,
    })
    expect(error).toBeNull()
    const row = Array.isArray(data) ? data[0] : data
    expect(row).toBeTruthy()
    expect((row as { id: string }).id).toBe(E2E_BATTLE_ID)
  })

  it('lists the two seeded contenders', async () => {
    const { data, error } = await client.rpc('fn_get_battle_contenders', {
      p_battle_id: E2E_BATTLE_ID,
    })
    expect(error).toBeNull()
    expect((data as unknown[]).length).toBe(2)
  })
})
