import { defineCommand } from 'citty'
import consola from 'consola'
import {
  getExecutionPlatformStatus,
  listRecentWorkflowRuns,
} from '../lib/data-services/executions'
import { callRpc, handleError } from '../utils/api'
import { printJson, printTable, truncate } from '../utils/output'
import { assertSafe } from '../lib/safety'

interface WorkflowRunRow {
  id: string
  workflow_id: string
  status: string
  active_node_id: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  parent_run_id: string | null
}

interface WorkflowRunStateProjection {
  run_id: string
  workflow_id: string
  status: string
  active_node_id: string | null
  pending_count: number
  waiting_count: number
  in_flight_count: number
  executed_count: number
  failed_count: number
  is_running: boolean
  started_at: string | null
  completed_at: string | null
  parent_run_id: string | null
  recursion_depth: number
  upstream_count: number
  downstream_count: number
  node_results: Array<{
    id: string
    node_id: string
    node_label: string | null
    node_ordinal: number | null
    status: string
    waiting_reason: string | null
    error_message: string | null
    retry_count: number | null
    duration_ms: number | null
    ttfb_ms: number | null
    started_at: string | null
    completed_at: string | null
  }>
}

interface WorkflowRunProvenanceEdgeRow {
  id: string
  direction: 'upstream' | 'downstream'
  source_run_id: string
  source_workflow_id: string
  source_node_id: string
  source_output_path: string
  target_run_id: string
  target_workflow_id: string
  target_node_id: string
  target_input_path: string
  transform: Record<string, unknown> | null
  created_at: string
}

interface WorkflowRunEventRow {
  event_id: number
  type: string
  run_id: string
  occurred_at: string
  payload: Record<string, unknown>
}

const VALID_STATUSES = new Set([
  'draft',
  'validated',
  'queued',
  'pending',
  'running',
  'streaming',
  'recovered',
  'completed',
  'failed',
  'cancelled',
  'timed_out',
])

// ─── execution list ────────────────────────────────────────────────────────

const executionList = defineCommand({
  meta: {
    name: 'list',
    description: 'List recent workflow runs.',
  },
  args: {
    workflow: {
      type: 'string',
      description: 'Filter by workflow UUID',
      default: '',
    },
    status: {
      type: 'string',
      description: 'Filter by run status (running | completed | failed | …)',
      default: '',
    },
    limit: { type: 'string', description: 'Max rows (default 25)', default: '25' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    if (args.status && !VALID_STATUSES.has(args.status)) {
      consola.error(
        'Invalid status "%s". Allowed: %s',
        args.status,
        Array.from(VALID_STATUSES).join(', ')
      )
      process.exitCode = 1
      return
    }
    try {
      const rows = await listRecentWorkflowRuns({
        workflowId: args.workflow || undefined,
        status: args.status || undefined,
        limit: parseInt(args.limit, 10) || 25,
      })

      if (!rows || rows.length === 0) {
        consola.info('No runs found.')
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['Run', 'Workflow', 'Status', 'Active Node', 'Started', 'Completed'],
        rows.map((r) => [
          r.id.slice(0, 8) + '…',
          r.workflow_id.slice(0, 8) + '…',
          r.status,
          r.active_node_id ? r.active_node_id.slice(0, 8) + '…' : '—',
          r.started_at ? new Date(r.started_at).toLocaleString() : '—',
          r.completed_at ? new Date(r.completed_at).toLocaleString() : '—',
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── execution inspect ─────────────────────────────────────────────────────

const executionInspect = defineCommand({
  meta: {
    name: 'inspect',
    description: 'Show the n8n-style run state projection for a run.',
  },
  args: {
    run: {
      type: 'positional',
      description: 'Workflow Run UUID',
      required: true,
    },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const projection = await callRpc<WorkflowRunStateProjection | null>(
        'fn_get_workflow_run_state',
        { p_run_id: args.run },
        { requireAuth: true }
      )

      if (!projection) {
        consola.error('Run %s not found.', args.run)
        process.exitCode = 1
        return
      }

      if (args.json) {
        printJson(projection)
        return
      }

      consola.info('Run ID:          %s', projection.run_id)
      consola.info('Workflow:        %s', projection.workflow_id)
      consola.info('Status:          %s', projection.status)
      consola.info('Active node:     %s', projection.active_node_id ?? '—')
      consola.info('Started at:      %s', projection.started_at ?? '—')
      consola.info('Completed at:    %s', projection.completed_at ?? '—')
      consola.info(
        'Counts:          pending=%d, waiting=%d, in_flight=%d, executed=%d, failed=%d',
        projection.pending_count,
        projection.waiting_count,
        projection.in_flight_count,
        projection.executed_count,
        projection.failed_count
      )
      consola.info(
        'Provenance:      upstream=%d, downstream=%d',
        projection.upstream_count,
        projection.downstream_count
      )
      if (projection.parent_run_id) {
        consola.info(
          'Parent run:      %s (depth=%d)',
          projection.parent_run_id,
          projection.recursion_depth
        )
      }

      if (projection.node_results.length > 0) {
        consola.info('\nNode results:')
        printTable(
          ['Ord', 'Node', 'Label', 'Status', 'Waiting', 'Retries', 'Dur (ms)'],
          projection.node_results.map((n) => [
            n.node_ordinal != null ? String(n.node_ordinal) : '—',
            n.node_id.slice(0, 8) + '…',
            truncate(n.node_label ?? '—', 24),
            n.status,
            n.waiting_reason ?? '—',
            String(n.retry_count ?? 0),
            n.duration_ms != null ? String(n.duration_ms) : '—',
          ])
        )
      }
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── execution provenance ──────────────────────────────────────────────────

const executionProvenance = defineCommand({
  meta: {
    name: 'provenance',
    description: 'Show field-level lineage edges for a run.',
  },
  args: {
    run: {
      type: 'positional',
      description: 'Workflow Run UUID',
      required: true,
    },
    direction: {
      type: 'string',
      description: 'Filter by direction (upstream | downstream | all)',
      default: 'all',
    },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const edges = await callRpc<WorkflowRunProvenanceEdgeRow[]>(
        'fn_get_run_provenance',
        { p_run_id: args.run },
        { requireAuth: true }
      )

      const filtered =
        args.direction === 'all' ? edges : edges?.filter((e) => e.direction === args.direction)

      if (!filtered || filtered.length === 0) {
        consola.info('No provenance edges for %s.', args.run)
        return
      }

      if (args.json) {
        printJson(filtered)
        return
      }

      printTable(
        ['Direction', 'Source Node', 'Source Path', 'Target Node', 'Target Path'],
        filtered.map((e) => [
          e.direction,
          e.source_node_id.slice(0, 8) + '…',
          truncate(e.source_output_path, 24),
          e.target_node_id.slice(0, 8) + '…',
          truncate(e.target_input_path, 24),
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── execution events ──────────────────────────────────────────────────────

const executionEvents = defineCommand({
  meta: {
    name: 'events',
    description: 'List SSE events recorded for a run.',
  },
  args: {
    run: {
      type: 'positional',
      description: 'Workflow Run UUID',
      required: true,
    },
    after: {
      type: 'string',
      description: 'Only show events with event_id strictly greater than this',
      default: '',
    },
    limit: { type: 'string', description: 'Max events (default 100)', default: '100' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
    follow: {
      type: 'boolean',
      description: 'Poll and stream new events (SSE-style tail; Ctrl+C to stop)',
      default: false,
    },
    timeout: {
      type: 'string',
      description: 'Max follow duration in seconds (with --follow)',
      default: '600',
    },
    interval: {
      type: 'string',
      description: 'Poll interval in seconds (with --follow)',
      default: '2',
    },
  },
  async run({ args }) {
    if (args.follow) {
      const { followWorkflowRunEvents } = await import('../lib/workflow-event-stream')
      const ac = new AbortController()
      process.on('SIGINT', () => ac.abort())
      try {
        await followWorkflowRunEvents({
          runId: args.run,
          intervalMs: Math.max(500, parseInt(args.interval, 10) * 1000),
          timeoutMs: Math.max(1000, parseInt(args.timeout, 10) * 1000),
          json: args.json,
          signal: ac.signal,
        })
      } catch (err) {
        handleError(err)
      }
      return
    }

    try {
      const afterEventId = args.after ? parseInt(args.after, 10) : 0
      if (args.after && !Number.isFinite(afterEventId)) {
        consola.error('--after must be a number, got "%s"', args.after)
        process.exitCode = 1
        return
      }

      const rows = await callRpc<WorkflowRunEventRow[]>(
        'fn_list_workflow_run_events',
        {
          p_run_id: args.run,
          p_after_event_id: afterEventId,
          p_limit: parseInt(args.limit, 10),
        },
        { requireAuth: true }
      )

      if (!rows || rows.length === 0) {
        consola.info('No events found for %s.', args.run)
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['#', 'When', 'Type'],
        rows.map((e) => [String(e.event_id), new Date(e.occurred_at).toLocaleString(), e.type])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── execution wait ───────────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out'])

const executionWait = defineCommand({
  meta: {
    name: 'wait',
    description:
      'Poll a workflow run until it reaches a terminal status, then print the final node results.',
  },
  args: {
    run: {
      type: 'positional',
      description: 'Workflow Run UUID (omit when using --workflow --any)',
      required: false,
    },
    workflow: {
      type: 'string',
      description: 'Workflow UUID — pair with --any to wait for any run',
      default: '',
    },
    any: {
      type: 'boolean',
      description:
        'When set with --workflow, wait for any run of that workflow to reach terminal state',
      default: false,
    },
    timeout: {
      type: 'string',
      description: 'Max wait time in seconds (default 300)',
      default: '300',
    },
    interval: {
      type: 'string',
      description: 'Poll interval in seconds (default 2)',
      default: '2',
    },
    json: { type: 'boolean', description: 'Output final state as JSON', default: false },
  },
  async run({ args }) {
    const timeoutMs = parseInt(args.timeout, 10) * 1_000
    const intervalMs = parseInt(args.interval, 10) * 1_000
    const deadline = Date.now() + timeoutMs

    // ── Mode A: --workflow --any → poll lenses.workflow_runs for the latest
    // ── run on this workflow, exit 0 on success, 1 on terminal failure.
    if (args.workflow && args.any) {
      consola.start('Waiting for any run of workflow %s…', args.workflow)
      try {
        while (true) {
          await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))

          const runs = await callRpc<WorkflowRunRow[]>(
            'fn_list_workflow_runs',
            { p_workflow_id: args.workflow, p_limit: 5, p_offset: 0 },
            { requireAuth: true }
          )
          const terminal = runs?.find((r) => TERMINAL_STATUSES.has(r.status))
          if (terminal) {
            const ok = terminal.status === 'completed'
            if (args.json) printJson(terminal)
            else if (ok)
              consola.success('Run %s for workflow %s succeeded.', terminal.id, args.workflow)
            else consola.warn('Run %s ended with status: %s', terminal.id, terminal.status)
            process.exitCode = ok ? 0 : 1
            return
          }
          if (Date.now() >= deadline) {
            consola.error(
              'Timed out waiting for any run of workflow %s (limit %ds).',
              args.workflow,
              Math.floor(timeoutMs / 1_000)
            )
            process.exitCode = 1
            return
          }
        }
      } catch (err) {
        handleError(err)
        return
      }
    }

    if (!args.run) {
      consola.error('A run UUID is required (or pass --workflow <id> --any).')
      process.exitCode = 1
      return
    }

    consola.start('Waiting for run %s…', args.run)

    try {
      while (true) {
        await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))

        const state = await callRpc<WorkflowRunStateProjection | null>(
          'fn_get_workflow_run_state',
          { p_run_id: args.run },
          { requireAuth: true }
        )

        if (!state) {
          consola.error('Run %s not found.', args.run)
          process.exitCode = 1
          return
        }

        if (!args.json) {
          consola.info(
            'status=%s  pending=%d  in_flight=%d  executed=%d  failed=%d',
            state.status,
            state.pending_count,
            state.in_flight_count,
            state.executed_count,
            state.failed_count
          )
        }

        if (TERMINAL_STATUSES.has(state.status)) {
          if (args.json) {
            printJson(state)
          } else {
            if (state.status === 'completed') consola.success('Run %s completed.', args.run)
            else consola.warn('Run %s ended with status: %s', args.run, state.status)

            if (state.node_results.length > 0) {
              printTable(
                ['Ord', 'Node', 'Label', 'Status', 'Dur (ms)'],
                state.node_results.map((n) => [
                  n.node_ordinal != null ? String(n.node_ordinal) : '—',
                  n.node_id.slice(0, 8) + '…',
                  truncate(n.node_label ?? '—', 24),
                  n.status,
                  n.duration_ms != null ? String(n.duration_ms) : '—',
                ])
              )
            }
          }
          return
        }

        if (Date.now() >= deadline) {
          consola.error(
            'Timed out waiting for run %s (limit %ds).',
            args.run,
            Math.floor(timeoutMs / 1_000)
          )
          process.exitCode = 1
          return
        }
      }
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── execution cancel ──────────────────────────────────────────────────────

const executionCancel = defineCommand({
  meta: {
    name: 'cancel',
    description: 'Cancel a running workflow run. Requires --force to confirm.',
  },
  args: {
    run: {
      type: 'positional',
      description: 'Workflow Run UUID',
      required: true,
    },
    force: {
      type: 'boolean',
      description: 'Required: confirm cancellation',
      default: false,
    },
  },
  async run({ args }) {
    await assertSafe({
      risk: 'MEDIUM',
      reversibility: 'PARTIAL',
      confirmationPolicy: 'FLAG',
      forceFlag: '--force',
      hasForce: args.force,
      description: `Cancel workflow run ${args.run}. Any in-flight work will be interrupted.`,
      affectedResources: [{ type: 'execution', name: args.run, scope: 'remote' }],
      rollbackAvailable: true,
      notes: ['Failed or cancelled runs can be retried with: lf execution retry <run>'],
    })
    try {
      await callRpc(
        'fn_update_workflow_run_status',
        { p_run_id: args.run, p_status: 'cancelled' },
        { requireAuth: true }
      )
      consola.success('Run %s cancelled.', args.run)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── execution retry ───────────────────────────────────────────────────────
//
// "Retry" today is a status flip back to 'queued' for an existing run that
// terminated in failure. The recovery sweeper (added in
// 20260422000000_workflow_recovery.sql) re-claims the run on its next pass.

const executionRetry = defineCommand({
  meta: {
    name: 'retry',
    description: 'Re-queue a failed run for the recovery sweeper to pick up.',
  },
  args: {
    run: {
      type: 'positional',
      description: 'Workflow Run UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const existing = await callRpc<WorkflowRunStateProjection | null>(
        'fn_get_workflow_run_state',
        { p_run_id: args.run },
        { requireAuth: true }
      )
      if (!existing) {
        consola.error('Run %s not found.', args.run)
        process.exitCode = 1
        return
      }
      if (!['failed', 'cancelled', 'timed_out'].includes(existing.status)) {
        consola.error(
          'Run %s is in status "%s"; only failed / cancelled / timed_out runs can be retried.',
          args.run,
          existing.status
        )
        process.exitCode = 1
        return
      }
      await callRpc(
        'fn_update_workflow_run_status',
        { p_run_id: args.run, p_status: 'queued' },
        { requireAuth: true }
      )
      consola.success('Run %s re-queued. Recovery sweeper will pick it up.', args.run)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── execution status ──────────────────────────────────────────────────────
// Global execution health dashboard. Available to all authenticated users
// (not admin-only) so operators can check system state without elevated access.

const executionStatus = defineCommand({
  meta: {
    name: 'status',
    description:
      'Show platform execution health: queue state, in-flight runs/jobs, workers, and DLQ depth.',
  },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const status = await getExecutionPlatformStatus()

      if (args.json) {
        printJson(status)
        return
      }

      printTable(
        ['Metric', 'Value'],
        [
          ['System Kill Switch', status.system_kill_switch_active ? 'ACTIVE' : 'inactive'],
          [
            'Queue Frozen',
            status.queue_frozen ? `FROZEN — ${status.frozen_reason ?? 'no reason'}` : 'running',
          ],
          ['Active Runs', String(status.active_run_count)],
          ['Queued Runs', String(status.queued_run_count)],
          ['Active Battle Jobs', String(status.active_battle_job_count)],
          ['Queued Battle Jobs', String(status.queued_battle_job_count)],
          ['Active Workers', String(status.active_worker_count)],
          ['Stale Workers', String(status.stale_worker_count)],
          ['Workflow DLQ', String(status.dlq_workflow_count)],
          ['Battle DLQ', String(status.dlq_battle_count)],
        ]
      )

      consola.info(
        'Queue Frozen "running" = new workflow and battle jobs are accepted. Counts are platform-wide snapshots — zero means idle, not broken.',
      )

      if (status.system_kill_switch_active) {
        consola.warn('System is LOCKED. Contact a platform admin to resume.')
      }
      if (status.stale_worker_count > 0) {
        consola.warn(
          '%d stale worker(s) detected (no heartbeat in > 2 min).',
          status.stale_worker_count
        )
      }
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── parent ────────────────────────────────────────────────────────────────

export default defineCommand({
  meta: {
    name: 'execution',
    description: 'Inspect ConnectedLenses workflow run executions.',
  },
  subCommands: {
    status: executionStatus,
    list: executionList,
    inspect: executionInspect,
    wait: executionWait,
    provenance: executionProvenance,
    events: executionEvents,
    cancel: executionCancel,
    retry: executionRetry,
  },
})
