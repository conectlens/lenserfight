import { defineCommand } from 'citty'
import consola from 'consola'
import { callRest, callRpc, handleError } from '../utils/api'
import { printJson, printTable, truncate } from '../utils/output'

// Mirrors libs/types/src/lib/workflows.types.ts WorkflowScheduleRecord —
// kept narrow because the CLI only needs display fields.
interface WorkflowScheduleRow {
  id: string
  workflow_id: string
  workflow_title: string | null
  cron_expr: string
  timezone: string
  is_active: boolean
  assignee_type: 'agent' | 'team'
  assignee_id: string | null
  workflow_assignment_id: string | null
  next_run_at: string | null
  last_run_at: string | null
  last_run_id: string | null
  last_dispatch_status: string | null
  last_error_at: string | null
  last_error_message: string | null
  last_completed_at: string | null
  last_result: Record<string, unknown>
  approval_policy: Record<string, unknown>
  retry_policy: Record<string, unknown>
  failure_policy: Record<string, unknown>
  queue_policy: Record<string, unknown>
  inputs_template: Record<string, unknown>
  global_model_id: string | null
  created_at: string
}

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

function validateCronExpr(expr: string): void {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) {
    throw new Error(
      `Invalid CRON expression "${expr}". Expected 5 fields (minute hour dom month dow).`
    )
  }
}

// ─── schedule list ─────────────────────────────────────────────────────────

const scheduleList = defineCommand({
  meta: {
    name: 'list',
    description: 'List workflow schedules owned by the active workspace.',
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
      const rows = await callRpc<WorkflowScheduleRow[]>(
        'fn_get_workflow_schedules',
        { p_workflow_id: args.workflow || null },
        { requireAuth: true }
      )

      if (!rows || rows.length === 0) {
        consola.info('No schedules found.')
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['ID', 'Workflow', 'CRON', 'TZ', 'Active', 'Assignee', 'Next Run', 'Last Status'],
        rows.map((s) => [
          s.id.slice(0, 8) + '…',
          truncate(s.workflow_title || s.workflow_id, 24),
          s.cron_expr,
          s.timezone,
          s.is_active ? 'yes' : 'no',
          s.assignee_type + (s.assignee_id ? ':' + s.assignee_id.slice(0, 6) + '…' : ''),
          s.next_run_at ? new Date(s.next_run_at).toLocaleString() : '—',
          s.last_dispatch_status ?? '—',
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── schedule inspect ──────────────────────────────────────────────────────

const scheduleInspect = defineCommand({
  meta: {
    name: 'inspect',
    description: 'Show the full record for a single schedule.',
  },
  args: {
    schedule: {
      type: 'positional',
      description: 'Schedule UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      // fn_get_workflow_schedules returns all owned schedules; filter client-side.
      const rows = await callRpc<WorkflowScheduleRow[]>(
        'fn_get_workflow_schedules',
        { p_workflow_id: null },
        { requireAuth: true }
      )
      const match = rows?.find((r) => r.id === args.schedule) ?? null
      if (!match) {
        consola.error('Schedule %s not found (or not owned by active workspace).', args.schedule)
        process.exitCode = 1
        return
      }
      printJson(match)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── schedule create / update (single RPC handles both) ────────────────────

const VALID_ASSIGNEE_KINDS = new Set(['agent', 'team'])

function buildUpsertArgs(args: Record<string, string | boolean | undefined>) {
  const cron = String(args.cron ?? '').trim()
  validateCronExpr(cron)

  const assigneeType = String(args['assignee-type'] ?? 'agent')
  if (!VALID_ASSIGNEE_KINDS.has(assigneeType)) {
    throw new Error(
      `Invalid assignee type "${assigneeType}". Allowed: agent, team`
    )
  }

  return {
    p_workflow_id: args.workflow,
    p_schedule_id: args.schedule || null,
    p_cron_expr: cron,
    p_timezone: args.timezone || 'UTC',
    p_global_model_id: args['global-model'] || null,
    p_inputs_template: parseJsonArg(args['inputs-template'] as string, 'inputs-template') ?? {},
    p_is_active: args.inactive ? false : true,
    p_assignee_type: assigneeType,
    p_assignee_id: args['assignee-id'] || null,
    p_workflow_assignment_id: args['assignment'] || null,
    p_approval_policy: parseJsonArg(args['approval-policy'] as string, 'approval-policy'),
    p_retry_policy: parseJsonArg(args['retry-policy'] as string, 'retry-policy'),
    p_failure_policy: parseJsonArg(args['failure-policy'] as string, 'failure-policy'),
    p_queue_policy: parseJsonArg(args['queue-policy'] as string, 'queue-policy'),
  }
}

const upsertArgsSchema = {
  workflow: {
    type: 'string',
    description: 'Workflow UUID',
    required: true,
  },
  cron: {
    type: 'string',
    description: 'CRON expression (5 fields, minute-hour-dom-month-dow)',
    required: true,
  },
  timezone: { type: 'string', description: 'IANA timezone', default: 'UTC' },
  'assignee-type': {
    type: 'string',
    description: 'agent | team',
    default: 'agent',
  },
  'assignee-id': {
    type: 'string',
    description: 'Agent or team UUID the schedule targets',
    default: '',
  },
  assignment: {
    type: 'string',
    description: 'Optional explicit workflow_assignment UUID',
    default: '',
  },
  'global-model': {
    type: 'string',
    description: 'Optional model id override applied to every node',
    default: '',
  },
  'inputs-template': {
    type: 'string',
    description: 'JSON object: caller-supplied default inputs',
    default: '',
  },
  'approval-policy': {
    type: 'string',
    description: 'JSON object',
    default: '',
  },
  'retry-policy': { type: 'string', description: 'JSON object', default: '' },
  'failure-policy': {
    type: 'string',
    description: 'JSON object',
    default: '',
  },
  'queue-policy': { type: 'string', description: 'JSON object', default: '' },
  inactive: {
    type: 'boolean',
    description: 'Create the schedule paused (is_active=false)',
    default: false,
  },
} as const

const scheduleCreate = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new workflow schedule.',
  },
  args: upsertArgsSchema,
  async run({ args }) {
    try {
      const params = buildUpsertArgs(args as unknown as Record<string, string | boolean | undefined>)
      const rows = await callRpc<WorkflowScheduleRow[]>(
        'fn_upsert_workflow_schedule',
        params,
        { requireAuth: true }
      )
      const schedule = rows?.[0]
      if (!schedule) {
        consola.warn('Schedule upserted but RPC returned no row.')
        return
      }
      consola.success('Schedule created.')
      consola.info('Schedule ID: %s', schedule.id)
      consola.info('CRON:        %s (%s)', schedule.cron_expr, schedule.timezone)
      consola.info('Active:      %s', schedule.is_active ? 'yes' : 'no')
    } catch (err) {
      handleError(err)
    }
  },
})

const scheduleUpdate = defineCommand({
  meta: {
    name: 'update',
    description: 'Update an existing workflow schedule.',
  },
  args: {
    schedule: {
      type: 'string',
      description: 'Schedule UUID',
      required: true,
    },
    ...upsertArgsSchema,
  },
  async run({ args }) {
    try {
      const params = buildUpsertArgs(args as unknown as Record<string, string | boolean | undefined>)
      const rows = await callRpc<WorkflowScheduleRow[]>(
        'fn_upsert_workflow_schedule',
        params,
        { requireAuth: true }
      )
      const schedule = rows?.[0]
      if (!schedule) {
        consola.warn('Schedule updated but RPC returned no row.')
        return
      }
      consola.success('Schedule updated.')
      consola.info('Schedule ID: %s', schedule.id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── schedule pause / resume / delete (REST against the table) ─────────────
//
// No dedicated RPCs exist yet for pause/resume/delete (see docs Future work).
// REST PATCH/DELETE on lenses.workflow_schedules respects RLS, which only
// permits owners of the workflow to mutate their schedule rows.

const schedulePause = defineCommand({
  meta: {
    name: 'pause',
    description: 'Pause a schedule (is_active=false).',
  },
  args: {
    schedule: {
      type: 'positional',
      description: 'Schedule UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRest(
        'lenses',
        'workflow_schedules',
        'PATCH',
        { is_active: false },
        {
          requireAuth: true,
          query: { id: `eq.${args.schedule}` },
        }
      )
      consola.success('Schedule %s paused.', args.schedule)
    } catch (err) {
      handleError(err)
    }
  },
})

const scheduleResume = defineCommand({
  meta: {
    name: 'resume',
    description: 'Resume a paused schedule (is_active=true).',
  },
  args: {
    schedule: {
      type: 'positional',
      description: 'Schedule UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRest(
        'lenses',
        'workflow_schedules',
        'PATCH',
        { is_active: true },
        {
          requireAuth: true,
          query: { id: `eq.${args.schedule}` },
        }
      )
      consola.success('Schedule %s resumed.', args.schedule)
    } catch (err) {
      handleError(err)
    }
  },
})

const scheduleDelete = defineCommand({
  meta: {
    name: 'delete',
    description: 'Delete a schedule.',
  },
  args: {
    schedule: {
      type: 'positional',
      description: 'Schedule UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRest(
        'lenses',
        'workflow_schedules',
        'DELETE',
        undefined,
        {
          requireAuth: true,
          query: { id: `eq.${args.schedule}` },
        }
      )
      consola.success('Schedule %s deleted.', args.schedule)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── schedule history ──────────────────────────────────────────────────────
//
// Today the schedule row carries only the most-recent dispatch metadata
// (last_run_at, last_dispatch_status, last_error_*, last_completed_at,
// last_result). Full history requires joining workflow_runs filtered to this
// schedule's workflow — surfaced as the most recent N runs.

const scheduleHistory = defineCommand({
  meta: {
    name: 'history',
    description: 'Show the most recent dispatch summary for a schedule.',
  },
  args: {
    schedule: {
      type: 'positional',
      description: 'Schedule UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<WorkflowScheduleRow[]>(
        'fn_get_workflow_schedules',
        { p_workflow_id: null },
        { requireAuth: true }
      )
      const match = rows?.find((r) => r.id === args.schedule) ?? null
      if (!match) {
        consola.error('Schedule %s not found.', args.schedule)
        process.exitCode = 1
        return
      }
      consola.info('Workflow:        %s', match.workflow_title || match.workflow_id)
      consola.info('CRON:            %s (%s)', match.cron_expr, match.timezone)
      consola.info('Active:          %s', match.is_active ? 'yes' : 'no')
      consola.info('Last run at:     %s', match.last_run_at ?? '—')
      consola.info('Last run id:     %s', match.last_run_id ?? '—')
      consola.info('Last dispatch:   %s', match.last_dispatch_status ?? '—')
      consola.info('Last error at:   %s', match.last_error_at ?? '—')
      if (match.last_error_message) {
        consola.info('Last error msg:  %s', match.last_error_message)
      }
      consola.info('Last completed:  %s', match.last_completed_at ?? '—')
      consola.info('Next run at:     %s', match.next_run_at ?? '—')
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── schedule health ──────────────────────────────────────────────────────
//
// Detects schedules that have missed their expected dispatch window.
// A schedule is MISSED when last_run_at + 2 × inferredInterval < now,
// or when next_run_at is more than one interval in the past.
// Exit code 1 when any MISSED schedule is found.

function inferIntervalMinutes(cron: string): number {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return 60
  const [minute, hour, , , dow] = parts

  const everyNMin = minute.match(/^\*\/(\d+)$/)
  if (everyNMin) return parseInt(everyNMin[1], 10)

  const everyNHour = hour.match(/^\*\/(\d+)$/)
  if (everyNHour) return parseInt(everyNHour[1], 10) * 60

  // Fixed minute field, wildcard hour → fires once per hour
  if (minute !== '*' && hour === '*') return 60
  // Fixed hour, wildcard dow → fires daily
  if (hour !== '*' && dow === '*') return 1440
  // DOW-constrained → weekly
  if (dow !== '*') return 10080

  return 60
}

type HealthStatus = 'OK' | 'MISSED' | 'PAUSED' | 'NEVER_RAN'

const scheduleHealth = defineCommand({
  meta: {
    name: 'health',
    description: 'Detect schedules that have missed their expected dispatch window.',
  },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<WorkflowScheduleRow[]>(
        'fn_get_workflow_schedules',
        { p_workflow_id: null },
        { requireAuth: true }
      )

      if (!rows || rows.length === 0) {
        consola.info('No schedules found.')
        return
      }

      const now = Date.now()
      let anyMissed = false

      const results: Array<WorkflowScheduleRow & { health: HealthStatus }> = rows.map((s) => {
        if (!s.is_active) return { ...s, health: 'PAUSED' }

        const intervalMs = inferIntervalMinutes(s.cron_expr) * 60_000

        if (!s.last_run_at) {
          if (s.next_run_at && now - new Date(s.next_run_at).getTime() > intervalMs) {
            anyMissed = true
            return { ...s, health: 'MISSED' }
          }
          return { ...s, health: 'NEVER_RAN' }
        }

        const lastRunMs = new Date(s.last_run_at).getTime()
        if (now > lastRunMs + 2 * intervalMs) {
          anyMissed = true
          return { ...s, health: 'MISSED' }
        }
        if (s.next_run_at && now - new Date(s.next_run_at).getTime() > intervalMs) {
          anyMissed = true
          return { ...s, health: 'MISSED' }
        }

        return { ...s, health: 'OK' }
      })

      if (args.json) {
        printJson(
          results.map((r) => ({
            id: r.id,
            workflow: r.workflow_title,
            cron: r.cron_expr,
            interval_minutes: inferIntervalMinutes(r.cron_expr),
            last_run_at: r.last_run_at,
            next_run_at: r.next_run_at,
            health: r.health,
          }))
        )
      } else {
        printTable(
          ['ID', 'Workflow', 'CRON', 'Interval', 'Last Run', 'Next Run', 'Health'],
          results.map((r) => [
            r.id.slice(0, 8) + '…',
            truncate(r.workflow_title || r.workflow_id, 20),
            r.cron_expr,
            inferIntervalMinutes(r.cron_expr) + 'm',
            r.last_run_at ? new Date(r.last_run_at).toLocaleString() : '—',
            r.next_run_at ? new Date(r.next_run_at).toLocaleString() : '—',
            r.health,
          ])
        )
      }

      if (anyMissed) {
        consola.warn('One or more schedules have missed their expected dispatch window.')
        process.exitCode = 1
      } else {
        consola.success('All active schedules are healthy.')
      }
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── parent ────────────────────────────────────────────────────────────────

export default defineCommand({
  meta: {
    name: 'schedule',
    description: 'Manage CRON schedules for ConnectedLenses workflows.',
  },
  subCommands: {
    list: scheduleList,
    inspect: scheduleInspect,
    create: scheduleCreate,
    update: scheduleUpdate,
    pause: schedulePause,
    resume: scheduleResume,
    delete: scheduleDelete,
    history: scheduleHistory,
    health: scheduleHealth,
  },
})
