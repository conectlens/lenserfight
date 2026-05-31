import { defineCommand } from 'citty'
import consola from 'consola'
import { callRpc, handleError } from '../utils/api'
import { printJson, printTable, truncate } from '../utils/output'

interface TeamRunRow {
  id: string
  ai_lenser_id: string
  team_id: string | null
  workflow_id: string | null
  workflow_run_id: string | null
  workflow_assignment_id: string | null
  status: string
  approval_status: string
  scratchpad: Record<string, unknown>
  metadata: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

interface AgentRunEventRow {
  id: string
  team_run_id: string
  agent_run_step_id: string | null
  event_type: string
  payload: Record<string, unknown>
  occurred_at: string
}

const VALID_APPROVAL_STATUSES = new Set([
  'pending',
  'approved',
  'rejected',
  'not_required',
])

function parseJsonArg(value: string | undefined, label: string): Record<string, unknown> | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
      throw new Error(`${label} must be a JSON object`)
    }
    return parsed as Record<string, unknown>
  } catch (err) {
    throw new Error(
      `Invalid JSON for --${label}: ${(err as Error).message}`
    )
  }
}

// ─── approval list ─────────────────────────────────────────────────────────

const approvalList = defineCommand({
  meta: {
    name: 'list',
    description: 'List pending approvals for an AI workspace.',
  },
  args: {
    'ai-lenser': {
      type: 'string',
      description: 'AI Lenser UUID',
      required: true,
    },
    status: {
      type: 'string',
      description: 'Filter by approval_status (pending | approved | rejected | not_required)',
      default: 'pending',
    },
    limit: { type: 'string', description: 'Max rows (default 50)', default: '50' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    if (!VALID_APPROVAL_STATUSES.has(args.status)) {
      consola.error(
        'Invalid status "%s". Allowed: %s',
        args.status,
        Array.from(VALID_APPROVAL_STATUSES).join(', ')
      )
      process.exitCode = 1
      return
    }
    try {
      const rows = await callRpc<TeamRunRow[]>(
        'fn_list_approval_requests',
        {
          p_ai_lenser_id: args['ai-lenser'],
          p_approval_status: args.status,
          p_limit: parseInt(args.limit, 10),
        },
        { requireAuth: true }
      )

      if (!rows || rows.length === 0) {
        consola.info('No %s approvals for %s.', args.status, args['ai-lenser'])
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['Request', 'Workflow', 'Team', 'Run Status', 'Gate', 'Created'],
        rows.map((r) => {
          const row = r as unknown as Record<string, unknown>
          const rid = String(row['request_id'] ?? row['id'] ?? '').slice(0, 8) + '…'
          const wid = row['workflow_id'] ? String(row['workflow_id']).slice(0, 8) + '…' : '—'
          const tid = row['team_id'] ? String(row['team_id']).slice(0, 8) + '…' : '—'
          const gate = truncate(String((row['metadata'] as Record<string,unknown>)?.['gate_kind'] ?? '—'), 18)
          return [rid, wid, tid, String(row['status'] ?? '—'), gate, new Date(String(row['created_at'])).toLocaleString()]
        })
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── approval inspect ──────────────────────────────────────────────────────

const approvalInspect = defineCommand({
  meta: {
    name: 'inspect',
    description: 'Show the full team_run row backing an approval request.',
  },
  args: {
    request: {
      type: 'positional',
      description: 'Team Run UUID (= request id)',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const run = await callRpc<Record<string, unknown>>(
        'fn_get_approval_request',
        { p_request_id: args.request },
        { requireAuth: true }
      )
      if (!run) {
        consola.error('Approval request %s not found.', args.request)
        process.exitCode = 1
        return
      }
      printJson(run)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── approval approve / reject ─────────────────────────────────────────────
//
// Backed by `public.fn_decide_approval` (added in migration
// 20260429010000_approval_decide.sql). The RPC mutates approval_status,
// merges decision audit into metadata, appends an agent_run_events row, and
// transitions the underlying workflow_run atomically.

interface DecisionResultRow {
  request_id: string
  ai_lenser_id: string
  team_id: string | null
  workflow_id: string | null
  workflow_run_id: string | null
  workflow_assignment_id: string | null
  approval_status: 'approved' | 'rejected'
  run_status: string
  metadata: Record<string, unknown>
  decided_at: string
}

async function decideViaRpc(
  requestId: string,
  decision: 'approved' | 'rejected' | 'modified',
  reason: string,
  modifications: Record<string, unknown> | undefined
): Promise<DecisionResultRow> {
  const rows = await callRpc<DecisionResultRow[]>(
    'fn_decide_approval',
    {
      p_team_run_id: requestId,
      p_decision: decision,
      p_reason: reason || null,
      p_modifications: modifications ?? null,
    },
    { requireAuth: true }
  )
  const result = Array.isArray(rows) ? rows[0] : (rows as unknown as DecisionResultRow)
  if (!result) throw new Error('fn_decide_approval returned no rows.')
  return result
}

const approvalApprove = defineCommand({
  meta: {
    name: 'approve',
    description: 'Approve a pending request.',
  },
  args: {
    request: {
      type: 'positional',
      description: 'Team Run UUID',
      required: true,
    },
    reason: { type: 'string', description: 'Decision reason', default: '' },
    modifications: {
      type: 'string',
      description:
        'JSON object: input modifications applied on resume. When set, decision becomes "modified".',
      default: '',
    },
  },
  async run({ args }) {
    try {
      const modifications = parseJsonArg(args.modifications, 'modifications')
      const decision: 'approved' | 'modified' = modifications ? 'modified' : 'approved'
      const result = await decideViaRpc(args.request, decision, args.reason, modifications)
      consola.success('Request %s %s.', result.request_id, result.approval_status)
      consola.info('Run status: %s · Decided at: %s', result.run_status, result.decided_at)
    } catch (err) {
      handleError(err)
    }
  },
})

const approvalReject = defineCommand({
  meta: {
    name: 'reject',
    description: 'Reject a pending request.',
  },
  args: {
    request: {
      type: 'positional',
      description: 'Team Run UUID',
      required: true,
    },
    reason: { type: 'string', description: 'Decision reason', default: '' },
  },
  async run({ args }) {
    try {
      const result = await decideViaRpc(args.request, 'rejected', args.reason, undefined)
      consola.success('Request %s rejected.', result.request_id)
      consola.info('Run status: %s · Decided at: %s', result.run_status, result.decided_at)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── approval audit ────────────────────────────────────────────────────────

const approvalAudit = defineCommand({
  meta: {
    name: 'audit',
    description: 'Show agent_run_events history for an approval request.',
  },
  args: {
    request: {
      type: 'positional',
      description: 'Team Run UUID',
      required: true,
    },
    limit: { type: 'string', description: 'Max events (default 50)', default: '50' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const req = await callRpc<Record<string, unknown>>(
        'fn_get_approval_request',
        { p_request_id: args.request },
        { requireAuth: true }
      )
      if (!req) {
        consola.error('Approval request %s not found.', args.request)
        process.exitCode = 1
        return
      }
      const rows = await callRpc<AgentRunEventRow[]>(
        'fn_agent_run_events',
        {
          p_ai_lenser_id: req['ai_lenser_id'],
          p_run_id: args.request,
          p_limit: parseInt(args.limit, 10),
        },
        { requireAuth: true }
      )

      if (!rows || rows.length === 0) {
        consola.info('No events recorded for %s.', args.request)
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['When', 'Event Type', 'Step'],
        rows.map((e) => [
          new Date(e.occurred_at).toLocaleString(),
          truncate(e.event_type, 32),
          e.agent_run_step_id ? e.agent_run_step_id.slice(0, 8) + '…' : '—',
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── standing approvals ────────────────────────────────────────────────────
//
// A "standing" approval pre-authorises a workflow + gate kind for a bounded
// time window so the agent can execute without producing per-run approval
// requests. Backed by `agents.standing_approvals`. Owners must be able to
// revoke immediately, so we surface list / revoke alongside grant.

interface StandingApprovalRow {
  id: string
  workflow_id: string
  gate_kind: string
  granted_at: string
  expires_at: string | null
  revoked_at: string | null
  granted_by: string | null
}

const approvalGrantStanding = defineCommand({
  meta: {
    name: 'grant-standing',
    description:
      'Grant a standing approval that pre-authorises a workflow gate for N hours.',
  },
  args: {
    workflow: {
      type: 'string',
      description: 'Workflow UUID',
      required: true,
    },
    gate: {
      type: 'string',
      description: 'Gate kind (e.g. tool, spending, model)',
      required: true,
    },
    hours: {
      type: 'string',
      description: 'Validity window in hours (default 24)',
      default: '24',
    },
  },
  async run({ args }) {
    const hours = Number.parseInt(args.hours, 10)
    if (!Number.isFinite(hours) || hours <= 0) {
      consola.error('Invalid --hours "%s" — must be a positive integer.', args.hours)
      process.exitCode = 1
      return
    }

    try {
      const result = await callRpc<string>(
        'fn_grant_standing_approval',
        {
          p_workflow_id: args.workflow,
          p_gate_kind: args.gate,
          p_hours: hours,
        },
        { requireAuth: true }
      )
      // Some RPCs return scalars wrapped in an array; normalize.
      const id = Array.isArray(result) ? (result[0] as unknown as string) : result
      consola.success('Standing approval granted: %s', id)
      consola.info('Workflow: %s · Gate: %s · Valid: %dh', args.workflow, args.gate, hours)
    } catch (err) {
      handleError(err)
    }
  },
})

const approvalRevokeStanding = defineCommand({
  meta: {
    name: 'revoke-standing',
    description: 'Revoke a previously granted standing approval immediately.',
  },
  args: {
    'standing-id': {
      type: 'positional',
      description: 'Standing approval UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_revoke_standing_approval',
        { p_id: args['standing-id'] },
        { requireAuth: true }
      )
      consola.success('Standing approval %s revoked.', args['standing-id'])
    } catch (err) {
      handleError(err)
    }
  },
})

const approvalListStanding = defineCommand({
  meta: {
    name: 'list-standing',
    description: 'List active (non-revoked) standing approvals.',
  },
  args: {
    workflow: {
      type: 'string',
      description: 'Optional: filter to a single workflow UUID',
      default: '',
    },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<StandingApprovalRow[]>(
        'fn_list_standing_approvals',
        {
          p_workflow_id: args.workflow || null,
          p_limit: 100,
        },
        { requireAuth: true }
      )

      if (!rows || rows.length === 0) {
        consola.info('No active standing approvals.')
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['ID', 'Workflow', 'Gate', 'Granted At', 'Expires At'],
        rows.map((r) => [
          r.id.slice(0, 8) + '…',
          r.workflow_id.slice(0, 8) + '…',
          truncate(r.gate_kind, 18),
          new Date(r.granted_at).toLocaleString(),
          r.expires_at ? new Date(r.expires_at).toLocaleString() : '—',
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── approval bulk-approve ─────────────────────────────────────────────────
//
// Approves a filtered set of pending approvals in a single round-trip via the
// agents.fn_bulk_approve(p_filters jsonb) RPC. The RPC itself is delivered by
// the SQL agent in a follow-up migration; the CLI is wired now so it ships
// the moment the function exists.
//
// TODO(Y3): depends on SQL function `agents.fn_bulk_approve(p_filters jsonb)
// RETURNS int`. Until that ships, this command will surface a clean RPC-not-
// found error from PostgREST and exit non-zero.

function parseSinceArg(value: string | undefined): string | null {
  if (!value) return null
  // Accept ISO 8601 directly OR shorthand "1h" / "30m" / "2d".
  const shorthand = value.match(/^(\d+)(m|h|d)$/i)
  if (shorthand) {
    const n = parseInt(shorthand[1], 10)
    const unit = shorthand[2].toLowerCase()
    const ms = unit === 'm' ? n * 60_000 : unit === 'h' ? n * 3_600_000 : n * 86_400_000
    return new Date(Date.now() - ms).toISOString()
  }
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`Invalid --since "${value}". Use ISO 8601 or shorthand like "1h", "30m", "2d".`)
  }
  return parsed.toISOString()
}

async function promptYesNo(message: string): Promise<boolean> {
  process.stdout.write(message + ' ')
  return new Promise((resolve) => {
    const onData = (chunk: Buffer) => {
      const ans = chunk.toString().trim().toLowerCase()
      process.stdin.removeListener('data', onData)
      process.stdin.pause()
      resolve(ans === 'y' || ans === 'yes')
    }
    process.stdin.resume()
    process.stdin.once('data', onData)
  })
}

const approvalBulkApprove = defineCommand({
  meta: {
    name: 'bulk-approve',
    description: 'Approve a filtered set of pending approvals in one RPC call.',
  },
  args: {
    filter: {
      type: 'string',
      description: 'key=value filter, e.g. "status=pending" (default: status=pending)',
      default: 'status=pending',
    },
    since: {
      type: 'string',
      description: 'Only approve requests created since X (ISO or "1h"/"30m"/"2d")',
      default: '',
    },
    workflow: {
      type: 'string',
      description: 'Restrict to a single workflow UUID',
      default: '',
    },
    force: {
      type: 'boolean',
      description: 'Skip the confirmation prompt',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const filters: Record<string, unknown> = {}

      // Parse --filter status=pending (extensible to other key=value pairs).
      const eqIdx = args.filter.indexOf('=')
      if (eqIdx > 0) {
        const key = args.filter.slice(0, eqIdx).trim()
        const value = args.filter.slice(eqIdx + 1).trim()
        if (key && value) filters[key] = value
      }

      const since = parseSinceArg(args.since)
      if (since) filters['since'] = since
      if (args.workflow) filters['workflow_id'] = args.workflow

      // Preview count is not available without a dedicated RPC; show "?" until
      // fn_count_pending_approvals is added to schema.sql.
      const previewCount = '?'

      if (!args.force) {
        const ok = await promptYesNo(
          `About to approve ${previewCount} pending runs. Proceed? [y/N]`,
        )
        if (!ok) {
          consola.info('Aborted. No approvals were granted.')
          return
        }
      }

      const result = await callRpc<number | { approved: number } | Array<{ approved: number }>>(
        'fn_bulk_approve',
        { p_filters: filters },
        { requireAuth: true },
      )

      // RPC may return a scalar int, an object, or [{ approved: N }] depending
      // on how the SQL function is declared. Normalise.
      let approved: number
      if (typeof result === 'number') approved = result
      else if (Array.isArray(result) && result[0]) approved = result[0].approved ?? 0
      else if (result && typeof result === 'object' && 'approved' in result)
        approved = (result as { approved: number }).approved
      else approved = 0

      consola.success('Bulk-approved %d run(s).', approved)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── parent ────────────────────────────────────────────────────────────────

export default defineCommand({
  meta: {
    name: 'approval',
    description: 'Manage approval requests for ConnectedLenses team runs.',
  },
  subCommands: {
    list: approvalList,
    inspect: approvalInspect,
    approve: approvalApprove,
    reject: approvalReject,
    audit: approvalAudit,
    'grant-standing': approvalGrantStanding,
    'revoke-standing': approvalRevokeStanding,
    'list-standing': approvalListStanding,
    'bulk-approve': approvalBulkApprove,
  },
})
