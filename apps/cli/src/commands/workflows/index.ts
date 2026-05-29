import { defineCommand } from 'citty'
import consola from 'consola'
import { listRecentWorkflowRuns, listWorkflowRuns } from '../../lib/data-services/executions'
import { handleError } from '../../utils/api'
import { printJson, printTable } from '../../utils/output'
import { makeLifecycleCommand } from '../../utils/lifecycle'

const list = defineCommand({
  meta: { name: 'list', description: 'List your cloud workflows.' },
  async run(ctx) {
    const workflow = await import('../workflow')
    const listCmd = (workflow.default as { subCommands?: Record<string, unknown> }).subCommands?.list
    const cmd = typeof listCmd === 'function' ? await listCmd() : listCmd
    return (cmd as { run?: (c: typeof ctx) => Promise<void> })?.run?.(ctx)
  },
})

const get = makeLifecycleCommand('workflow', 'status', 'Get workflow lifecycle status and dependencies.', 'Workflow UUID')

const create = defineCommand({
  meta: { name: 'create', description: 'Create a cloud workflow.' },
  async run(ctx) {
    const workflow = await import('../workflow')
    const createCmd = (workflow.default as { subCommands?: Record<string, unknown> }).subCommands?.create
    const cmd = typeof createCmd === 'function' ? await createCmd() : createCmd
    return (cmd as { run?: (c: typeof ctx) => Promise<void> })?.run?.(ctx)
  },
})

const del = makeLifecycleCommand(
  'workflow',
  'delete',
  'Delete a workflow (dependency-aware tombstone when referenced).',
  'Workflow UUID',
)

const update = defineCommand({
  meta: { name: 'update', description: 'Update a workflow schedule.' },
  args: {
    id: { type: 'positional', description: 'Schedule UUID', required: true },
  },
  async run(ctx) {
    const schedule = await import('../schedule')
    const updateCmd = (schedule.default as { subCommands?: Record<string, unknown> }).subCommands?.update
    const cmd = typeof updateCmd === 'function' ? await updateCmd() : updateCmd
    return (cmd as { run?: (c: typeof ctx) => Promise<void> })?.run?.(ctx)
  },
})

const insert = defineCommand({
  meta: { name: 'insert', description: 'Insert a trigger on a workflow.' },
  args: {
    id: { type: 'positional', description: 'Workflow UUID', required: true },
    type: { type: 'string', default: 'manual', description: 'cron | battle_event | webhook | manual' },
    condition: { type: 'string', default: '{}' },
  },
  async run({ args }) {
    const workflow = await import('../workflow')
    const trigger = (workflow.default as { subCommands?: Record<string, unknown> }).subCommands?.trigger
    const triggerCmd = typeof trigger === 'function' ? await trigger() : trigger
    const add = (triggerCmd as { subCommands?: Record<string, { run?: (c: unknown) => Promise<void> }> })
      ?.subCommands?.add
    const addCmd = typeof add === 'function' ? await add() : add
    await addCmd?.run?.({
      args: { id: args.id, type: args.type, condition: args.condition },
      cmd: {},
      rawArgs: [],
    })
  },
})

const stop = defineCommand({
  meta: { name: 'stop', description: 'Stop/cancel a workflow run.' },
  args: {
    run: { type: 'positional', description: 'Workflow run UUID', required: true },
  },
  async run({ args }) {
    const execution = await import('../execution')
    const cancel = (execution.default as { subCommands?: Record<string, unknown> }).subCommands?.cancel
    const cancelCmd = typeof cancel === 'function' ? await cancel() : cancel
    await (cancelCmd as { run?: (c: unknown) => Promise<void> })?.run?.({
      args: { run: args.run, json: false },
      cmd: {},
      rawArgs: [],
    })
  },
})

const schedule = defineCommand({
  meta: { name: 'schedule', description: 'Create a cron schedule for a workflow.' },
  async run(ctx) {
    const scheduleMod = await import('../schedule')
    const createCmd = (scheduleMod.default as { subCommands?: Record<string, unknown> }).subCommands?.create
    const cmd = typeof createCmd === 'function' ? await createCmd() : createCmd
    return (cmd as { run?: (c: typeof ctx) => Promise<void> })?.run?.(ctx)
  },
})

const runs = defineCommand({
  meta: { name: 'runs', description: 'List recent workflow runs (optionally for one workflow).' },
  args: {
    workflow: { type: 'string', default: '', description: 'Filter by workflow UUID' },
    limit: { type: 'string', default: '25' },
    offset: { type: 'string', default: '0' },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const limit = Math.min(Math.max(parseInt(args.limit, 10) || 25, 1), 100)
      const offset = Math.max(parseInt(args.offset, 10) || 0, 0)
      const rows = args.workflow
        ? await listWorkflowRuns(args.workflow, limit, offset)
        : await listRecentWorkflowRuns({ limit })

      if (rows.length === 0) {
        consola.info('No workflow runs found.')
        return
      }
      if (args.json) {
        printJson(rows)
        return
      }
      printTable(
        ['Run', 'Workflow', 'Status', 'Started', 'Completed'],
        rows.map((r) => [
          String(r.id).slice(0, 8) + '…',
          String(r.workflow_id).slice(0, 8) + '…',
          r.status,
          r.started_at ? new Date(r.started_at).toLocaleString() : '—',
          r.completed_at ? new Date(r.completed_at).toLocaleString() : '—',
        ]),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

const runLocal = defineCommand({
  meta: { name: 'run', description: 'Simulate a local WORKFLOW.md file.' },
  async run(ctx) {
    const workflow = await import('../workflow')
    const runCmd = (workflow.default as { subCommands?: Record<string, unknown> }).subCommands?.run
    const cmd = typeof runCmd === 'function' ? await runCmd() : runCmd
    return (cmd as { run?: (c: typeof ctx) => Promise<void> })?.run?.(ctx)
  },
})

const validate = defineCommand({
  meta: { name: 'validate', description: 'Validate a local WORKFLOW.md file.' },
  async run(ctx) {
    const workflow = await import('../workflow')
    const validateCmd = (workflow.default as { subCommands?: Record<string, unknown> }).subCommands?.validate
    const cmd = typeof validateCmd === 'function' ? await validateCmd() : validateCmd
    return (cmd as { run?: (c: typeof ctx) => Promise<void> })?.run?.(ctx)
  },
})

export default defineCommand({
  meta: {
    name: 'workflows',
    description:
      'Workflow hub: list, get, create, update schedules, insert triggers, stop runs, and inspect history.',
  },
  subCommands: {
    list,
    get,
    create,
    update,
    delete: del,
    insert,
    stop,
    schedule,
    runs,
    run: runLocal,
    validate,
  },
})
