/**
 * Centralized error taxonomy for the LenserFight CLI.
 *
 * Every CLI failure should pass through `classifyError()` so that:
 * - The developer sees a consistent, semantically-colored error surface.
 * - Recovery hints, docs links, and inspection areas are attached automatically.
 * - JSON/CI modes receive structured output rather than decorated banners.
 *
 * Extend the `CliErrorKind` union and `TAXONOMY` map when adding new failure
 * domains — do NOT scatter ad-hoc error logic across command files.
 */

// ─── Error kinds ─────────────────────────────────────────────────────────────

export type CliErrorKind =
  | 'unauthorized'    // 401 / JWT invalid / not signed in
  | 'forbidden'       // 403 / RLS denied / insufficient permissions
  | 'not_found'       // 404 / resource does not exist
  | 'rate_limited'    // 429 / quota / battle-rate-limit
  | 'network'         // fetch TypeError / DNS failure / timeout
  | 'gateway'         // local Trust Gateway unavailable / pairing failure
  | 'provider'        // AI provider API failure (OpenAI, Anthropic, Ollama …)
  | 'multimodal'      // modality mismatch / unsupported capability chain
  | 'workflow'        // workflow node failure / DAG execution error
  | 'battle'          // battle lifecycle failure (submit, vote, finalize …)
  | 'schema'          // schema validation failure / invalid JSON / malformed input
  | 'config'          // missing or invalid project / device config
  | 'local_model'     // Ollama / local-model specific failure
  | 'unknown'         // unclassified

// ─── Taxonomy entry ───────────────────────────────────────────────────────────

export interface TaxonomyEntry {
  /** Machine-readable classification. */
  kind: CliErrorKind
  /** Short uppercase headline shown in the error banner. */
  headline: string
  /** Human-readable explanation sentence. */
  detail: string
  /** True when a developer-action can recover from this without code changes. */
  recoverable: boolean
  /**
   * Which system component produced this error.
   * Used to direct inspection (e.g., "gateway", "provider", "workflow engine").
   */
  component: string
  /** Key into the docs-registry for the most relevant documentation page. */
  docsKey: string
  /**
   * Where a developer should look first (path hint, command, file, or UI area).
   * Keep short — it appears inline in the error surface.
   */
  inspectArea: string
}

// ─── Taxonomy ─────────────────────────────────────────────────────────────────

const TAXONOMY: Record<CliErrorKind, Omit<TaxonomyEntry, 'kind'>> = {
  unauthorized: {
    headline: 'ACCESS DENIED',
    detail: 'Authentication required. Your session may have expired.',
    recoverable: true,
    component: 'auth',
    docsKey: 'auth-login',
    inspectArea: 'lf auth login',
  },
  forbidden: {
    headline: 'PERMISSION DENIED',
    detail: 'Your account does not have permission to perform this action.',
    recoverable: false,
    component: 'auth / RLS',
    docsKey: 'permissions',
    inspectArea: 'lf auth whoami',
  },
  not_found: {
    headline: 'NOT FOUND',
    detail: 'The requested resource does not exist or has been deleted.',
    recoverable: false,
    component: 'api',
    docsKey: 'resources',
    inspectArea: 'verify the ID or slug',
  },
  rate_limited: {
    headline: 'RATE LIMITED',
    detail: 'Request quota exceeded. You can create at most 5 battles per 24-hour window.',
    recoverable: true,
    component: 'api',
    docsKey: 'rate-limits',
    inspectArea: 'lf status',
  },
  network: {
    headline: 'NETWORK FAILURE',
    detail: 'Could not reach the remote endpoint. Check connectivity or run with --local.',
    recoverable: true,
    component: 'network',
    docsKey: 'connectivity',
    inspectArea: 'lf doctor',
  },
  gateway: {
    headline: 'GATEWAY UNAVAILABLE',
    detail: 'The local Trust Gateway is not running or is unreachable on its loopback port.',
    recoverable: true,
    component: 'gateway',
    docsKey: 'gateway-setup',
    inspectArea: 'lf gateway status',
  },
  provider: {
    headline: 'PROVIDER FAILURE',
    detail: 'The AI provider returned an error. The key, quota, or model may be invalid.',
    recoverable: true,
    component: 'provider',
    docsKey: 'providers',
    inspectArea: 'lf providers list',
  },
  multimodal: {
    headline: 'MODALITY MISMATCH',
    detail: 'The selected provider does not support the required modality chain.',
    recoverable: true,
    component: 'provider / workflow',
    docsKey: 'multimodal',
    inspectArea: 'lf providers list --capabilities',
  },
  workflow: {
    headline: 'WORKFLOW FAILURE',
    detail: 'A workflow node failed during execution. Check the node and its upstream dependencies.',
    recoverable: true,
    component: 'workflow engine',
    docsKey: 'workflow-nodes',
    inspectArea: 'lf workflow inspect',
  },
  battle: {
    headline: 'BATTLE ERROR',
    detail: 'The battle lifecycle encountered an unexpected error.',
    recoverable: true,
    component: 'battle runner',
    docsKey: 'battle-lifecycle',
    inspectArea: 'lf battle inspect',
  },
  schema: {
    headline: 'SCHEMA INVALID',
    detail: 'The input or payload does not match the expected schema.',
    recoverable: true,
    component: 'schema validator',
    docsKey: 'schemas',
    inspectArea: 'lf validate',
  },
  config: {
    headline: 'CONFIG ERROR',
    detail: 'Project or device config is missing or invalid. Run `lf init` to set up.',
    recoverable: true,
    component: 'config',
    docsKey: 'configuration',
    inspectArea: 'lf doctor',
  },
  local_model: {
    headline: 'LOCAL MODEL FAILURE',
    detail: 'Ollama or the local provider is unavailable or the model is not pulled.',
    recoverable: true,
    component: 'local model (Ollama)',
    docsKey: 'local-models',
    inspectArea: 'lf gateway status',
  },
  unknown: {
    headline: 'ERROR',
    detail: 'An unexpected error occurred.',
    recoverable: false,
    component: 'unknown',
    docsKey: 'troubleshooting',
    inspectArea: 'lf doctor',
  },
}

// ─── Raw message helpers ──────────────────────────────────────────────────────

function msg(error: unknown): string {
  if (!error || typeof error !== 'object') return String(error)
  const e = error as Record<string, unknown>
  return typeof e['message'] === 'string' ? e['message'] : ''
}

function code(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const e = error as Record<string, unknown>
  return typeof e['code'] === 'string' ? e['code'] : ''
}

function status(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e = error as Record<string, unknown>
  return typeof e['status'] === 'number' ? e['status'] : undefined
}

// ─── Classifier ───────────────────────────────────────────────────────────────

/**
 * Classify an arbitrary thrown value into a structured `TaxonomyEntry`.
 *
 * The classifier uses HTTP status codes, error codes, and message heuristics.
 * Order matters: more-specific checks come first.
 */
export function classifyError(error: unknown): TaxonomyEntry {
  const m = msg(error).toLowerCase()
  const c2 = code(error).toUpperCase()
  const s = status(error)

  // Rate limit
  if (s === 429 || c2 === 'BATTLE_RATE_LIMIT' || m.includes('rate_limit') || m.includes('battle_rate_limit')) {
    return entry('rate_limited', error)
  }

  // Auth
  if (
    s === 401 ||
    c2 === 'PGRST301' ||
    c2 === 'PGRST302' ||
    m.includes('jwt') ||
    m.includes('unauthorized') ||
    m.includes('not authenticated') ||
    m.includes('authentication required')
  ) {
    return entry('unauthorized', error)
  }

  // Forbidden
  if (s === 403 || m.includes('forbidden') || m.includes('permission denied') || m.includes('rls')) {
    return entry('forbidden', error)
  }

  // Config — checked BEFORE generic not_found to prevent phrase collision
  // (e.g. "Supabase anon key not found" contains "not found" but is a config issue)
  if (
    c2 === 'CONFIG_ERROR' ||
    m.includes('supabase anon key not found') ||
    m.includes('service role key not found') ||
    m.includes('not configured')
  ) {
    return entry('config', error)
  }

  // Not found
  if (s === 404 || m.includes('not found') || m.includes('does not exist')) {
    return entry('not_found', error)
  }

  // Gateway
  if (
    c2 === 'GATEWAY_UNAVAILABLE' ||
    m.includes('gateway') ||
    m.includes('trust gateway') ||
    (m.includes('econnrefused') && m.includes('54320'))
  ) {
    return entry('gateway', error)
  }

  // Local model (Ollama-specific)
  if (
    c2 === 'OLLAMA_ERROR' ||
    m.includes('ollama') ||
    m.includes('local model') ||
    (m.includes('econnrefused') && m.includes('11434'))
  ) {
    return entry('local_model', error)
  }

  // Multimodal — checked BEFORE provider to avoid "provider does not support text-to-image"
  // being swallowed by the more generic provider check
  if (
    c2 === 'MODALITY_MISMATCH' ||
    m.includes('modality') ||
    m.includes('multimodal') ||
    m.includes('unsupported capability') ||
    m.includes('image-to-') ||
    m.includes('text-to-image')
  ) {
    return entry('multimodal', error)
  }

  // Provider
  if (
    c2 === 'PROVIDER_ERROR' ||
    m.includes('provider') ||
    m.includes('openai') ||
    m.includes('anthropic') ||
    m.includes('model error') ||
    m.includes('api key') ||
    m.includes('invalid_api_key') ||
    m.includes('quota exceeded')
  ) {
    return entry('provider', error)
  }

  // Workflow
  if (
    c2 === 'WORKFLOW_ERROR' ||
    m.includes('workflow') ||
    m.includes('node execution') ||
    m.includes('dag') ||
    m.includes('upstream')
  ) {
    return entry('workflow', error)
  }

  // Battle
  if (
    c2 === 'BATTLE_ERROR' ||
    m.includes('battle') ||
    m.includes('contender') ||
    m.includes('leaderboard')
  ) {
    return entry('battle', error)
  }

  // PostgREST schema-exposure errors (e.g. "Invalid schema: agents") — must
  // come BEFORE the generic 'schema' check which would swallow these.
  if (
    c2 === 'PGRST106' ||
    m.includes('invalid schema') ||
    m.includes('no schema named')
  ) {
    return entry('config', error)
  }

  // Schema / validation
  if (
    c2 === 'SCHEMA_INVALID' ||
    m.includes('schema') ||
    m.includes('validation') ||
    m.includes('invalid json') ||
    m.includes('malformed') ||
    m.includes('zod')
  ) {
    return entry('schema', error)
  }

  // Config (general phrase — specific phrases handled earlier before not_found)
  if (m.includes('config') && m.includes('error')) {
    return entry('config', error)
  }

  // Network (last resort for TypeErrors — must come after specific checks)
  if (error instanceof TypeError && (m.includes('fetch') || m.includes('network') || m.includes('enotfound'))) {
    return entry('network', error)
  }

  // Generic network signals
  if (m.includes('enotfound') || m.includes('econnrefused') || m.includes('etimedout')) {
    return entry('network', error)
  }

  return entry('unknown', error)
}

// ─── Internal factory ─────────────────────────────────────────────────────────

function entry(kind: CliErrorKind, error: unknown): TaxonomyEntry {
  const base = TAXONOMY[kind]
  const rawDetail = msg(error) || base.detail

  return {
    kind,
    ...base,
    // Preserve the raw error message as a detail override when it's more informative
    // than the taxonomy default — but only for non-generic strings.
    detail: rawDetail && rawDetail !== base.detail && !isGenericMessage(rawDetail)
      ? rawDetail
      : base.detail,
  }
}

function isGenericMessage(m: string): boolean {
  const lower = m.toLowerCase().trim()
  // Very short messages (≤ 8 chars) are uninformative — use taxonomy default.
  if (lower.length <= 8) return true
  // Common HTTP status texts and generic placeholders.
  const generics = [
    'error', 'failed', 'failure', 'unknown error', 'internal server error',
    'an error occurred', 'unauthorized', 'forbidden', 'not found',
    'bad request', 'service unavailable',
  ]
  return generics.includes(lower)
}

// ─── Serialization ────────────────────────────────────────────────────────────

/** Serialize a TaxonomyEntry to a plain object suitable for JSON output. */
export function serializeTaxonomyEntry(entry: TaxonomyEntry, error: unknown): Record<string, unknown> {
  return {
    kind: entry.kind,
    headline: entry.headline,
    detail: entry.detail,
    recoverable: entry.recoverable,
    component: entry.component,
    docsKey: entry.docsKey,
    inspectArea: entry.inspectArea,
    raw: error instanceof Error ? {
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    } : String(error),
  }
}
