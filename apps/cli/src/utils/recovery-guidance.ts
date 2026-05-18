/**
 * Recovery guidance system for the LenserFight CLI.
 *
 * Maps each error kind to actionable recovery steps that help developers
 * understand what to do next without overwhelming them with raw log output.
 *
 * Design principles:
 * - Progressive disclosure: concise by default, detailed only in --debug.
 * - Context-aware: guidance varies by local vs cloud mode where relevant.
 * - Never spam: docs links are only surfaced when confusion risk is high.
 * - Calm tone: guide toward the next step, never alarm.
 */

import type { CliErrorKind } from './error-taxonomy'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecoveryGuidance {
  /** Single-sentence recovery strategy — always shown. */
  strategy: string
  /**
   * Short actionable hints (command or config action).
   * First 2 are shown by default; all hints visible in --debug.
   */
  hints: string[]
  /**
   * System area to inspect (file path, command, log location, or UI area).
   * Shown as "inspect: <area>" below the hints.
   */
  inspectArea: string
  /**
   * Key into docs-registry for the most relevant page.
   * Rendered as a clickable docs link when the terminal supports it.
   */
  docsKey: string
  /**
   * Optional workflow/battle context to attach when available from the error.
   * The reporter fills this from structured error metadata.
   */
  contextLabel?: string
}

// ─── Guidance table ───────────────────────────────────────────────────────────

const GUIDANCE: Record<CliErrorKind, RecoveryGuidance> = {
  unauthorized: {
    strategy: 'Sign in or refresh your session, then retry.',
    hints: [
      'lf auth login',
      'lf auth token --refresh',
      'echo $LF_AUTH_TOKEN   # check env override',
      'lf doctor   # shows device config path and auth status',
    ],
    inspectArea: 'lf auth login',
    docsKey: 'auth-login',
  },

  forbidden: {
    strategy: 'Your account lacks permission for this action — check your role.',
    hints: [
      'lf auth whoami',
      'lf team list   # verify membership',
      'contact the workspace admin to grant access',
    ],
    inspectArea: 'lf auth whoami',
    docsKey: 'permissions',
  },

  not_found: {
    strategy: 'Verify the resource ID or slug and check if it has been deleted.',
    hints: [
      'double-check the ID / slug argument',
      'lf battle list   # list available battles',
      'lf lenser list   # list available lensers',
    ],
    inspectArea: 'verify the ID or slug',
    docsKey: 'resources',
  },

  rate_limited: {
    strategy: 'You have hit a rate limit — wait and retry, or spread requests over time.',
    hints: [
      'lf status   # check current quota usage',
      'wait ~1 hour before creating more battles',
      'use `--local` mode for unlimited local execution',
    ],
    inspectArea: 'lf status',
    docsKey: 'rate-limits',
  },

  network: {
    strategy: 'Check your network connection or switch to --local mode.',
    hints: [
      'lf doctor   # run connectivity checks',
      'lf --local <command>   # bypass cloud for local execution',
      'check VPN / firewall settings',
      'ping api.lenserfight.com',
    ],
    inspectArea: 'lf doctor',
    docsKey: 'connectivity',
  },

  gateway: {
    strategy: 'Start the local Trust Gateway, then retry.',
    hints: [
      'lf gateway start',
      'lf gateway status   # verify it is running',
      'lf gateway pair     # re-pair browser ↔ CLI if needed',
      'lf gateway doctor   # full gateway health check',
    ],
    inspectArea: 'lf gateway status',
    docsKey: 'gateway-setup',
  },

  provider: {
    strategy: 'Verify the provider API key, model name, and quota, then retry.',
    hints: [
      'lf providers list   # check registered providers',
      'lf byok list        # check BYOK key status',
      'echo $OPENAI_API_KEY | head -c 10   # verify key is set',
      'lf providers test --provider <name>',
    ],
    inspectArea: 'lf providers list',
    docsKey: 'providers',
  },

  multimodal: {
    strategy: 'Choose a provider that supports the required modality chain.',
    hints: [
      'lf providers list --capabilities',
      'check that the provider supports the input/output modalities',
      'split the chain: use one provider per modality hop',
      'lf workflow inspect --workflow <id>   # review node modalities',
    ],
    inspectArea: 'lf providers list --capabilities',
    docsKey: 'multimodal',
  },

  workflow: {
    strategy: 'Inspect the failing node and its upstream dependencies.',
    hints: [
      'lf workflow inspect --workflow <id>',
      'lf workflow run --workflow <id> --debug',
      'check the node\'s provider is registered and reachable',
      'lf workflow validate --workflow <id>   # schema check',
    ],
    inspectArea: 'lf workflow inspect',
    docsKey: 'workflow-debug',
  },

  battle: {
    strategy: 'Inspect the battle state and retry the failing lifecycle step.',
    hints: [
      'lf battle inspect --battle <id>',
      'lf battle replay --battle <id>   # re-run reproducibly',
      'lf run --battle <id> --debug      # verbose local run',
      'check both contenders have valid providers',
    ],
    inspectArea: 'lf battle inspect',
    docsKey: 'battle-lifecycle',
  },

  schema: {
    strategy: 'Fix the malformed input or payload, then retry.',
    hints: [
      'lf validate --file <path>   # validate locally',
      'check required fields in the request body',
      'lf schema show --kind <type>   # inspect expected shape',
    ],
    inspectArea: 'lf validate',
    docsKey: 'schemas',
  },

  config: {
    strategy: 'Initialize or repair your project config, then retry.',
    hints: [
      'lf init   # create or repair .lenserfight/config.json',
      'lf doctor # run full config health check',
      'lf env    # review active environment variables',
      'lf doctor   # inspect device config path and content',
    ],
    inspectArea: 'lf doctor',
    docsKey: 'configuration',
  },

  local_model: {
    strategy: 'Ensure Ollama is running and the required model is pulled.',
    hints: [
      'ollama serve   # start Ollama if not running',
      'ollama pull <model>   # pull missing model',
      'lf gateway status     # check gateway ↔ Ollama bridge',
      'curl http://localhost:11434/api/tags   # list available models',
    ],
    inspectArea: 'lf gateway status',
    docsKey: 'local-models',
  },

  unknown: {
    strategy: 'Run with --debug for a stack trace, then check the troubleshooting docs.',
    hints: [
      'retry the command with --debug',
      'lf doctor   # run environment health checks',
      'check recent changes to config or providers',
    ],
    inspectArea: 'lf doctor',
    docsKey: 'troubleshooting',
  },
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Return the full recovery guidance for an error kind. */
export function getRecoveryGuidance(kind: CliErrorKind): RecoveryGuidance {
  return GUIDANCE[kind]
}

/**
 * Return a compact slice of hints suitable for the default (non-debug) surface.
 * Shows the first `n` hints (default 2) to keep output scannable.
 */
export function compactHints(kind: CliErrorKind, n = 2): string[] {
  return GUIDANCE[kind].hints.slice(0, n)
}

/**
 * Return all hints — used in --debug mode for full progressive disclosure.
 */
export function allHints(kind: CliErrorKind): string[] {
  return GUIDANCE[kind].hints
}

/**
 * Build a context label from structured error metadata.
 * Attaches workflow/battle/provider context to the guidance when available.
 */
export function buildContextLabel(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e = error as Record<string, unknown>

  const parts: string[] = []
  if (typeof e['battleId'] === 'string') parts.push(`battle:${e['battleId']}`)
  if (typeof e['workflowId'] === 'string') parts.push(`workflow:${e['workflowId']}`)
  if (typeof e['nodeId'] === 'string') parts.push(`node:${e['nodeId']}`)
  if (typeof e['provider'] === 'string') parts.push(`provider:${e['provider']}`)
  if (typeof e['phase'] === 'string') parts.push(`phase:${e['phase']}`)
  if (typeof e['modality'] === 'string') parts.push(`modality:${e['modality']}`)

  return parts.length > 0 ? parts.join('  ') : undefined
}
