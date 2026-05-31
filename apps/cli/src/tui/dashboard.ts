import { runChild } from './run-child'
import { getActiveProfileName } from '../utils/profiles'
import { probeBackendHealth } from '../lib/health-probe'
import { getHumanActivityFeed } from '../lib/data-services'
import { getAgentWorkspaceContext } from '../lib/agent-workspace-context'
import { formatAgentWorkspaceBanner } from '../commands/agents'
import { getAgentWorkspaceOpsLines } from '../commands/agents/workspace-ops'
import { truncate } from '../utils/output'
import { A, sym } from '../utils/ansi'

// Pure helpers — exported for unit tests without standing up a TTY.

export function formatHealthStatus(ok: boolean): string {
  return ok
    ? `${A.bgGreen}${A.white}${A.bold} ${sym.pass} HEALTHY ${A.reset}`
    : `${A.bgRed}${A.white}${A.bold} ${sym.fail}  DOWN   ${A.reset}`
}

interface ActionLogRow {
  id?: string
  ai_lenser_id?: string
  team_run_id?: string | null
  action_type?: string
  payload?: Record<string, unknown>
  created_at?: string
}

export function formatActionLogRow(row: ActionLogRow): string {
  const ts = row.created_at ? new Date(row.created_at).toLocaleString() : '—'
  const action = (row.action_type ?? '—').padEnd(20)
  const payload = row.payload ? JSON.stringify(row.payload) : ''
  return `${A.gray}${ts}${A.reset}  ${A.brightCyan}${action}${A.reset}  ${A.dim}${truncate(payload, 72)}${A.reset}`
}

function keyBind(key: string, label: string): string {
  return `${A.gray}[${A.reset}${A.brightYellow}${key}${A.reset}${A.gray}]${A.reset} ${A.dim}${label}${A.reset}`
}

// ─── Command catalog (for autocomplete) ──────────────────────────────────────

export const COMMAND_CATALOG: Array<{ cmd: string; desc: string }> = [
  // ── auth ────────────────────────────────────────────────────────────────────
  { cmd: 'auth login',                    desc: 'Log in to LenserFight' },
  { cmd: 'auth logout',                   desc: 'Log out' },
  { cmd: 'auth whoami',                   desc: 'Show current user' },
  { cmd: 'auth refresh',                  desc: 'Refresh auth token' },
  { cmd: 'auth token request',            desc: 'Request an auth token' },
  { cmd: 'auth developer-token register', desc: 'Register a developer token' },
  // ── battle ──────────────────────────────────────────────────────────────────
  { cmd: 'battle create',                 desc: 'Create a new battle' },
  { cmd: 'battle join',                   desc: 'Join an existing battle' },
  { cmd: 'battle list',                   desc: 'List recent battles' },
  { cmd: 'battle view',                   desc: 'View battle details' },
  { cmd: 'battle run',                    desc: 'Run a battle round' },
  { cmd: 'battle submit',                 desc: 'Submit a contender response' },
  { cmd: 'battle open',                   desc: 'Open a battle for submissions' },
  { cmd: 'battle start-voting',           desc: 'Start the voting phase' },
  { cmd: 'battle finalize',               desc: 'Finalize battle results' },
  { cmd: 'battle publish',                desc: 'Publish battle to public feed' },
  { cmd: 'battle leaderboard',            desc: 'Show battle leaderboard' },
  { cmd: 'battle invite',                 desc: 'Create a battle invite link' },
  { cmd: 'battle clone',                  desc: 'Clone an existing battle' },
  { cmd: 'battle delete',                 desc: 'Delete a battle' },
  { cmd: 'battle create-from-template',   desc: 'Create battle from a template' },
  { cmd: 'battle vote',                   desc: 'Vote on a battle' },
  { cmd: 'battle close-voting',           desc: 'Close the voting phase' },
  { cmd: 'battle close',                  desc: 'Close a battle' },
  { cmd: 'battle archive',                desc: 'Archive a battle' },
  { cmd: 'battle retract',                desc: 'Retract a battle' },
  { cmd: 'battle comments',               desc: 'View battle comments' },
  { cmd: 'battle messages',               desc: 'View battle messages' },
  { cmd: 'battle post-message',           desc: 'Post a global moderator/system message to a battle' },
  { cmd: 'battle feed',                   desc: 'Fetch cursor-based public battles feed' },
  { cmd: 'battle dispatch',               desc: 'Execute cloud battle submission (BYOK/Ollama)' },
  { cmd: 'battle exec',                   desc: 'Execute cloud battle with BYOK keys' },
  { cmd: 'battle schedule',               desc: 'Schedule automatic server-side AI execution' },
  { cmd: 'battle set-schedule',           desc: 'Set autonomous lifecycle schedule (open/judge/publish times)' },
  { cmd: 'battle force-transition',       desc: 'Force battle into target status (admin only)' },
  { cmd: 'battle jobs',                   desc: 'Show execution job status for a battle' },
  { cmd: 'battle stream-feed',            desc: 'Tail INSERT/UPDATE events on battles via Supabase realtime' },
  { cmd: 'battle rematch',                desc: 'Create a rematch from an existing battle slug' },
  { cmd: 'battle export',                 desc: 'Export a battle as JSON or Markdown digest' },
  // battle file (file workspace)
  { cmd: 'battle file init',             desc: 'Create a file-workspace battle (no cloud or auth required)' },
  { cmd: 'battle file add-contender',    desc: 'Add or replace a contender slot (A or B)' },
  { cmd: 'battle file run',              desc: 'Execute both contenders using BYOK keys' },
  { cmd: 'battle file vote',             desc: 'Cast a vote on a file-workspace battle' },
  { cmd: 'battle file status',           desc: 'Show state and vote tally' },
  { cmd: 'battle file list',             desc: 'List all file-workspace battles' },
  { cmd: 'battle file push',             desc: 'Push a file battle draft to Cloud' },
  // battle byok-key
  { cmd: 'battle byok-key set',           desc: 'Store an encrypted BYOK key for an agent' },
  { cmd: 'battle byok-key list',          desc: 'List BYOK key hints for an agent' },
  { cmd: 'battle byok-key revoke',        desc: 'Revoke a BYOK key' },
  // battle tournament
  { cmd: 'battle tournament create',      desc: 'Create a new tournament' },
  { cmd: 'battle tournament register',    desc: 'Register as a tournament contender' },
  { cmd: 'battle tournament start',       desc: 'Start the tournament — seeds bracket and creates round 1 battles' },
  { cmd: 'battle tournament bracket',     desc: 'Show the tournament bracket' },
  // ── lenser ──────────────────────────────────────────────────────────────────
  { cmd: 'lenser find',                   desc: 'Find a human or AI lenser by @handle' },
  { cmd: 'lenser list',                   desc: 'List lensers (--type ai|human|all)' },
  { cmd: 'lenser ai connect',             desc: 'Register a new AI lenser (gateway runner)' },
  { cmd: 'lenser ai list',                desc: 'List your and public AI lensers' },
  { cmd: 'lenser ai view',                desc: 'View AI lenser profile and status' },
  { cmd: 'lenser ai remove',              desc: 'Deactivate a gateway runner' },
  { cmd: 'lenser ai enable',              desc: 'Re-activate a deactivated runner' },
  { cmd: 'lenser ai test',                desc: 'Probe a gateway runner' },
  { cmd: 'lenser ai types',               desc: 'Supported AI adapter types' },
  { cmd: 'lenser ai pause',               desc: 'Pause an AI lenser — block new runs' },
  { cmd: 'lenser ai resume',              desc: 'Resume a paused AI lenser' },
  { cmd: 'lenser ai status',              desc: 'Workspace settings and active run count' },
  { cmd: 'lenser human follow',           desc: 'Follow a human lenser by @handle or UUID' },
  { cmd: 'lenser human unfollow',         desc: 'Unfollow a human lenser' },
  { cmd: 'lenser human followers',        desc: 'List followers' },
  { cmd: 'lenser human following',        desc: 'List following' },
  { cmd: 'lenser human suggested',        desc: 'Suggested lensers by tag overlap' },
  { cmd: 'lenser human threads',          desc: 'Personalised thread feed' },
  // ── run (top-level) ─────────────────────────────────────────────────────────
  { cmd: 'run submit',                    desc: 'Submit a response for a running battle' },
  { cmd: 'run vote',                      desc: 'Vote on a run' },
  { cmd: 'run full',                      desc: 'Full execution flow for a workflow' },
  { cmd: 'run replay',                    desc: 'Replay a previous run' },
  { cmd: 'run exec',                      desc: 'Execute a run with BYOK/Ollama keys' },
  { cmd: 'run cancel',                    desc: 'Cancel a running execution' },
  { cmd: 'run report',                    desc: 'Report a run' },
  { cmd: 'run incidents',                 desc: 'View run incidents' },
  { cmd: 'run policy-check',              desc: 'Check run policy compliance' },
  // ── workflow ─────────────────────────────────────────────────────────────────
  { cmd: 'workflow run',                  desc: 'Run a workflow locally against a file-based automation object' },
  // ── execute / configure (unified hubs) ───────────────────────────────────────
  { cmd: 'execute status',                desc: 'Global execution queue health' },
  { cmd: 'execute history',               desc: 'Your execution history (activity, lens, workflow)' },
  { cmd: 'execute workflow list',         desc: 'List workflow runs' },
  { cmd: 'execute workflow wait',         desc: 'Wait for workflow run' },
  { cmd: 'execute workflow stream',       desc: 'Stream workflow events (SSE-style)' },
  { cmd: 'execute battle exec',           desc: 'Cloud battle AI execution' },
  { cmd: 'execute battle dispatch',       desc: 'Dispatch battle agent' },
  { cmd: 'execute battle file-run',       desc: 'File-workspace battle run' },
  { cmd: 'execute lens prompt',           desc: 'Lens/model prompt execution' },
  // ── agents / workflows hubs ─────────────────────────────────────────────────
  { cmd: 'agents use',                    desc: 'Select agent workspace context' },
  { cmd: 'agents ops',                    desc: 'Show workspace operations menu' },
  { cmd: 'agents list',                   desc: 'List your AI agents' },
  { cmd: 'agents get',                    desc: 'Get agent profile (workspace default)' },
  { cmd: 'agents runs',                   desc: 'Team runs for workspace agent' },
  { cmd: 'agents inspect',                desc: 'Workspace bootstrap (teams, runs)' },
  { cmd: 'agents dispatch',               desc: 'Dispatch workflow assignment' },
  { cmd: 'agents team list',              desc: 'List teams for workspace agent' },
  { cmd: 'agents memory search',          desc: 'Search agent memory' },
  { cmd: 'agents stop',                   desc: 'Pause workspace agent' },
  { cmd: 'agents kill',                   desc: 'Emergency: cancel runs + kill switch + pause' },
  { cmd: 'agents logs',                   desc: 'Action logs for workspace agent' },
  { cmd: 'workflows list',                desc: 'List cloud workflows' },
  { cmd: 'workflows get',                 desc: 'Workflow lifecycle status' },
  { cmd: 'workflows runs',                desc: 'Recent workflow runs' },
  { cmd: 'workflows schedule',            desc: 'Create workflow schedule' },
  { cmd: 'workflows insert',              desc: 'Insert workflow trigger' },
  { cmd: 'workflows stop',                desc: 'Cancel a workflow run' },
  { cmd: 'configure keys list',           desc: 'Local BYOK keys (file)' },
  { cmd: 'configure byok list',           desc: 'Cloud BYOK keys (Supabase)' },
  { cmd: 'configure ollama',              desc: 'Ollama local model URL' },
  { cmd: 'configure providers list',      desc: 'AI provider catalog' },
  // ── execution (legacy; prefer execute workflow) ───────────────────────────
  { cmd: 'execution list',                desc: 'List workflow executions' },
  { cmd: 'execution inspect',             desc: 'Inspect an execution in detail' },
  { cmd: 'execution provenance',          desc: 'Show execution provenance chain' },
  { cmd: 'execution events',              desc: 'Stream execution events' },
  { cmd: 'execution wait',                desc: 'Wait for execution to complete' },
  { cmd: 'execution cancel',              desc: 'Cancel a running execution' },
  { cmd: 'execution retry',               desc: 'Retry a failed execution' },
  // ── memory ───────────────────────────────────────────────────────────────────
  { cmd: 'memory list-profiles',          desc: 'List memory profiles for an agent' },
  { cmd: 'memory list-entries',           desc: 'List memory entries for an agent' },
  { cmd: 'memory write-entry',            desc: 'Write a memory entry for an agent' },
  { cmd: 'memory redact',                 desc: 'Redact a memory entry' },
  { cmd: 'memory search',                 desc: 'Full-text search across memories' },
  { cmd: 'memory summarize',              desc: 'Generate a memory summary for an agent' },
  // ── team ─────────────────────────────────────────────────────────────────────
  { cmd: 'team list',                     desc: 'List your teams' },
  { cmd: 'team create',                   desc: 'Create a team' },
  { cmd: 'team members',                  desc: 'List team members' },
  { cmd: 'team add-member',               desc: 'Add a member to a team' },
  { cmd: 'team remove-member',            desc: 'Remove a member from a team' },
  { cmd: 'team edges',                    desc: 'List team agent edges' },
  { cmd: 'team add-edge',                 desc: 'Add an agent edge to a team' },
  { cmd: 'team assign',                   desc: 'Assign agents to a team' },
  { cmd: 'team dispatch',                 desc: 'Dispatch a team run' },
  { cmd: 'team runs',                     desc: 'List team runs' },
  { cmd: 'team inspect',                  desc: 'Inspect a team run' },
  { cmd: 'team conversation',             desc: 'View team agent conversation' },
  { cmd: 'team scratchpad',               desc: 'View team scratchpad' },
  { cmd: 'team set-role',                 desc: 'Set agent role within a team' },
  // ── schedule ─────────────────────────────────────────────────────────────────
  { cmd: 'schedule list',                 desc: 'List workflow schedules' },
  { cmd: 'schedule inspect',              desc: 'Inspect a schedule' },
  { cmd: 'schedule create',               desc: 'Create a new schedule' },
  { cmd: 'schedule update',               desc: 'Update a schedule' },
  { cmd: 'schedule pause',                desc: 'Pause a schedule' },
  { cmd: 'schedule resume',               desc: 'Resume a paused schedule' },
  { cmd: 'schedule delete',               desc: 'Delete a schedule' },
  { cmd: 'schedule history',              desc: 'View schedule execution history' },
  { cmd: 'schedule health',               desc: 'Show schedule health status' },
  { cmd: 'schedule backfill',             desc: 'Backfill missed schedule runs' },
  // ── approval ─────────────────────────────────────────────────────────────────
  { cmd: 'approval list',                 desc: 'List pending approvals for an AI lenser' },
  { cmd: 'approval inspect',              desc: 'Inspect an approval request' },
  { cmd: 'approval approve',              desc: 'Approve a team run' },
  { cmd: 'approval reject',               desc: 'Reject a team run with a reason' },
  { cmd: 'approval audit',                desc: 'View approval audit log' },
  { cmd: 'approval grant-standing',       desc: 'Grant standing approval to a lenser' },
  { cmd: 'approval revoke-standing',      desc: 'Revoke standing approval' },
  { cmd: 'approval list-standing',        desc: 'List standing approvals' },
  { cmd: 'approval bulk-approve',         desc: 'Bulk approve pending requests' },
  // ── lens ──────────────────────────────────────────────────────────────────────
  { cmd: 'lens create',                   desc: 'Create a new lens with an initial draft version' },
  { cmd: 'lens version list',             desc: 'List versions for a lens' },
  { cmd: 'lens version create',           desc: 'Create a new draft version for a lens' },
  { cmd: 'lens version publish',          desc: 'Publish a draft lens version' },
  { cmd: 'lens resource attach',          desc: 'Attach a resource to a lens version' },
  { cmd: 'lens import',                   desc: 'Import lenses from a local directory' },
  { cmd: 'lens template list',            desc: 'List available lens scaffold templates' },
  { cmd: 'lens template use',             desc: 'Scaffold a new lens from a template' },
  // ── template ──────────────────────────────────────────────────────────────────
  { cmd: 'template create',               desc: 'Create a workflow template' },
  { cmd: 'template list',                 desc: 'List available templates' },
  { cmd: 'template view',                 desc: 'View a template definition' },
  { cmd: 'template delete',               desc: 'Delete a template' },
  { cmd: 'template apply',                desc: 'Apply a template to create a workflow' },
  { cmd: 'template set-recurrence',       desc: 'Set recurrence for a template' },
  { cmd: 'template list-recurring',       desc: 'List recurring template instances' },
  { cmd: 'template submit',               desc: 'Submit a template' },
  // ── gateway ───────────────────────────────────────────────────────────────────
  { cmd: 'gateway status',                desc: 'Show local gateway status' },
  { cmd: 'gateway serve',                 desc: 'Start the local gateway server' },
  { cmd: 'gateway models',                desc: 'List models available via gateway' },
  { cmd: 'gateway devices',               desc: 'List registered devices' },
  { cmd: 'gateway approve-device',        desc: 'Approve a device for gateway access' },
  { cmd: 'gateway lensers',               desc: 'List lensers via gateway' },
  { cmd: 'gateway doctor',                desc: 'Diagnose gateway issues' },
  { cmd: 'gateway identity',              desc: 'Manage gateway identity' },
  { cmd: 'gateway consent',               desc: 'Manage gateway consent settings' },
  // ── models ────────────────────────────────────────────────────────────────────
  { cmd: 'models list',                   desc: 'List available AI models' },
  { cmd: 'models show',                   desc: 'Show model details' },
  { cmd: 'models capabilities',           desc: 'Show model capabilities' },
  { cmd: 'models run',                    desc: 'Run inference via a model' },
  // ── automation ────────────────────────────────────────────────────────────────
  { cmd: 'automation list',               desc: 'List automation rules' },
  { cmd: 'automation create',             desc: 'Create an automation rule' },
  { cmd: 'automation enable',             desc: 'Enable an automation rule' },
  { cmd: 'automation disable',            desc: 'Disable an automation rule' },
  { cmd: 'automation delete',             desc: 'Delete an automation rule' },
  { cmd: 'automation history',            desc: 'Show automation execution history' },
  { cmd: 'automation test',               desc: 'Test an automation rule' },
  // ── tag ───────────────────────────────────────────────────────────────────────
  { cmd: 'tag follow',                    desc: 'Follow a tag' },
  { cmd: 'tag unfollow',                  desc: 'Unfollow a tag' },
  { cmd: 'tag followed',                  desc: 'List your followed tags' },
  // ── policy ────────────────────────────────────────────────────────────────────
  { cmd: 'policy log',                    desc: 'View policy enforcement log' },
  { cmd: 'policy stats',                  desc: 'Show policy statistics' },
  // ── report ────────────────────────────────────────────────────────────────────
  { cmd: 'report content',                desc: 'Report content for moderation' },
  { cmd: 'report list',                   desc: 'List moderation reports' },
  { cmd: 'report show',                   desc: 'Show a report' },
  { cmd: 'report incidents',              desc: 'Show report incidents' },
  // ── analytics ────────────────────────────────────────────────────────────────
  { cmd: 'analytics summary',             desc: 'Show analytics summary' },
  // ── budget ────────────────────────────────────────────────────────────────────
  { cmd: 'budget set',                    desc: 'Set credit budget' },
  { cmd: 'budget status',                 desc: 'Show current credit budget' },
  // ── kill-switch ───────────────────────────────────────────────────────────────
  { cmd: 'kill-switch on',                desc: 'Enable the global kill switch' },
  { cmd: 'kill-switch off',               desc: 'Disable the global kill switch' },
  { cmd: 'kill-switch status',            desc: 'Show kill switch status' },
  { cmd: 'kill-switch platform on',       desc: 'Enable a platform-level kill switch' },
  { cmd: 'kill-switch platform off',      desc: 'Disable a platform-level kill switch' },
  { cmd: 'kill-switch platform list',     desc: 'List all platform kill switches' },
  // ── dark-launch ───────────────────────────────────────────────────────────────
  { cmd: 'dark-launch enable',            desc: 'Enable a dark-launch flag' },
  { cmd: 'dark-launch disable',           desc: 'Disable a dark-launch flag' },
  { cmd: 'dark-launch status',            desc: 'Show dark-launch configuration' },
  // ── config ────────────────────────────────────────────────────────────────────
  { cmd: 'config show',                   desc: 'Show project config' },
  { cmd: 'config validate',               desc: 'Validate project config' },
  { cmd: 'config export',                 desc: 'Export config to a file' },
  { cmd: 'config import',                 desc: 'Import config from a file' },
  // ── completion ────────────────────────────────────────────────────────────────
  { cmd: 'completion bash',               desc: 'Generate bash shell completions' },
  { cmd: 'completion zsh',                desc: 'Generate zsh shell completions' },
  // ── standalone ────────────────────────────────────────────────────────────────
  { cmd: 'examples',                      desc: 'Show common CLI usage examples' },
  { cmd: 'env',                           desc: 'Show environment variable status' },
  { cmd: 'docs open <topic>',             desc: 'Open LenserFight docs in browser' },
  { cmd: 'docs list',                     desc: 'List available documentation topics' },
  { cmd: 'doctor',                        desc: 'Diagnose environment issues' },
  { cmd: 'top',                           desc: 'Real-time runtime telemetry dashboard' },
  { cmd: 'top monitor',                   desc: 'Expanded telemetry — all panels, per-core CPU, graphs' },
  { cmd: 'top battle',                    desc: 'Battle operations center — load, agents, resource pressure' },
  { cmd: 'top graph',                     desc: 'Rolling CPU/memory sparkline graphs' },
  { cmd: 'top infra',                     desc: 'Infrastructure view — service connectivity' },
  { cmd: 'top stream',                    desc: 'Pipe-friendly scrolling telemetry stream' },
  { cmd: 'status',                        desc: 'Show overall system status' },
  { cmd: 'feed',                          desc: 'Show the activity feed' },
  { cmd: 'leaderboard',                   desc: 'Show the global leaderboard' },
  { cmd: 'whats-new',                     desc: 'Show latest CLI changes' },
]

export function getSuggestions(input: string, max = 5): Array<{ cmd: string; desc: string }> {
  if (!input.trim()) return []
  const lower = input.toLowerCase()
  return COMMAND_CATALOG
    .filter((e) => e.cmd.startsWith(lower) || e.cmd.includes(lower))
    .slice(0, max)
}

// ─── Subcommand validation ────────────────────────────────────────────────────

const REQUIRED_FLAGS: Record<string, string[]> = {
  // approval
  'approval list':              ['--ai-lenser'],
  'approval inspect':           [],
  'approval approve':           [],
  'approval reject':            [],
  'approval audit':             [],
  'approval grant-standing':    [],
  'approval revoke-standing':   [],
  'approval bulk-approve':      [],
  // battle
  'battle view':                [],
  'battle submit':              [],
  'battle vote':                [],
  'battle post-message':        [],
  'battle stream-feed':         [],
  'battle rematch':             [],
  'battle export':              [],
  'battle dispatch':            [],
  'battle exec':                [],
  'battle set-schedule':        [],
  'battle force-transition':    [],
  'battle jobs':                [],
  'battle file run':           ['--id'],
  'battle file vote':          ['--slot'],
  'battle file status':        ['--id'],
  'battle file push':          ['--id'],
  'battle byok-key set':        ['--agent', '--provider'],
  'battle byok-key list':       ['--agent'],
  'battle byok-key revoke':     ['--agent'],
  // lenser
  'lenser find':                [],
  'lenser ai view':             [],
  'lenser human follow':        [],
  'lenser human unfollow':      [],
  'lenser ai pause':            [],
  'lenser ai resume':           [],
  'lenser ai status':           [],
  'lenser ai test':             [],
  // memory
  'memory list-entries':        ['--agent'],
  'memory list-profiles':       ['--agent'],
  'memory write-entry':         ['--agent'],
  'memory redact':              [],
  'memory search':              ['--agent', '--query'],
  'memory summarize':           ['--agent'],
  // team
  'team add-member':            [],
  'team remove-member':         [],
  'team dispatch':              [],
  'team inspect':               [],
  'team conversation':          [],
  'team scratchpad':            [],
  'team set-role':              [],
  // schedule
  'schedule inspect':           [],
  'schedule update':            [],
  'schedule delete':            [],
  'schedule history':           [],
  // execution
  'execution inspect':          [],
  'execution provenance':       [],
  'execution events':           [],
  'execution wait':             [],
  'execution cancel':           [],
  'execution retry':            [],
}

export function validateSubcommand(argv: string[]): string | null {
  // Try 3-token match first (e.g. 'battle local run'), then fall back to 2-token
  const sub3 = argv.slice(0, 3).join(' ')
  const sub2 = argv.slice(0, 2).join(' ')
  const required = REQUIRED_FLAGS[sub3] ?? REQUIRED_FLAGS[sub2]
  if (!required) return null

  const missing = required.filter((flag) => {
    const bare = flag.replace(/^--/, '')
    return !argv.some(
      (a) => a === flag || a.startsWith(`${flag}=`) || a === `--${bare}`,
    )
  })

  if (missing.length === 0) return null
  return `Missing required argument: ${missing.join(', ')}`
}

// ─── Health probe ────────────────────────────────────────────────────────────

async function probeHealth(): Promise<boolean> {
  return probeBackendHealth()
}

// ─── Cached render state (for synchronous repaints) ──────────────────────────

// Holds the last-fetched async values so we can repaint synchronously
// while the user types without waiting for network calls.
let _cachedProfile = 'default'
let _cachedHealthy = false
let _cachedLogs: ActionLogRow[] = []

async function fetchRecentLogs(): Promise<ActionLogRow[]> {
  try {
    const feed = await getHumanActivityFeed(10)
    return feed.map((item) => ({
      ai_lenser_id: item.ai_lenser_id,
      team_run_id: item.team_run_id,
      action_type: item.action_type ?? item.kind,
      payload: item.payload,
      created_at: item.occurred_at,
    }))
  } catch {
    return []
  }
}

// ─── Command bar state ────────────────────────────────────────────────────────

interface CmdBarState {
  active: boolean
  input: string
  error: string | null
  selectedSuggestion: number
}

let cmdState: CmdBarState = {
  active: false,
  input: '',
  error: null,
  selectedSuggestion: -1,
}

// ─── Command bar renderer (shared, synchronous) ───────────────────────────────

/**
 * Renders just the command bar lines into `buf`. No cursor tricks — callers
 * are responsible for having cleared the screen before calling paintScreen().
 */
function paintCommandBar(
  buf: string[],
  state: CmdBarState,
  promptPrefix: string,
): void {
  if (!state.active) return

  buf.push('')
  if (state.error) {
    buf.push(`  ${A.brightRed}${sym.fail}  ${state.error}${A.reset}`)
  }
  buf.push(
    `  ${A.gray}${promptPrefix}${A.reset} ${A.brightYellow}${sym.arrow}${A.reset} ` +
    `${A.brightWhite}${state.input}${A.reset}${A.brightYellow}▎${A.reset}` +
    `  ${A.dim}Enter to run  Tab/↑↓ to pick  Esc to cancel${A.reset}`,
  )

  const suggestions = getSuggestions(state.input)
  if (suggestions.length > 0) {
    buf.push('')
    suggestions.forEach((s, i) => {
      const selected = i === state.selectedSuggestion
      if (selected) {
        buf.push(`  ${A.bgBlue}${A.brightWhite}  ${sym.arrow} ${s.cmd.padEnd(32)}${A.dim}${s.desc}${A.reset}`)
      } else {
        buf.push(`  ${A.gray}${sym.dot}${A.reset}  ${A.brightCyan}${s.cmd.padEnd(32)}${A.reset}${A.dim}${s.desc}${A.reset}`)
      }
    })
  }
}

// ─── Main dashboard screen ────────────────────────────────────────────────────

function paintMainScreen(): void {
  const buf: string[] = []

  const brand = `${A.brightMagenta}${A.bold}${sym.fight}  LenserFight${A.reset}`
  const profilePart = `${A.gray}profile${A.reset}  ${A.brightCyan}${_cachedProfile}${A.reset}`
  const health = formatHealthStatus(_cachedHealthy)

  buf.push('')
  buf.push(`  ${brand}   ${A.gray}│${A.reset}   ${profilePart}   ${A.gray}│${A.reset}   ${health}`)
  const agentBanner = formatAgentWorkspaceBanner()
  if (agentBanner) {
    buf.push(`  ${agentBanner}`)
  }
  buf.push(`  ${A.gray}${'─'.repeat(60)}${A.reset}`)
  buf.push(`  ${A.gray}${new Date().toLocaleString()}  ${sym.dot}  refresh 2s${A.reset}`)
  buf.push('')
  buf.push(`  ${A.bold}${A.brightWhite}Recent agent logs${A.reset}  ${A.gray}${sym.dot}${sym.dot}${sym.dot}${A.reset}`)
  buf.push('')

  if (_cachedLogs.length === 0) {
    buf.push(`  ${A.gray}${sym.dot}  No action logs yet  ${sym.arrow}  waiting for events…${A.reset}`)
  } else {
    for (const row of _cachedLogs) {
      buf.push('  ' + formatActionLogRow(row))
    }
  }

  buf.push('')
  const bindings = [
    keyBind('g', 'agents'),
    keyBind('w', 'workflows'),
    keyBind('e', 'execute'),
    keyBind('k', 'configure'),
    keyBind('a', 'approvals'),
    keyBind('b', 'battles'),
    keyBind('s', 'schedules'),
    keyBind('m', 'memory'),
    keyBind('l', 'lensers'),
    keyBind('f', 'feed'),
    keyBind(':', 'command'),
    keyBind('q', 'quit'),
  ].join(`  ${A.gray}${sym.dot}${A.reset}  `)
  buf.push(`  ${bindings}`)

  paintCommandBar(buf, cmdState, 'lf')

  process.stdout.write(A.clearScreen + A.homeCursor + buf.join('\n') + '\n')
}

async function renderFrame(): Promise<void> {
  const [profile, healthy, logs] = await Promise.all([
    getActiveProfileName(),
    probeHealth(),
    fetchRecentLogs(),
  ])
  _cachedProfile = profile
  _cachedHealthy = healthy
  _cachedLogs = logs
  paintMainScreen()
}

// ─── Sub-dashboard types ──────────────────────────────────────────────────────

interface SubCommandDef {
  key: string
  /** Spawn immediately with these argv tokens. */
  cmd?: string[]
  /**
   * Pre-fill the command bar with this string so the user can append required
   * arguments (UUIDs, handles, flags) before running. Mutually exclusive with cmd.
   */
  prompt?: string
  label: string
}

interface SubDashboardDef {
  title: string
  commands: SubCommandDef[]
  exitKeys: string[]
  /** Visual + prompt behavior for workspace-style tabs. */
  workspace?: 'agent' | 'workflow'
}

/** Inject selected agent id into dashboard prompts when applicable. */
export function applyWorkspacePrompt(input: string, workspace?: SubDashboardDef['workspace']): string {
  if (workspace !== 'agent') return input
  const ctx = getAgentWorkspaceContext()
  if (!ctx) return input
  return input
    .replace(/\$AGENT/g, ctx.aiLenserId)
    .replace(/--ai-lenser $/, `--ai-lenser ${ctx.aiLenserId} `)
    .replace(/--agent $/, `--agent ${ctx.aiLenserId} `)
    .replace(/agents use $/, `agents use @${ctx.handle} `)
    .replace(/agents get $/, `agents get @${ctx.handle} `)
    .replace(/agents stop $/, `agents stop @${ctx.handle} `)
    .replace(/agents resume $/, `agents resume @${ctx.handle} `)
    .replace(/agents delete $/, `agents delete @${ctx.handle} `)
    .replace(/agents runs $/, `agents runs @${ctx.handle} `)
    .replace(/agents inspect $/, `agents inspect @${ctx.handle} `)
    .replace(/agents dispatch --assignment /, `agents dispatch --assignment `)
    .replace(/agents kill $/, `agents kill @${ctx.handle} --confirm `)
    .replace(/kill-switch status $/, `kill-switch status @${ctx.handle} `)
    .replace(/team inspect $/, `team inspect @${ctx.handle} `)
    .replace(/team list --ai-lenser $/, `team list --ai-lenser ${ctx.aiLenserId} `)
    .replace(/agents memory search --query /, `agents memory search --query `)
    .replace(/memory search --agent  --query /, `memory search --query `)
    .replace(/schedule create $/, `schedule create `)
}

const SUB_DASHBOARDS: Record<string, SubDashboardDef> = {
  a: {
    title: 'Approvals',
    commands: [
      { key: 'l', prompt: 'approval list --ai-lenser ',                             label: 'list approvals  [--ai-lenser <UUID> (--status=pending|approved|rejected)]' },
      { key: 'a', prompt: 'approval approve ',                                      label: 'approve run     [<RUN-UUID>]' },
      { key: 'r', prompt: 'approval reject ',                                       label: 'reject run      [<RUN-UUID> --reason <text>]' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  b: {
    title: 'Battles',
    commands: [
      { key: 'l', cmd:    ['battle', 'list'],                             label: 'list battles' },
      { key: 'v', prompt: 'battle view ',                                 label: 'view battle     [<SLUG-or-ID>]' },
      { key: 'c', prompt: 'battle create --lenser-a  --lenser-b ',        label: 'create battle   [--lenser-a <ID> --lenser-b <ID>]' },
      { key: 'x', prompt: 'battle exec ',                                 label: 'exec battle     [<id>]' },
      { key: 'd', prompt: 'battle dispatch ',                             label: 'dispatch battle [<id>]' },
      { key: 's', prompt: 'battle stream-feed ',                          label: 'stream battle   [<SLUG-or-ID>]' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  s: {
    title: 'Schedules',
    commands: [
      { key: 'l', cmd:    ['schedule', 'list'],                           label: 'list schedules' },
      { key: 'v', prompt: 'schedule view ',                               label: 'view schedule   [<ID>]' },
      { key: 'p', prompt: 'schedule pause ',                              label: 'pause schedule  [<ID>]' },
      { key: 'r', prompt: 'schedule resume ',                             label: 'resume schedule [<ID>]' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  m: {
    title: 'Memory',
    commands: [
      { key: 'p', prompt: 'memory list-profiles --agent ',                label: 'list profiles   [--agent <ID>]' },
      { key: 'l', prompt: 'memory list --agent ',                         label: 'list entries    [--agent <ID>]' },
      { key: 's', prompt: 'memory search --agent  --query ',              label: 'search memories [--agent <ID> --query <text>]' },
      { key: 'd', prompt: 'memory delete ',                               label: 'delete entry    [<ENTRY-UUID>]' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  l: {
    title: 'Lensers',
    commands: [
      { key: 'l', cmd:    ['lenser', 'list'],                             label: 'list lensers    [--type ai|human|all]' },
      { key: 'v', prompt: 'lenser ai view ',                              label: 'view AI lenser  [@handle|id]' },
      { key: 'f', cmd:    ['lenser', 'human', 'followers'],               label: 'list followers' },
      { key: 'g', cmd:    ['lenser', 'human', 'following'],              label: 'list following' },
      { key: 'd', cmd:    ['lenser', 'human', 'suggested'],              label: 'discover lensers' },
      { key: 'p', prompt: 'lenser ai pause ',                             label: 'pause AI lenser [@handle]' },
      { key: 'r', prompt: 'lenser ai resume ',                            label: 'resume AI lenser [@handle]' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  f: {
    title: 'Feed',
    commands: [
      { key: 'f', cmd: ['feed'],                                          label: 'show activity feed' },
      { key: 'l', cmd: ['leaderboard'],                                   label: 'show leaderboard' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  e: {
    title: 'Execute',
    commands: [
      { key: 's', cmd: ['execute', 'status'],                             label: 'execution health' },
      { key: 'h', cmd: ['execute', 'history'],                            label: 'your execution history' },
      { key: 'w', cmd: ['execute', 'workflow', 'list'],                  label: 'list workflow runs' },
      { key: 't', prompt: 'execute workflow wait ',                      label: 'wait run        [<RUN-UUID>]' },
      { key: 'v', prompt: 'execute workflow stream ',                    label: 'stream events   [<RUN-UUID>]' },
      { key: 'b', prompt: 'execute battle exec ',                        label: 'battle exec     [<id>]' },
      { key: 'p', prompt: 'execute lens prompt --model ',                label: 'lens prompt     [--model …]' },
      { key: 'd', prompt: 'execute team dispatch ',                       label: 'team dispatch   [args]' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  k: {
    title: 'Configure',
    commands: [
      { key: 'l', cmd: ['configure', 'keys', 'list'],                     label: 'local BYOK keys' },
      { key: 'b', cmd: ['configure', 'byok', 'list'],                     label: 'cloud BYOK hints' },
      { key: 'o', cmd: ['configure', 'ollama'],                           label: 'Ollama settings' },
      { key: 'p', cmd: ['configure', 'providers', 'list'],                label: 'AI providers' },
      { key: 'e', cmd: ['configure', 'env'],                              label: 'env resolution' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  g: {
    title: 'Agents',
    workspace: 'agent',
    commands: [
      { key: 'u', prompt: 'agents use ',                                  label: 'select workspace  [@handle|uuid]' },
      { key: 'c', cmd: ['agents', 'clear'],                               label: 'clear workspace selection' },
      { key: 'i', cmd: ['agents', 'context'],                             label: 'show workspace context' },
      { key: 'f', cmd: ['agents', 'ops'],                                  label: 'workspace operations menu' },
      { key: 'l', cmd: ['agents', 'list'],                                label: 'list agents' },
      { key: 'g', cmd: ['agents', 'get'],                                 label: 'get agent       (uses selection)' },
      { key: 'n', cmd: ['agents', 'create'],                              label: 'create / connect agent' },
      { key: 't', cmd: ['agents', 'inspect'],                             label: 'inspect workspace bootstrap' },
      { key: 'R', cmd: ['agents', 'runs'],                                label: 'team runs       (recent)' },
      { key: 'T', cmd: ['agents', 'team', 'list'],                         label: 'list teams' },
      { key: 'e', prompt: 'agents dispatch --assignment  --workflow-id ', label: 'dispatch assignment' },
      { key: 'o', cmd: ['agents', 'logs'],                                label: 'action logs' },
      { key: 'm', cmd: ['agents', 'memory'],                              label: 'memory profiles' },
      { key: 'E', prompt: 'agents memory search --query ',                 label: 'search memory   [--query …]' },
      { key: 'a', cmd: ['agents', 'approvals'],                           label: 'pending approvals' },
      { key: 's', cmd: ['agents', 'schedule'],                            label: 'list schedules' },
      { key: 'S', prompt: 'schedule create ',                              label: 'create schedule (wizard)' },
      { key: 'x', cmd: ['agents', 'stop'],                                label: 'stop agent      (pause)' },
      { key: 'r', cmd: ['agents', 'resume'],                             label: 'resume agent' },
      { key: 'K', prompt: 'kill-switch status ',                          label: 'kill switch status' },
      { key: 'k', cmd: ['agents', 'kill', '--confirm'],                    label: 'KILL workers    (emergency)' },
      { key: 'd', cmd: ['agents', 'delete'],                              label: 'delete agent    (uses selection)' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  w: {
    title: 'Workflows',
    workspace: 'workflow',
    commands: [
      { key: 'l', cmd: ['workflows', 'list'],                             label: 'list workflows' },
      { key: 'g', prompt: 'workflows get ',                               label: 'get lifecycle   [<uuid>]' },
      { key: 'n', prompt: 'workflows create --name ',                     label: 'create workflow [--name …]' },
      { key: 'i', prompt: 'workflows insert ',                            label: 'insert trigger  [<workflow-uuid>]' },
      { key: 'u', prompt: 'workflows update ',                            label: 'update schedule [<schedule-uuid>]' },
      { key: 'd', prompt: 'workflows delete ',                             label: 'delete workflow [<uuid>]' },
      { key: 'p', prompt: 'workflows stop ',                              label: 'stop run        [<run-uuid>]' },
      { key: 's', cmd: ['workflows', 'schedule'],                          label: 'create schedule (wizard)' },
      { key: 'r', cmd: ['workflows', 'runs'],                              label: 'list recent runs' },
      { key: 'f', prompt: 'workflows run ',                               label: 'run local file  [WORKFLOW.md]' },
      { key: 'v', prompt: 'workflows validate ',                           label: 'validate file   [WORKFLOW.md]' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
}

// ─── Sub-dashboard screen painter ────────────────────────────────────────────

function paintSubScreen(def: SubDashboardDef, subCmd: CmdBarState): void {
  const buf: string[] = []

  const brand = `${A.brightMagenta}${A.bold}${sym.fight}  LenserFight${A.reset}`
  const titleAccent =
    def.workspace === 'agent' && getAgentWorkspaceContext()
      ? `${A.brightGreen}${A.bold}`
      : def.workspace === 'workflow'
        ? `${A.brightBlue}${A.bold}`
        : `${A.brightCyan}${A.bold}`
  const title = `${titleAccent}${def.title}${A.reset}`

  buf.push('')
  buf.push(`  ${brand}   ${A.gray}│${A.reset}   ${title}`)
  if (def.workspace === 'agent') {
    const banner = formatAgentWorkspaceBanner()
    if (banner) {
      buf.push(`  ${banner}`)
      const opLines = getAgentWorkspaceOpsLines(6)
      if (opLines.length > 0) {
        buf.push(`  ${A.dim}Workspace:${A.reset}`)
        for (const line of opLines) {
          buf.push(`    ${line}`)
        }
      }
    } else {
      buf.push(
        `  ${A.gray}${sym.dot}${A.reset}  ${A.dim}No agent selected — press ${A.brightYellow}u${A.reset}${A.dim} to choose your workspace agent${A.reset}`,
      )
    }
  } else if (def.workspace === 'workflow') {
    buf.push(
      `  ${A.brightBlue}${A.bold}${sym.dot}${A.reset}  ${A.dim}Cloud workflows + schedules + runs${A.reset}`,
    )
  }
  buf.push(`  ${A.gray}${'─'.repeat(60)}${A.reset}`)
  buf.push('')
  buf.push(`  ${A.bold}${A.brightWhite}Actions${A.reset}`)
  buf.push('')

  for (const c of def.commands) {
    buf.push(`  ${keyBind(c.key, c.label)}`)
  }

  buf.push('')
  const exitBindings = [
    keyBind(':', 'command'),
    keyBind('q', 'back'),
    keyBind('Esc', 'back'),
  ].join(`  ${A.gray}${sym.dot}${A.reset}  `)
  buf.push(`  ${exitBindings}`)

  paintCommandBar(buf, subCmd, `lf ${def.title.toLowerCase()}`)

  process.stdout.write(A.clearScreen + A.homeCursor + buf.join('\n') + '\n')
}

// ─── Sub-dashboard interaction loop ──────────────────────────────────────────

async function runSubDashboard(def: SubDashboardDef): Promise<void> {
  let subCmd: CmdBarState = { active: false, input: '', error: null, selectedSuggestion: -1 }
  paintSubScreen(def, subCmd)

  return new Promise((resolve) => {
    try { process.stdin.setRawMode(true) } catch { /* ignore */ }

    const onData = async (data: Buffer | string) => {
      const key = data.toString()

      if (key === '\x03') { process.exit(130) }

      // ── Command input mode ─────────────────────────────────────────────────
      if (subCmd.active) {
        if (key === '\x1b') {
          subCmd = { active: false, input: '', error: null, selectedSuggestion: -1 }
          paintSubScreen(def, subCmd)
          return
        }
        if (key === '\r' || key === '\n') {
          const suggestions = getSuggestions(subCmd.input)
          let raw = subCmd.input.trim()
          if (subCmd.selectedSuggestion >= 0 && suggestions[subCmd.selectedSuggestion]) {
            raw = suggestions[subCmd.selectedSuggestion].cmd
          }
          if (!raw) {
            subCmd = { active: false, input: '', error: null, selectedSuggestion: -1 }
            paintSubScreen(def, subCmd)
            return
          }
          const argv = tokenise(raw)
          const validationError = validateSubcommand(argv)
          if (validationError) {
            subCmd = { ...subCmd, error: validationError }
            paintSubScreen(def, subCmd)
            return
          }
          subCmd = { active: false, input: '', error: null, selectedSuggestion: -1 }
          process.stdin.off('data', onData)
          try { process.stdin.setRawMode(false) } catch { /* ignore */ }
          await runChild(argv)
          try { process.stdin.setRawMode(true) } catch { /* ignore */ }
          paintSubScreen(def, subCmd)
          process.stdin.on('data', onData)
          return
        }
        // Tab — cycle forward
        if (key === '\t') {
          const suggestions = getSuggestions(subCmd.input)
          if (suggestions.length > 0) {
            const next = (subCmd.selectedSuggestion + 1) % suggestions.length
            subCmd = { ...subCmd, selectedSuggestion: next }
            paintSubScreen(def, subCmd)
          }
          return
        }
        // Shift+Tab — cycle backwards
        if (key === '\x1b[Z') {
          const suggestions = getSuggestions(subCmd.input)
          if (suggestions.length > 0) {
            const prev = subCmd.selectedSuggestion <= 0
              ? suggestions.length - 1
              : subCmd.selectedSuggestion - 1
            subCmd = { ...subCmd, selectedSuggestion: prev }
            paintSubScreen(def, subCmd)
          }
          return
        }
        if (key === '\x7f' || key === '\x08') {
          subCmd = { ...subCmd, input: subCmd.input.slice(0, -1), error: null, selectedSuggestion: -1 }
          paintSubScreen(def, subCmd)
          return
        }
        if (key.length === 1 && key >= ' ') {
          subCmd = { ...subCmd, input: subCmd.input + key, error: null, selectedSuggestion: -1 }
          paintSubScreen(def, subCmd)
        }
        return
      }

      // ── Normal sub-dashboard mode ──────────────────────────────────────────
      if (key === ':') {
        subCmd = { active: true, input: '', error: null, selectedSuggestion: -1 }
        paintSubScreen(def, subCmd)
        return
      }
      if (def.exitKeys.includes(key)) {
        process.stdin.off('data', onData)
        resolve()
        return
      }
      const action = def.commands.find((c) => c.key === key)
      if (action) {
        if (action.prompt !== undefined) {
        subCmd = {
          active: true,
          input: applyWorkspacePrompt(action.prompt, def.workspace),
          error: null,
          selectedSuggestion: -1,
        }
        paintSubScreen(def, subCmd)
        } else if (action.cmd) {
          process.stdin.off('data', onData)
          try { process.stdin.setRawMode(false) } catch { /* ignore */ }
          await runChild(action.cmd)
          try { process.stdin.setRawMode(true) } catch { /* ignore */ }
          paintSubScreen(def, subCmd)
          process.stdin.on('data', onData)
        }
      }
    }

    process.stdin.on('data', onData)
  })
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const RETURN_KEYS = new Set(['q', 'Q', '\x1b', '\r', '\n'])

function waitForReturnKey(): Promise<void> {
  return new Promise((resolve) => {
    try { process.stdin.setRawMode(true) } catch { /* ignore */ }
    const onData = (buf: Buffer | string) => {
      const key = buf.toString()
      if (key === '\x03') { process.stdin.off('data', onData); process.exit(130) }
      if (RETURN_KEYS.has(key)) { process.stdin.off('data', onData); resolve() }
    }
    process.stdin.on('data', onData)
  })
}

function tokenise(raw: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (quote) {
      if (ch === quote) { quote = null } else { current += ch }
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (ch === ' ' || ch === '\t') {
      if (current.length) { tokens.push(current); current = '' }
    } else {
      current += ch
    }
  }
  if (current.length) tokens.push(current)
  return tokens
}

// ─── Public entry point ──────────────────────────────────────────────────────

let restoreCleanup = () => { /* installed in runDashboard */ }

export async function runDashboard(): Promise<void> {
  if (!process.stdin.isTTY) {
    await renderFrame()
    return
  }

  const out = process.stdout
  out.write(A.altScreenOn + A.hideCursor)

  let timer: NodeJS.Timeout | null = null
  let inChild = false

  const cleanup = () => {
    if (timer) clearInterval(timer)
    timer = null
    try { process.stdin.setRawMode(false) } catch { /* ignore */ }
    process.stdin.pause()
    out.write(A.showCursor + A.altScreenOff)
  }
  restoreCleanup = cleanup

  const exit = (code = 0) => { cleanup(); process.exit(code) }

  process.on('SIGINT', () => exit(130))
  process.on('SIGTERM', () => exit(143))

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf-8')

  async function submitCommand(): Promise<void> {
    const suggestions = getSuggestions(cmdState.input)
    let raw = cmdState.input.trim()
    if (cmdState.selectedSuggestion >= 0 && suggestions[cmdState.selectedSuggestion]) {
      raw = suggestions[cmdState.selectedSuggestion].cmd
    }

    if (!raw) {
      cmdState = { active: false, input: '', error: null, selectedSuggestion: -1 }
      paintMainScreen()
      return
    }

    const argv = tokenise(raw)
    const validationError = validateSubcommand(argv)
    if (validationError) {
      cmdState = { ...cmdState, error: validationError }
      paintMainScreen()
      return
    }

    cmdState = { active: false, input: '', error: null, selectedSuggestion: -1 }
    inChild = true
    if (timer) clearInterval(timer)
    try { process.stdin.setRawMode(false) } catch { /* ignore */ }
    await runChild(argv)
    try { process.stdin.setRawMode(true) } catch { /* ignore */ }
    inChild = false
    timer = setInterval(() => { void renderFrame() }, 2000)
    void renderFrame()
  }

  process.stdin.on('data', async (data) => {
    const key = data.toString()

    if (key === '\x03') { exit(130); return }
    if (inChild) return

    // ── Command input mode ───────────────────────────────────────────────────
    if (cmdState.active) {
      if (key === '\x1b') {
        cmdState = { active: false, input: '', error: null, selectedSuggestion: -1 }
        paintMainScreen()
        return
      }
      if (key === '\r' || key === '\n') {
        await submitCommand()
        return
      }
      if (key === '\t') {
        const suggestions = getSuggestions(cmdState.input)
        if (suggestions.length > 0) {
          const next = (cmdState.selectedSuggestion + 1) % suggestions.length
          cmdState = { ...cmdState, selectedSuggestion: next }
          paintMainScreen()
        }
        return
      }
      if (key === '\x1b[Z') {
        const suggestions = getSuggestions(cmdState.input)
        if (suggestions.length > 0) {
          const prev = cmdState.selectedSuggestion <= 0
            ? suggestions.length - 1
            : cmdState.selectedSuggestion - 1
          cmdState = { ...cmdState, selectedSuggestion: prev }
          paintMainScreen()
        }
        return
      }
      if (key === '\x7f' || key === '\x08') {
        cmdState = { ...cmdState, input: cmdState.input.slice(0, -1), error: null, selectedSuggestion: -1 }
        paintMainScreen()
        return
      }
      if (key.length === 1 && key >= ' ') {
        cmdState = { ...cmdState, input: cmdState.input + key, error: null, selectedSuggestion: -1 }
        paintMainScreen()
      }
      return
    }

    // ── Normal dashboard mode ────────────────────────────────────────────────
    if (key === ':') {
      cmdState = { active: true, input: '', error: null, selectedSuggestion: -1 }
      paintMainScreen()
      return
    }
    if (key === 'q' || key === 'Q' || key === '\x1b') { exit(0); return }

    const subDef = SUB_DASHBOARDS[key.toLowerCase()]
    if (subDef) {
      inChild = true
      if (timer) clearInterval(timer)
      try { process.stdin.setRawMode(false) } catch { /* ignore */ }
      await runSubDashboard(subDef)
      try { process.stdin.setRawMode(true) } catch { /* ignore */ }
      inChild = false
      timer = setInterval(() => { void renderFrame() }, 2000)
      void renderFrame()
    }
  })

  await renderFrame()
  timer = setInterval(() => { void renderFrame() }, 2000)
}

export function _internal_getRestoreCleanup(): () => void {
  return restoreCleanup
}
