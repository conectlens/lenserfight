/**
 * Drift gate that proves the model registry (`model-registry.ts`) covers
 * every active model declared by `supabase/seeds/04b_ai_models.sql`, EXCEPT
 * the explicit catalog-only / deprecated rows documented below.
 *
 * Catches: a model seeded in the DB but missing from the in-code registry
 * (would 404 at runtime); or a seed-active model that no adapter can dispatch.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { listModels, lookupModel } from '../model-registry'

const SEED_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'supabase',
  'seeds',
  '04b_ai_models.sql',
)

/**
 * Models present in the seed but intentionally absent from the in-code
 * registry. Each entry must carry a documented reason — the test asserts
 * the model is in the seed and is NOT in the registry, proving the gate
 * is wired closed.
 *
 *   - `midjourney-7`: seed marks `is_active=false` and provider tier
 *     `deprecated`. The registry doc-comment at `model-registry.ts:131`
 *     explicitly notes "no public Midjourney API."
 *   - `llama3.2:3b-instruct`, `qwen2.5:7b-instruct`: Ollama catalog
 *     models. They run via the Ollama adapter using their seed key as the
 *     wire name (no separate registry alias needed). Documented as
 *     catalog entries, not registry aliases.
 */
const INTENTIONALLY_UNREGISTERED = new Set<string>([
  'midjourney-7',
  'llama3.2:3b-instruct',
  'qwen2.5:7b-instruct',
])

interface SeedModel {
  key: string
  providerKey: string
  isActive: boolean
}

/**
 * Match every row in either `model_seed` or `extra_model_seed` VALUES tuple.
 * Each row is:
 *   ('Display Name',
 *    ARRAY['...']::text[],
 *    'key',
 *    'provider_key',
 *    <int>,
 *    <bool>,
 *    <bool>,
 *    <bool>,
 *    'docs_url',
 *    <bool is_active>)
 */
function parseSeed(text: string): SeedModel[] {
  const out: SeedModel[] = []
  // ARRAY[...]::text[] then ,'key','provider_key', <int>,<bool>,<bool>,<bool>,'url',<bool>
  const rowRe =
    /ARRAY\[[^\]]*\]::text\[\]\s*,\s*'([a-zA-Z0-9_.:\-]+)'\s*,\s*'([a-z_]+)'\s*,\s*\d+\s*,\s*(?:true|false)\s*,\s*(?:true|false)\s*,\s*(?:true|false)\s*,\s*'[^']*'\s*,\s*(true|false)/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(text)) !== null) {
    out.push({ key: m[1], providerKey: m[2], isActive: m[3] === 'true' })
  }
  return out
}

describe('model registry parity — seed ↔ in-code registry', () => {
  let seedModels: SeedModel[]

  beforeAll(() => {
    const text = readFileSync(SEED_PATH, 'utf8')
    seedModels = parseSeed(text)
  })

  it('extracts a meaningful number of seed rows', () => {
    expect(seedModels.length).toBeGreaterThanOrEqual(25)
  })

  it('every seed model is either in the registry or documented as unregistered', () => {
    const orphans: string[] = []
    for (const sm of seedModels) {
      const inRegistry = lookupModel(sm.key) !== null
      const intentionallyOut = INTENTIONALLY_UNREGISTERED.has(sm.key)
      if (!inRegistry && !intentionallyOut) {
        orphans.push(`${sm.providerKey}/${sm.key} (active=${sm.isActive})`)
      }
    }
    expect(orphans).toEqual([])
  })

  it('every INTENTIONALLY_UNREGISTERED key actually appears in the seed', () => {
    const seedKeys = new Set(seedModels.map((m) => m.key))
    const stale = [...INTENTIONALLY_UNREGISTERED].filter((k) => !seedKeys.has(k))
    expect(stale).toEqual([])
  })

  it('every INTENTIONALLY_UNREGISTERED key is in fact absent from the registry', () => {
    const present = [...INTENTIONALLY_UNREGISTERED].filter((k) => lookupModel(k) !== null)
    expect(present).toEqual([])
  })

  it('every registry model maps to a known seed-provider key', () => {
    const seedProviders = new Set(seedModels.map((m) => m.providerKey))
    const orphans = listModels().filter((m) => !seedProviders.has(m.provider))
    expect(orphans.map((m) => `${m.provider}/${m.key}`)).toEqual([])
  })
})
