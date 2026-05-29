import { defineCommand } from 'citty'
import consola from 'consola'
import {
  getLensExecutionHistory,
  getMyExecutionActivityFeed,
  listWorkflowRuns,
} from '../../lib/data-services/executions'
import { handleError } from '../../utils/api'
import { printJson, printTable, truncate } from '../../utils/output'

function shortId(id: string | null | undefined): string {
  if (!id) return '—'
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

export default defineCommand({
  meta: {
    name: 'history',
    description:
      'List your execution history (activity feed, lens runs, or workflow runs).',
  },
  args: {
    lens: {
      type: 'string',
      description: 'Lens UUID — list prompt/model executions for this lens',
      default: '',
    },
    workflow: {
      type: 'string',
      description: 'Workflow UUID — list runs for this workflow',
      default: '',
    },
    limit: { type: 'string', description: 'Max rows (default 25)', default: '25' },
    offset: { type: 'string', description: 'Skip rows for pagination', default: '0' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    if (args.lens && args.workflow) {
      consola.error('Use either --lens or --workflow, not both.')
      process.exitCode = 1
      return
    }

    const limit = Math.min(Math.max(parseInt(args.limit, 10) || 25, 1), 100)
    const offset = Math.max(parseInt(args.offset, 10) || 0, 0)

    try {
      if (args.lens) {
        const rows = await getLensExecutionHistory(args.lens, limit, offset)
        if (rows.length === 0) {
          consola.info('No lens executions found.')
          return
        }
        if (args.json) {
          printJson(rows)
          return
        }
        printTable(
          ['Run', 'Model', 'Provider', 'Status', 'Tokens', 'Credits', 'When'],
          rows.map((r) => [
            shortId(r.runId),
            r.modelKey ?? '—',
            r.providerKey ?? '—',
            r.runStatus ?? '—',
            r.tokenInput != null || r.tokenOutput != null
              ? `${r.tokenInput ?? 0}/${r.tokenOutput ?? 0}`
              : '—',
            r.creditCost != null ? String(r.creditCost) : '—',
            formatWhen(r.createdAt),
          ]),
        )
        return
      }

      if (args.workflow) {
        const rows = await listWorkflowRuns(args.workflow, limit, offset)
        if (rows.length === 0) {
          consola.info('No workflow runs found.')
          return
        }
        if (args.json) {
          printJson(rows)
          return
        }
        printTable(
          ['Run', 'Workflow', 'Status', 'Trigger', 'Started', 'Completed'],
          rows.map((r) => [
            shortId(r.id),
            shortId(r.workflow_id),
            r.status,
            r.trigger_mode ?? '—',
            formatWhen(r.started_at),
            formatWhen(r.completed_at),
          ]),
        )
        return
      }

      const rows = await getMyExecutionActivityFeed(limit, offset)
      if (rows.length === 0) {
        consola.info('No execution activity found.')
        return
      }
      if (args.json) {
        printJson(rows)
        return
      }
      printTable(
        ['When', 'Kind', 'Agent', 'Title', 'Status', 'Ref'],
        rows.map((r) => [
          formatWhen(r.occurred_at),
          r.kind,
          truncate(r.ai_lenser_handle || r.ai_lenser_name, 16),
          truncate(r.title, 32),
          r.status,
          shortId(r.team_run_id ?? r.workflow_id ?? r.schedule_id),
        ]),
      )
    } catch (err) {
      handleError(err)
    }
  },
})
