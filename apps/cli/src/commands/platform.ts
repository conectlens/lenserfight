import { defineCommand } from 'citty'
import consola from 'consola'
import { callRpc, handleError } from '../utils/api'
import { printTable, printJson } from '../utils/output'
import { assertSafe } from '../lib/safety'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface ExecutionStatus {
  system_kill_switch_active: boolean
  queue_frozen:              boolean
  frozen_reason:             string | null
  active_run_count:          number
  queued_run_count:          number
  active_battle_job_count:   number
  queued_battle_job_count:   number
  active_worker_count:       number
  stale_worker_count:        number
  dlq_workflow_count:        number
  dlq_battle_count:          number
}

// ---------------------------------------------------------------------------
// platform status
// ---------------------------------------------------------------------------

const platformStatus = defineCommand({
  meta: {
    name:        'status',
    description: 'Show global execution health dashboard.',
  },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const status = await callRpc<ExecutionStatus>(
        'fn_get_execution_status',
        {},
        { requireAuth: true }
      )

      if (args.json) {
        printJson(status)
        return
      }

      printTable(
        ['Metric', 'Value'],
        [
          ['System Kill Switch',  status.system_kill_switch_active ? 'ACTIVE' : 'inactive'],
          ['Queue Frozen',        status.queue_frozen
            ? `FROZEN — ${status.frozen_reason ?? 'no reason'}`
            : 'running'],
          ['Active Runs',         String(status.active_run_count)],
          ['Queued Runs',         String(status.queued_run_count)],
          ['Active Battle Jobs',  String(status.active_battle_job_count)],
          ['Queued Battle Jobs',  String(status.queued_battle_job_count)],
          ['Active Workers',      String(status.active_worker_count)],
          ['Stale Workers',       String(status.stale_worker_count)],
          ['Workflow DLQ',        String(status.dlq_workflow_count)],
          ['Battle DLQ',          String(status.dlq_battle_count)],
        ]
      )

      if (status.system_kill_switch_active) {
        consola.warn('System is LOCKED. Resume with: lf platform resume <switch-id>')
      }
      if (status.stale_worker_count > 0) {
        consola.warn('%d stale worker(s) detected (no heartbeat in > 2 min).', status.stale_worker_count)
      }
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// platform emergency-stop
// ---------------------------------------------------------------------------

const platformEmergencyStop = defineCommand({
  meta: {
    name:        'emergency-stop',
    description: 'Activate the system-wide kill switch (admin only). New executions halt immediately.',
  },
  args: {
    reason: { type: 'string',  description: 'Reason for the emergency stop (required)', required: true },
    force:  { type: 'boolean', description: 'Skip interactive confirmation (for CI/scripted use)', default: false },
  },
  async run({ args }) {
    await assertSafe({
      risk:               'CRITICAL',
      reversibility:      'REVERSIBLE',
      confirmationPolicy: 'TYPED',
      typedPhrase:        'PLATFORM DOWN',
      forceFlag:          '--force',
      hasForce:           args.force,
      description:        'Activate a system-wide kill switch. All autonomous operations halt immediately.',
      affectedResources: [
        { type: 'platform', name: 'All workers, schedulers, and execution queues', scope: 'production' },
      ],
      rollbackAvailable: true,
      notes: [
        `Reason recorded: ${args.reason}`,
        'To also cancel in-flight runs use: lf platform kill-all',
        'Resume with: lf platform resume <switch-id>',
      ],
    })

    try {
      const result = await callRpc<{ switch_id: string; cancelled_runs: number; cancelled_jobs: number }>(
        'fn_emergency_stop',
        { p_reason: args.reason, p_force_mode: false },
        { requireAuth: true }
      )
      consola.warn('Emergency stop ACTIVATED. Switch ID: %s', result.switch_id)
      consola.warn('All new executions are blocked. Workers will back off on next claim attempt.')
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// platform kill-all
// ---------------------------------------------------------------------------

const platformKillAll = defineCommand({
  meta: {
    name:        'kill-all',
    description: 'Activate system kill switch AND cancel all in-flight runs and battle jobs (admin only).',
  },
  args: {
    reason: { type: 'string',  description: 'Reason for the kill-all (required)', required: true },
    force:  { type: 'boolean', description: 'Skip interactive confirmation (for CI/scripted use)', default: false },
  },
  async run({ args }) {
    await assertSafe({
      risk:               'CRITICAL',
      reversibility:      'REVERSIBLE',
      confirmationPolicy: 'TYPED',
      typedPhrase:        'KILL ALL RUNS',
      forceFlag:          '--force',
      hasForce:           args.force,
      description:        'Activate system kill switch AND cancel ALL active and queued workflow runs and battle jobs.',
      affectedResources: [
        { type: 'platform', name: 'All active workflow runs and battle execution jobs', scope: 'production' },
      ],
      rollbackAvailable: true,
      notes: [
        `Reason recorded: ${args.reason}`,
        'This cannot un-cancel runs that were terminated.',
        'Resume the kill switch with: lf platform resume <switch-id>',
      ],
    })

    try {
      const result = await callRpc<{ switch_id: string; cancelled_runs: number; cancelled_jobs: number }>(
        'fn_emergency_stop',
        { p_reason: args.reason, p_force_mode: true },
        { requireAuth: true }
      )
      consola.warn('Kill-all ACTIVATED. Switch ID: %s', result.switch_id)
      consola.warn('Cancelled %d workflow run(s) and %d battle job(s).', result.cancelled_runs, result.cancelled_jobs)
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// platform resume <switch-id>
// ---------------------------------------------------------------------------

const platformResume = defineCommand({
  meta: {
    name:        'resume',
    description: 'Lift a platform kill switch to resume autonomous operations (admin only).',
  },
  args: {
    id: {
      type:        'positional',
      description: 'Kill switch UUID (from: lf kill-switch platform list)',
      required:    true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_kill_switch_lift', { p_switch_id: args.id }, { requireAuth: true })
      consola.success('Kill switch %s lifted. Autonomous operations can resume.', args.id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// platform queue-freeze
// ---------------------------------------------------------------------------

const platformQueueFreeze = defineCommand({
  meta: {
    name:        'queue-freeze',
    description: 'Freeze the scheduled-workflow dispatch queue without cancelling in-flight runs (admin only).',
  },
  args: {
    reason: { type: 'string',  description: 'Reason for the queue freeze (required)', required: true },
    force:  { type: 'boolean', description: 'Skip interactive confirmation', default: false },
  },
  async run({ args }) {
    await assertSafe({
      risk:               'HIGH',
      reversibility:      'REVERSIBLE',
      confirmationPolicy: 'FLAG',
      forceFlag:          '--force',
      hasForce:           args.force,
      description:        'Freeze the workflow dispatch queue. No new scheduled runs will start. In-flight runs are unaffected.',
      affectedResources: [
        { type: 'scheduler', name: 'fn_dispatch_scheduled_workflows', scope: 'remote' },
      ],
      rollbackAvailable: true,
      notes: [
        `Reason: ${args.reason}`,
        'Resume with: lf platform queue-unfreeze',
      ],
    })

    try {
      await callRpc('fn_queue_freeze', { p_reason: args.reason }, { requireAuth: true })
      consola.warn('Queue FROZEN — %s. New scheduled runs will not dispatch.', args.reason)
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// platform queue-unfreeze
// ---------------------------------------------------------------------------

const platformQueueUnfreeze = defineCommand({
  meta: {
    name:        'queue-unfreeze',
    description: 'Resume the scheduled-workflow dispatch queue after a freeze (admin only).',
  },
  args: {},
  async run() {
    try {
      await callRpc('fn_queue_unfreeze', {}, { requireAuth: true })
      consola.success('Queue unfrozen. Scheduled dispatches will resume on the next cron tick.')
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// platform scheduler-disable  (alias for queue-freeze)
// ---------------------------------------------------------------------------

const platformSchedulerDisable = defineCommand({
  meta: {
    name:        'scheduler-disable',
    description: 'Disable the automated workflow scheduler (alias for queue-freeze).',
  },
  args: {
    reason: { type: 'string',  description: 'Reason for disabling the scheduler (required)', required: true },
    force:  { type: 'boolean', description: 'Skip interactive confirmation', default: false },
  },
  async run({ args }) {
    await assertSafe({
      risk:               'HIGH',
      reversibility:      'REVERSIBLE',
      confirmationPolicy: 'FLAG',
      forceFlag:          '--force',
      hasForce:           args.force,
      description:        'Disable the automated workflow scheduler. No new scheduled runs will dispatch.',
      affectedResources: [
        { type: 'scheduler', name: 'fn_dispatch_scheduled_workflows', scope: 'remote' },
      ],
      rollbackAvailable: true,
      notes: [`Reason: ${args.reason}`, 'Re-enable with: lf platform scheduler-enable'],
    })

    try {
      await callRpc('fn_queue_freeze', { p_reason: args.reason }, { requireAuth: true })
      consola.warn('Scheduler DISABLED — %s.', args.reason)
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// platform scheduler-enable  (alias for queue-unfreeze)
// ---------------------------------------------------------------------------

const platformSchedulerEnable = defineCommand({
  meta: {
    name:        'scheduler-enable',
    description: 'Re-enable the automated workflow scheduler (alias for queue-unfreeze).',
  },
  args: {},
  async run() {
    try {
      await callRpc('fn_queue_unfreeze', {}, { requireAuth: true })
      consola.success('Scheduler re-enabled. Scheduled dispatches will resume on the next cron tick.')
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// Root command
// ---------------------------------------------------------------------------

export default defineCommand({
  meta: {
    name:        'platform',
    description: 'Platform-level execution control and health dashboard (admin only).',
  },
  subCommands: {
    status:              platformStatus,
    'emergency-stop':    platformEmergencyStop,
    'kill-all':          platformKillAll,
    resume:              platformResume,
    'queue-freeze':      platformQueueFreeze,
    'queue-unfreeze':    platformQueueUnfreeze,
    'scheduler-disable': platformSchedulerDisable,
    'scheduler-enable':  platformSchedulerEnable,
  },
})
