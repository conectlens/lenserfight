import { readFile } from 'node:fs/promises'

import { defineCommand } from 'citty'
import consola from 'consola'

import { callRpc, handleError } from '../utils/api'
import { assertSafe } from '../lib/safety'
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
    p_inputs_template: parseJsonArg((args['inputs-template'] || args.inputs) as string, 'inputs-template') ?? {},
    p_is_active: args.inactive ? false : true,
    p_assignee_type: assigneeType,
    p_assignee_id: args['assignee-id'] || args.assignee || null,
    p_workflow_assignment_id: args['assignment'] || null,
    p_approval_policy: parseJsonArg((args['approval-policy'] || args.approval) as string, 'approval-policy'),
    p_retry_policy: parseJsonArg((args['retry-policy'] || args.retry) as string, 'retry-policy'),
    p_failure_policy: parseJsonArg((args['failure-policy'] || args.failure) as string, 'failure-policy'),
    p_queue_policy: parseJsonArg((args['queue-policy'] || args.queue) as string, 'queue-policy'),
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
  assignee: {
    type: 'string',
    description: 'Alias for --assignee-id',
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
  inputs: {
    type: 'string',
    description: 'Alias for --inputs-template',
    default: '',
  },
  'approval-policy': {
    type: 'string',
    description: 'JSON object',
    default: '',
  },
  approval: { type: 'string', description: 'Alias for --approval-policy', default: '' },
  'retry-policy': { type: 'string', description: 'JSON object', default: '' },
  retry: { type: 'string', description: 'Alias for --retry-policy', default: '' },
  'failure-policy': {
    type: 'string',
    description: 'JSON object',
    default: '',
  },
  failure: { type: 'string', description: 'Alias for --failure-policy', default: '' },
  'queue-policy': { type: 'string', description: 'JSON object', default: '' },
  queue: { type: 'string', description: 'Alias for --queue-policy', default: '' },
  description: {
    type: 'string',
    description: 'Human-readable schedule description (accepted for CLI/docs compatibility)',
    default: '',
  },
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
      if ((err as { code?: string }).code === '23514') {
        consola.error('Approval-free schedules require a spending limit on the agent policy. Set one first: lf agent policy update --spending-limit <credits>.')
        process.exitCode = 1
        return
      }
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
      if ((err as { code?: string }).code === '23514') {
        consola.error('Approval-free schedules require a spending limit on the agent policy. Set one first: lf agent policy update --spending-limit <credits>.')
        process.exitCode = 1
        return
      }
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
      await callRpc(
        'fn_toggle_workflow_schedule',
        { p_schedule_id: args.schedule, p_is_active: false },
        { requireAuth: true }
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
      await callRpc(
        'fn_toggle_workflow_schedule',
        { p_schedule_id: args.schedule, p_is_active: true },
        { requireAuth: true }
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
    description: 'Delete a schedule. Requires --force to confirm.',
  },
  args: {
    schedule: {
      type: 'positional',
      description: 'Schedule UUID',
      required: true,
    },
    force: {
      type: 'boolean',
      description: 'Required: confirm deletion',
      default: false,
    },
  },
  async run({ args }) {
    await assertSafe({
      risk: 'MEDIUM',
      reversibility: 'IRREVERSIBLE',
      confirmationPolicy: 'FLAG',
      forceFlag: '--force',
      hasForce: args.force,
      description: `Delete schedule ${args.schedule}. All future runs for this schedule will be cancelled.`,
      affectedResources: [
        { type: 'schedule', name: args.schedule, scope: 'remote' },
      ],
      rollbackAvailable: false,
      notes: ['Active runs triggered before deletion are not affected.'],
    });
    try {
      await callRpc(
        'fn_delete_workflow_schedule',
        { p_schedule_id: args.schedule },
        { requireAuth: true }
      )
      consola.success('Schedule %s deleted.', args.schedule)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── schedule history ──────────────────────────────────────────────────────
//
// Joins the schedule to its workflow_runs to surface the most recent N runs.
// `--limit` is clamped to [1, 50]; default 10. The schedule row's last_*
// fields remain the source of truth for the most-recent dispatch and are
// rendered as the header above the runs table.

interface WorkflowRunRow {
  id: string
  workflow_id: string
  status: string
  started_at: string | null
  completed_at: string | null
  created_at: string
}

function clampLimit(raw: number, fallback: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return fallback
  return Math.min(50, Math.max(1, Math.floor(raw)))
}

function durationMs(started: string | null, completed: string | null): string {
  if (!started || !completed) return '—'
  const ms = new Date(completed).getTime() - new Date(started).getTime()
  return Number.isFinite(ms) && ms >= 0 ? String(ms) : '—'
}

const scheduleHistory = defineCommand({
  meta: {
    name: 'history',
    description: 'Show the most recent runs dispatched by a schedule.',
  },
  args: {
    schedule: {
      type: 'positional',
      description: 'Schedule UUID',
      required: true,
    },
    limit: {
      type: 'string',
      description: 'Max rows to return (1–50, default 10).',
      default: '10',
    },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
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

      const limit = clampLimit(parseInt(args.limit, 10), 10)

      const runs = await callRpc<WorkflowRunRow[]>(
        'fn_get_schedule_run_history',
        { p_schedule_id: args.schedule, p_limit: limit, p_cursor: null },
        { requireAuth: true },
      )

      if (args.json) {
        printJson({ schedule: match, runs: runs ?? [] })
        return
      }

      consola.info('Workflow:        %s', match.workflow_title || match.workflow_id)
      consola.info('CRON:            %s (%s)', match.cron_expr, match.timezone)
      consola.info('Active:          %s', match.is_active ? 'yes' : 'no')
      consola.info('Next run at:     %s', match.next_run_at ?? '—')
      consola.info('')

      if (!runs || runs.length === 0) {
        consola.info('No runs dispatched by this schedule yet.')
        return
      }

      printTable(
        ['Run ID', 'Started', 'Completed', 'Status', 'Duration (ms)'],
        runs.map((r) => [
          r.id.slice(0, 8) + '…',
          r.started_at ?? r.created_at,
          r.completed_at ?? '—',
          r.status,
          durationMs(r.started_at, r.completed_at),
        ])
      )
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

      // ── Worker heartbeats ─────────────────────────────────────────────────
      try {
        const { createServiceClient } = await import('../utils/supabase-client')
        const svcClient = await createServiceClient()

        const { data: workers } = await svcClient
          .rpc('fn_get_worker_health')

        if (workers && workers.length > 0) {
          consola.info('')
          consola.info('Workers:')
          printTable(
            ['Worker ID', 'Type', 'Last Seen', 'Healthy', 'Secs Ago'],
            (workers as Array<Record<string, unknown>>).map((w) => [
              String(w['worker_id']).slice(0, 24) + '…',
              String(w['worker_type'] ?? ''),
              w['last_seen_at'] ? new Date(w['last_seen_at'] as string).toLocaleString() : '—',
              w['is_healthy'] ? 'YES' : 'NO',
              String(w['seconds_since'] ?? '?'),
            ])
          )
          const anyUnhealthy = (workers as Array<Record<string, unknown>>).some((w) => !w['is_healthy'])
          if (anyUnhealthy) {
            consola.warn('One or more workers have not reported a heartbeat in > 30 seconds.')
            process.exitCode = 1
          }
        }

        // ── DLQ counts ─────────────────────────────────────────────────────
        const { data: dlqData } = await svcClient.rpc('fn_get_dlq_counts')
        const dlq = (dlqData as { battle_dlq_count?: number; workflow_dlq_count?: number } | null) ?? {}
        const battleDlqCount   = dlq.battle_dlq_count   ?? 0
        const workflowDlqCount = dlq.workflow_dlq_count ?? 0

        consola.info('')
        consola.info('Dead-Letter Queue:')
        printTable(
          ['Queue', 'Unresolved'],
          [
            ['Battle Execution DLQ', String(battleDlqCount)],
            ['Workflow Run DLQ',     String(workflowDlqCount)],
          ]
        )
        if (battleDlqCount > 0 || workflowDlqCount > 0) {
          consola.warn('There are unresolved dead-letter entries. Run: lf battle jobs <id> --dead-letters')
          process.exitCode = 1
        }
      } catch {
        // Worker health is best-effort; don't fail the main health check
        consola.warn('Could not fetch worker health (service role key may be required)')
      }
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── schedule backfill ────────────────────────────────────────────────────
//
// Replays missed dispatches between a schedule's most recent run (or the
// supplied --since timestamp) and "now", deferring to the database for the
// actual cron tick enumeration. Dry-run mode previews the ticks without
// dispatching, useful for reviewing the blast radius before applying.

interface BackfillTick {
  fire_at: string
  status?: string
}

interface BackfillResult {
  would_dispatch?: number
  dispatched?: number
  skipped_existing?: number
  ticks?: BackfillTick[]
}

const scheduleBackfill = defineCommand({
  meta: {
    name: 'backfill',
    description:
      'Backfill missed dispatches for a schedule between --since and now (use --dry-run to preview).',
  },
  args: {
    schedule: {
      type: 'positional',
      description: 'Schedule UUID',
      required: true,
    },
    since: {
      type: 'string',
      description: 'ISO 8601 lower-bound timestamp (e.g. 2026-05-01T00:00:00Z)',
      required: true,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Preview the dispatches without enqueuing runs.',
      default: false,
    },
    json: { type: 'boolean', description: 'Output raw RPC result as JSON', default: false },
  },
  async run({ args }) {
    const since = new Date(args.since)
    if (!Number.isFinite(since.getTime())) {
      consola.error(
        'Invalid --since "%s" — must be a parseable ISO 8601 timestamp.',
        args.since
      )
      process.exitCode = 1
      return
    }

    try {
      const result = await callRpc<BackfillResult>(
        'fn_backfill_schedule',
        {
          p_schedule_id: args.schedule,
          p_since: since.toISOString(),
          p_dry_run: args['dry-run'],
        },
        { requireAuth: true }
      )

      if (args.json) {
        printJson(result ?? {})
        return
      }

      if (args['dry-run']) {
        const wouldDispatch = result?.would_dispatch ?? 0
        consola.info('Would dispatch %d run(s).', wouldDispatch)
        const ticks = result?.ticks ?? []
        if (ticks.length > 0) {
          printTable(
            ['#', 'Fire At', 'Status'],
            ticks.map((t, i) => [
              String(i + 1),
              t.fire_at,
              t.status ?? '—',
            ])
          )
        }
        return
      }

      const dispatched = result?.dispatched ?? 0
      const skipped = result?.skipped_existing ?? 0
      consola.success(
        'Dispatched %d run(s) (skipped %d already-backfilled).',
        dispatched,
        skipped
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── Phase W4: calendar / condition / rotation / preview ──────────────────
//
// Phase W shipped three new dispatch guards on lenses.workflow_schedules:
//   1. calendar_id          — skip / only-dates overlay
//   2. pre_dispatch_condition — U-DSL filter against a snapshot context
//   3. inputs_rotation      — rotated input payload (last_rotation_index)
// plus the SECURITY DEFINER preview RPC `lenses.fn_preview_schedule_ticks`.
//
// The grammar for `pre_dispatch_condition` mirrors automation match_filter:
// `{ "/json/pointer": { eq|neq|gt|lt|contains: <value> } }`. Validation is
// duplicated locally so this command does not pull in the automation file.

const CALENDAR_KINDS = ['skip_dates', 'only_dates'] as const
type CalendarKind = (typeof CALENDAR_KINDS)[number]

const CONDITION_OPS = ['eq', 'neq', 'gt', 'lt', 'contains'] as const
type ConditionOp = (typeof CONDITION_OPS)[number]
type ConditionClause = { [op in ConditionOp]?: unknown }
type ConditionFilter = Record<string, ConditionClause>

interface ScheduleCalendarRow {
  id: string
  name: string
  kind: CalendarKind
  dates: string[] | null
  timezone: string
  is_seed: boolean
  created_at: string
}

interface PreviewTickRow {
  tick_at: string
  decision: string
  reason: string
  inputs: Record<string, unknown> | null
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function parseDateList(raw: string): string[] {
  const dates = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  if (dates.length === 0) {
    throw new Error('--dates must contain at least one ISO date (YYYY-MM-DD).')
  }
  for (const d of dates) {
    if (!ISO_DATE_RE.test(d) || Number.isNaN(new Date(d + 'T00:00:00Z').getTime())) {
      throw new Error(`Invalid date "${d}" — expected ISO YYYY-MM-DD.`)
    }
  }
  return dates
}

function validateConditionFilter(value: unknown): asserts value is ConditionFilter {
  if (!isPlainJsonObject(value)) {
    throw new Error('Condition file must contain a JSON object.')
  }
  for (const [pointer, clause] of Object.entries(value)) {
    if (!isPlainJsonObject(clause)) {
      throw new Error(
        `condition["${pointer}"] must be an object like { "eq": <value> }.`,
      )
    }
    const keys = Object.keys(clause)
    if (keys.length !== 1) {
      throw new Error(
        `condition["${pointer}"] must have exactly one operator key (got ${keys.length}).`,
      )
    }
    const op = keys[0]
    if (!CONDITION_OPS.includes(op as ConditionOp)) {
      throw new Error(
        `condition["${pointer}"] uses unknown operator "${op}". Allowed: ${CONDITION_OPS.join(', ')}.`,
      )
    }
  }
}

async function loadJsonFile(filePath: string): Promise<unknown> {
  if (/\.(ya?ml)$/i.test(filePath)) {
    throw new Error(
      `YAML is not supported by the CLI. Convert "${filePath}" to JSON.`,
    )
  }
  const raw = await readFile(filePath, 'utf-8')
  try {
    return JSON.parse(raw)
  } catch (err) {
    throw new Error(`Failed to parse "${filePath}" as JSON: ${(err as Error).message}`)
  }
}

function clampPreviewN(raw: number, fallback: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return fallback
  return Math.min(100, Math.max(1, Math.floor(raw)))
}

// ANSI colorizer — keep dependency-free; honors NO_COLOR / non-TTY.
function colorize(value: string, color: 'green' | 'yellow'): string {
  const noColor =
    !process.stdout.isTTY ||
    Boolean(process.env['NO_COLOR']) ||
    process.env['TERM'] === 'dumb'
  if (noColor) return value
  const open = color === 'green' ? '[32m' : '[33m'
  return `${open}${value}[0m`
}

// ─── schedule calendar create ─────────────────────────────────────────────

const calendarCreate = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a calendar overlay (skip_dates or only_dates).',
  },
  args: {
    name: { type: 'string', description: 'Display name', required: true },
    kind: {
      type: 'string',
      description: `Calendar kind: ${CALENDAR_KINDS.join(' | ')}`,
      required: true,
    },
    dates: {
      type: 'string',
      description: 'Comma-separated ISO dates (YYYY-MM-DD)',
      required: true,
    },
    timezone: {
      type: 'string',
      description: 'IANA timezone (e.g. Europe/Istanbul)',
      required: true,
    },
  },
  async run({ args }) {
    try {
      if (!CALENDAR_KINDS.includes(args.kind as CalendarKind)) {
        throw new Error(
          `Invalid --kind "${args.kind}". Allowed: ${CALENDAR_KINDS.join(', ')}.`,
        )
      }
      const dates = parseDateList(args.dates)

      const calendarId = await callRpc<string>(
        'fn_create_schedule_calendar',
        {
          p_name: args.name,
          p_kind: args.kind,
          p_dates: dates,
          p_timezone: args.timezone,
        },
        { requireAuth: true },
      )

      if (!calendarId) {
        consola.warn('Calendar created but no ID returned.')
        return
      }
      printJson({ calendar_id: calendarId, name: args.name })
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── schedule calendar list ───────────────────────────────────────────────

const calendarList = defineCommand({
  meta: {
    name: 'list',
    description: 'List calendar overlays (your own + platform seeds).',
  },
  args: {
    'seeds-only': {
      type: 'boolean',
      description: 'Show only platform seed calendars',
      default: false,
    },
    'mine-only': {
      type: 'boolean',
      description: 'Show only calendars you own',
      default: false,
    },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      let rows = await callRpc<ScheduleCalendarRow[]>(
        'fn_get_schedule_calendars',
        {},
        { requireAuth: true },
      )

      if (args['seeds-only']) rows = (rows ?? []).filter((r) => r.is_seed)
      if (args['mine-only']) rows = (rows ?? []).filter((r) => !r.is_seed)

      if (!rows || rows.length === 0) {
        consola.info('No calendars found.')
        return
      }

      if (args.json) return printJson(rows)

      printTable(
        ['Calendar ID', 'Name', 'Kind', 'Dates', 'Timezone', 'Seed'],
        rows.map((r) => [
          r.id.slice(0, 8) + '…',
          truncate(r.name, 32),
          r.kind,
          `${(r.dates ?? []).length} dates`,
          r.timezone,
          r.is_seed ? 'yes' : 'no',
        ]),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── schedule calendar attach / detach ────────────────────────────────────

const calendarAttach = defineCommand({
  meta: {
    name: 'attach',
    description: 'Attach a calendar overlay to a schedule.',
  },
  args: {
    schedule: { type: 'positional', description: 'Schedule UUID', required: true },
    calendar: { type: 'positional', description: 'Calendar UUID', required: true },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_set_schedule_calendar',
        { p_schedule_id: args.schedule, p_calendar_id: args.calendar },
        { requireAuth: true },
      )
      consola.success(
        'Attached calendar %s to schedule %s.',
        args.calendar,
        args.schedule,
      )
    } catch (err) {
      handleError(err)
    }
  },
})

const calendarDetach = defineCommand({
  meta: {
    name: 'detach',
    description: 'Detach the calendar overlay from a schedule.',
  },
  args: {
    schedule: { type: 'positional', description: 'Schedule UUID', required: true },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_set_schedule_calendar',
        { p_schedule_id: args.schedule, p_calendar_id: null },
        { requireAuth: true },
      )
      consola.success('Detached calendar from schedule %s.', args.schedule)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── schedule condition set / clear ───────────────────────────────────────

const conditionSet = defineCommand({
  meta: {
    name: 'set',
    description: 'Set the pre-dispatch condition (U-DSL JSON filter) for a schedule.',
  },
  args: {
    schedule: { type: 'positional', description: 'Schedule UUID', required: true },
    file: {
      type: 'string',
      description: 'Path to a JSON file containing the condition filter.',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const raw = await loadJsonFile(args.file)
      validateConditionFilter(raw)

      await callRpc(
        'fn_set_schedule_condition',
        { p_schedule_id: args.schedule, p_condition: raw },
        { requireAuth: true },
      )
      consola.success('Pre-dispatch condition set on schedule %s.', args.schedule)
      consola.info(
        'Tip: dry-run the same grammar with `lf automation test --file <rule.json> --event <payload>`.',
      )
    } catch (err) {
      handleError(err)
    }
  },
})

const conditionClear = defineCommand({
  meta: {
    name: 'clear',
    description: 'Clear the pre-dispatch condition on a schedule.',
  },
  args: {
    schedule: { type: 'positional', description: 'Schedule UUID', required: true },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_set_schedule_condition',
        { p_schedule_id: args.schedule, p_condition: null },
        { requireAuth: true },
      )
      consola.success('Pre-dispatch condition cleared on schedule %s.', args.schedule)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── schedule rotation set / clear ────────────────────────────────────────

const rotationSet = defineCommand({
  meta: {
    name: 'set',
    description: 'Set inputs rotation (JSON array) for a schedule. Resets the cursor.',
  },
  args: {
    schedule: { type: 'positional', description: 'Schedule UUID', required: true },
    file: {
      type: 'string',
      description: 'Path to a JSON file containing an array of input objects.',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const raw = await loadJsonFile(args.file)
      if (!Array.isArray(raw)) {
        throw new Error('Rotation file must contain a JSON array of input objects.')
      }
      if (raw.length === 0) {
        throw new Error('Rotation array must not be empty.')
      }
      for (const [i, entry] of raw.entries()) {
        if (!isPlainJsonObject(entry)) {
          throw new Error(`Rotation entry [${i}] must be a JSON object.`)
        }
      }

      await callRpc(
        'fn_set_schedule_inputs_rotation',
        { p_schedule_id: args.schedule, p_rotation: raw },
        { requireAuth: true },
      )
      consola.success(
        'Inputs rotation set on schedule %s (%d entries; cursor reset).',
        args.schedule,
        raw.length,
      )
    } catch (err) {
      handleError(err)
    }
  },
})

const rotationClear = defineCommand({
  meta: {
    name: 'clear',
    description: 'Clear inputs rotation on a schedule (also resets the cursor).',
  },
  args: {
    schedule: { type: 'positional', description: 'Schedule UUID', required: true },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_set_schedule_inputs_rotation',
        { p_schedule_id: args.schedule, p_rotation: null },
        { requireAuth: true },
      )
      consola.success('Inputs rotation cleared on schedule %s.', args.schedule)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── schedule preview ─────────────────────────────────────────────────────

const schedulePreview = defineCommand({
  meta: {
    name: 'preview',
    description: 'Preview the next N ticks for a schedule (calendar / condition / rotation applied).',
  },
  args: {
    schedule: { type: 'positional', description: 'Schedule UUID', required: true },
    next: {
      type: 'string',
      description: 'How many upcoming ticks to preview (1–100, default 10).',
      default: '10',
    },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const n = clampPreviewN(parseInt(args.next, 10), 10)

      const rows = await callRpc<PreviewTickRow[]>(
        'fn_preview_schedule_ticks',
        { p_schedule_id: args.schedule, p_n: n },
        { requireAuth: true },
      )

      if (!rows || rows.length === 0) {
        consola.info('No upcoming ticks within the preview horizon.')
        return
      }

      if (args.json) return printJson(rows)

      printTable(
        ['Tick At', 'Decision', 'Reason', 'Inputs (truncated)'],
        rows.map((r) => {
          const decisionLabel =
            r.decision === 'dispatch'
              ? colorize(r.decision, 'green')
              : r.decision === 'skip'
                ? colorize(r.decision, 'yellow')
                : r.decision
          const inputsRendered =
            r.inputs == null ? '—' : truncate(JSON.stringify(r.inputs), 48)
          return [
            new Date(r.tick_at).toLocaleString(),
            decisionLabel,
            r.reason,
            inputsRendered,
          ]
        }),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// Nested parents — citty-friendly subcommand trees.

const calendarParent = defineCommand({
  meta: { name: 'calendar', description: 'Manage schedule calendar overlays.' },
  subCommands: {
    create: calendarCreate,
    list: calendarList,
    attach: calendarAttach,
    detach: calendarDetach,
  },
})

const conditionParent = defineCommand({
  meta: { name: 'condition', description: 'Manage pre-dispatch conditions.' },
  subCommands: {
    set: conditionSet,
    clear: conditionClear,
  },
})

const rotationParent = defineCommand({
  meta: { name: 'rotation', description: 'Manage inputs rotation for a schedule.' },
  subCommands: {
    set: rotationSet,
    clear: rotationClear,
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
    backfill: scheduleBackfill,
    calendar: calendarParent,
    attach: calendarAttach,
    detach: calendarDetach,
    condition: conditionParent,
    rotation: rotationParent,
    preview: schedulePreview,
  },
})
