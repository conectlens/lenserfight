import { defineCommand } from 'citty'
import consola from 'consola'
import { callRest, handleError } from '../utils/api'
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
      const rows = await callRest<TeamRunRow[]>(
        'agents',
        'team_runs',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select:
              'id,ai_lenser_id,team_id,workflow_id,workflow_run_id,workflow_assignment_id,status,approval_status,metadata,created_at',
            ai_lenser_id: `eq.${args['ai-lenser']}`,
            approval_status: `eq.${args.status}`,
            order: 'created_at.desc',
            limit: args.limit,
          },
        }
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
        rows.map((r) => [
          r.id.slice(0, 8) + '…',
          r.workflow_id ? r.workflow_id.slice(0, 8) + '…' : '—',
          r.team_id ? r.team_id.slice(0, 8) + '…' : '—',
          r.status,
          truncate(String(r.metadata?.gate_kind ?? '—'), 18),
          new Date(r.created_at).toLocaleString(),
        ])
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
      const rows = await callRest<TeamRunRow[]>(
        'agents',
        'team_runs',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: { id: `eq.${args.request}`, select: '*' },
        }
      )
      const run = rows?.[0]
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
// Today's path: PATCH `agents.team_runs.approval_status` directly. The owner-
// authoritative `agents.can_manage_ai_lenser()` RLS policy enforces that only
// the workspace owner can mutate the row. Decision audit fields are merged
// into `metadata` via JSONB concatenation on the client (the engine writes
// the agent_run_events row when the proposed `fn_decide_approval` lands).
//
// Caveat: the runtime's reaction to a status flip is the still-future
// fn_decide_approval RPC. Until that ships, an approved row may not auto-
// resume the underlying workflow run; the CLI surfaces this in the output.

async function fetchTeamRun(id: string): Promise<TeamRunRow | null> {
  const rows = await callRest<TeamRunRow[]>(
    'agents',
    'team_runs',
    'GET',
    undefined,
    {
      requireAuth: true,
      query: { id: `eq.${id}`, select: '*' },
    }
  )
  return rows?.[0] ?? null
}

async function decide(
  requestId: string,
  decision: 'approved' | 'rejected',
  reason: string,
  modifications: Record<string, unknown> | undefined
): Promise<TeamRunRow> {
  const existing = await fetchTeamRun(requestId)
  if (!existing) {
    throw new Error(`Approval request ${requestId} not found.`)
  }
  if (existing.approval_status !== 'pending') {
    throw new Error(
      `Request ${requestId} is in status "${existing.approval_status}", cannot mutate.`
    )
  }

  const decisionMeta: Record<string, unknown> = {
    decision_at: new Date().toISOString(),
    decision_reason: reason || null,
  }
  if (modifications) decisionMeta.decision_modifications = modifications

  const mergedMetadata = {
    ...(existing.metadata ?? {}),
    ...decisionMeta,
  }

  const rows = await callRest<TeamRunRow[]>(
    'agents',
    'team_runs',
    'PATCH',
    {
      approval_status: decision,
      metadata: mergedMetadata,
    },
    {
      requireAuth: true,
      query: { id: `eq.${requestId}` },
      prefer: 'return=representation',
    }
  )
  const updated = rows?.[0]
  if (!updated) throw new Error('PATCH returned no row.')
  return updated
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
      description: 'JSON object: input modifications applied on resume',
      default: '',
    },
  },
  async run({ args }) {
    try {
      const modifications = parseJsonArg(args.modifications, 'modifications')
      const updated = await decide(args.request, 'approved', args.reason, modifications)
      consola.success('Request %s approved.', updated.id)
      consola.warn(
        'Note: engine-side resume relies on the proposed `fn_decide_approval` RPC. ' +
          'Until that lands, the underlying workflow_run may need manual restart.'
      )
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
      const updated = await decide(args.request, 'rejected', args.reason, undefined)
      consola.success('Request %s rejected.', updated.id)
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
      const rows = await callRest<AgentRunEventRow[]>(
        'agents',
        'agent_run_events',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select: 'id,team_run_id,agent_run_step_id,event_type,payload,occurred_at',
            team_run_id: `eq.${args.request}`,
            order: 'occurred_at.desc',
            limit: args.limit,
          },
        }
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
  },
})
