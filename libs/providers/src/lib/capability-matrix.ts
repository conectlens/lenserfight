/**
 * Capability matrix — the single source of truth that drives every
 * parametrized test suite in the QA regression campaign.
 *
 * The matrix is **derived**, not hand-authored. It composes:
 *   - `listModels()` from {@link ./model-registry} (the canonical wire-format truth)
 *   - per-(provider, kind) execution pattern (sync / async / stream)
 *   - `PROVIDER_SUPPORT_LEVEL` mirroring the `supabase/seeds/04_ai_providers.sql` seed
 *   - the static list of funding sources and execution paths
 *
 * GRASP — *Information Expert*. One module owns the cross-product knowledge
 * `(provider × model × modality × execution-path × funding-source)`. Every
 * adapter contract test, capability-gating test, negative-path test, and
 * lifecycle test reads from this matrix instead of redeclaring the rules.
 *
 * Adding a model = add a row to `model-registry.ts`. The matrix expands it
 * automatically. No edits here are required for new models — only for new
 * providers or new execution paths.
 */

import { listModels, type AnyProvider, type ModelDescriptor } from './model-registry'

// ─── Domain enums ────────────────────────────────────────────────────────────

/** All execution surfaces a model can be invoked through. */
export type ExecutionPath =
  | 'lens.text_stream'           // execute-stream SSE/NDJSON
  | 'lens.generative_sync'       // trigger-execution sync image/audio
  | 'lens.generative_async_poll' // trigger-execution async video/music
  | 'battle'                     // contender_runs via battle-worker
  | 'workflow_dag'               // workflow-execution.service DAG node
  | 'agent_cron'                 // pg_cron → fn_dispatch_scheduled_workflows

/** Funding modes that drive key resolution and billing routing. */
export type FundingSource =
  | 'user_byok_cloud'   // vault-stored cloud key (BYOK)
  | 'user_byok_local'   // local-only key (Ollama)
  | 'platform_credit'   // Chainabit gateway funded by platform credits
  | 'sponsored'         // admin-funded credit pool

/** Provider runtime support tier. Mirrors `ai.providers.support_level`. */
export type ProviderSupportLevel =
  | 'runnable'
  | 'byok_only'
  | 'catalog_only'
  | 'deprecated'

/** Outcome the system MUST produce for a given matrix row. */
export type ExpectedOutcome =
  | 'runnable'              // provider call succeeds (mocked) end-to-end
  | 'gated_unsupported'     // pre-flight rejects with `unsupported_model`
  | 'deprecated_blocked'    // provider deprecated; system never reaches adapter
  | 'byok_only_no_credit'   // BYOK-only provider on `platform_credit` is rejected
  | 'catalog_only_blocked'  // catalog-only provider never executes anywhere
  | 'no_local_for_cloud'    // `user_byok_local` requested for a cloud-only provider
  | 'no_cloud_for_local'    // `user_byok_cloud` requested for a local-only provider

/** Provider-API call pattern for a given (provider, output-kind) pair. */
export type ExecutionPattern = 'sync' | 'async' | 'stream'

// ─── Provider support map (mirrors supabase/seeds/04_ai_providers.sql) ──────

/**
 * Mirrors `ai.providers.support_level` exactly. The drift gate
 * `provider-support-parity.spec.ts` reads the seed file and asserts every
 * provider key here matches what the SQL declares.
 */
export const PROVIDER_SUPPORT_LEVEL: Record<string, ProviderSupportLevel> = {
  openai:     'runnable',
  anthropic:  'runnable',
  google:     'runnable',
  mistral:    'runnable',
  ollama:     'runnable',
  fal:        'runnable',
  stability:  'runnable',
  elevenlabs: 'runnable',
  kling:      'runnable',
  suno:       'runnable',
  openrouter: 'byok_only',
  perplexity: 'byok_only',
  xai:        'byok_only',
  groq:       'catalog_only',
  deepseek:   'catalog_only',
  bedrock:    'catalog_only',
  runway:     'catalog_only',
  litellm:    'catalog_only',
  lmstudio:   'catalog_only',
  midjourney: 'deprecated',
}

/** Provider that runs entirely on the user's machine. */
export const LOCAL_PROVIDERS: ReadonlySet<string> = new Set(['ollama', 'lmstudio'])

/**
 * Runnable providers wired to the Chainabit gateway for `platform_credit`
 * funding. Mirrors the `trigger-execution`/`execute-stream` edge functions'
 * `resolveChainabitToken` dispatch.
 */
export const CHAINABIT_GATEWAY_PROVIDERS: ReadonlySet<string> = new Set([
  'openai', 'anthropic', 'google', 'mistral',
  'stability', 'elevenlabs', 'kling', 'suno', 'fal',
])

// ─── Execution pattern table (provider × kind → sync/async/stream) ──────────

const EXECUTION_PATTERN: Record<string, ExecutionPattern> = {
  // Text providers — all stream via SSE except Ollama which uses NDJSON.
  'openai|text':    'stream',
  'anthropic|text': 'stream',
  'google|text':    'stream',
  'mistral|text':   'stream',
  'ollama|text':    'stream',
  // Image generation — synchronous everywhere.
  'openai|image':    'sync',
  'google|image':    'sync',
  'stability|image': 'sync',
  'fal|image':       'sync',
  // Video generation — async task-poll everywhere.
  'openai|video': 'async',
  'google|video': 'async',
  'kling|video':  'async',
  'fal|video':    'async',  // fal-stable-video
  // Audio: ElevenLabs returns base64 sync; Lyria/Suno are async task-poll.
  'elevenlabs|audio': 'sync',
  'google|audio':     'async',
  // Music — async everywhere.
  'google|music': 'async',
  'suno|music':   'async',
}

function patternFor(provider: AnyProvider, kind: ModelDescriptor['kind']): ExecutionPattern | null {
  return EXECUTION_PATTERN[`${provider}|${kind}`] ?? null
}

// ─── Path & funding compatibility ───────────────────────────────────────────

/**
 * Which execution paths a (provider, kind, pattern) tuple can legitimately use.
 *
 * Text models stream through `lens.text_stream` and are usable from every
 * surface that ultimately calls `callProvider` / `streamProvider` (battle,
 * workflow, cron). Media models route through `lens.generative_sync` or
 * `lens.generative_async_poll` depending on adapter pattern, and are equally
 * usable from battle/workflow/cron surfaces (the dispatcher is shared).
 */
function executionPathsFor(kind: ModelDescriptor['kind'], pattern: ExecutionPattern): ExecutionPath[] {
  const paths: ExecutionPath[] = []
  if (kind === 'text') {
    paths.push('lens.text_stream')
  } else if (pattern === 'sync') {
    paths.push('lens.generative_sync')
  } else if (pattern === 'async') {
    paths.push('lens.generative_async_poll')
  }
  // Every kind is usable from these higher-level surfaces — they re-enter
  // the same lower-level dispatch.
  paths.push('battle', 'workflow_dag', 'agent_cron')
  return paths
}

/**
 * Every funding source is enumerated for every provider. Combinations that
 * don't make sense (e.g. cloud-only provider with `user_byok_local`) are
 * surfaced as `no_local_for_cloud` / `no_cloud_for_local` rows so the
 * negative-paths suite can assert that the system fails closed.
 */
const ALL_FUNDING_SOURCES: ReadonlyArray<FundingSource> = [
  'user_byok_cloud',
  'user_byok_local',
  'platform_credit',
  'sponsored',
]
function fundingSourcesFor(_provider: AnyProvider): ReadonlyArray<FundingSource> {
  return ALL_FUNDING_SOURCES
}

// ─── Matrix entry ────────────────────────────────────────────────────────────

export interface CapabilityMatrixEntry {
  provider: AnyProvider
  /** LenserFight canonical model key. */
  model: string
  /** Real provider model id sent on the wire. */
  wireModel: string
  /** Output modality the model produces. */
  modality: ModelDescriptor['kind']
  executionPath: ExecutionPath
  fundingSource: FundingSource
  /** Execution pattern of the adapter (drives test harness selection). */
  pattern: ExecutionPattern
  /** Provider runtime support tier. */
  supportLevel: ProviderSupportLevel
  /** What the system MUST produce. */
  expected: ExpectedOutcome
  /**
   * For non-runnable rows, the expected user-facing error code from the
   * provider-error vocabulary. Runnable rows leave this undefined.
   */
  expectedErrorCode?: 'unsupported_model' | 'auth_failed' | 'permission_denied'
}

/**
 * Build the capability matrix. Stable, deterministic, side-effect-free.
 *
 * The matrix is built fresh each call so tests can mutate copies safely.
 * Cost is trivial (≈ 1ms) — there is no need to memoize.
 */
export function buildCapabilityMatrix(): CapabilityMatrixEntry[] {
  const rows: CapabilityMatrixEntry[] = []

  for (const m of listModels()) {
    const support = PROVIDER_SUPPORT_LEVEL[m.provider]
    if (!support) {
      // Registry references an unknown provider — caught by drift gates.
      continue
    }

    const pattern = patternFor(m.provider, m.kind)
    if (!pattern) {
      // (provider, kind) tuple has no execution pattern declared — caught
      // by `capability-matrix.spec.ts` to force a registry update.
      continue
    }

    const paths = executionPathsFor(m.kind, pattern)
    const fundings = fundingSourcesFor(m.provider)

    for (const executionPath of paths) {
      for (const fundingSource of fundings) {
        const expected = classify(m.provider, support, fundingSource)
        rows.push({
          provider:       m.provider,
          model:          m.key,
          wireModel:      m.wireModel,
          modality:       m.kind,
          executionPath,
          fundingSource,
          pattern,
          supportLevel:   support,
          expected:       expected.outcome,
          expectedErrorCode: expected.code,
        })
      }
    }
  }

  // Deterministic ordering — primary key (provider, model, executionPath, fundingSource).
  return rows.sort((a, b) => {
    return (
      a.provider.localeCompare(b.provider) ||
      a.model.localeCompare(b.model) ||
      a.executionPath.localeCompare(b.executionPath) ||
      a.fundingSource.localeCompare(b.fundingSource)
    )
  })
}

function classify(
  provider: AnyProvider,
  support: ProviderSupportLevel,
  funding: FundingSource,
): { outcome: ExpectedOutcome; code?: CapabilityMatrixEntry['expectedErrorCode'] } {
  if (support === 'deprecated') {
    return { outcome: 'deprecated_blocked', code: 'unsupported_model' }
  }
  if (support === 'catalog_only') {
    return { outcome: 'catalog_only_blocked', code: 'unsupported_model' }
  }
  // `platform_credit` and `sponsored` both flow through the Chainabit
  // gateway. Providers not wired to that gateway cannot use those modes.
  if (
    (funding === 'platform_credit' || funding === 'sponsored') &&
    !CHAINABIT_GATEWAY_PROVIDERS.has(provider)
  ) {
    return { outcome: 'byok_only_no_credit', code: 'permission_denied' }
  }
  if (support === 'byok_only' && (funding === 'platform_credit' || funding === 'sponsored')) {
    return { outcome: 'byok_only_no_credit', code: 'permission_denied' }
  }
  if (LOCAL_PROVIDERS.has(provider) && funding !== 'user_byok_local') {
    return { outcome: 'no_cloud_for_local', code: 'auth_failed' }
  }
  if (!LOCAL_PROVIDERS.has(provider) && funding === 'user_byok_local') {
    return { outcome: 'no_local_for_cloud', code: 'auth_failed' }
  }
  return { outcome: 'runnable' }
}
