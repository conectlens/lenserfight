import { defineCommand } from 'citty'
import consola from 'consola'
import { handleError } from '../../utils/api'
import { followWorkflowRunEvents } from '../../lib/workflow-event-stream'

export default defineCommand({
  meta: {
    name: 'stream',
    description:
      'Poll and stream workflow run events (SSE-style tail with terminal FX).',
  },
  args: {
    run: {
      type: 'positional',
      description: 'Workflow run UUID',
      required: true,
    },
    interval: {
      type: 'string',
      description: 'Poll interval in seconds',
      default: '2',
    },
    timeout: {
      type: 'string',
      description: 'Max duration in seconds',
      default: '600',
    },
    json: { type: 'boolean', description: 'Buffer and print JSON on exit', default: false },
  },
  async run({ args }) {
    const intervalMs = Math.max(500, parseInt(args.interval, 10) * 1000)
    const timeoutMs = Math.max(intervalMs, parseInt(args.timeout, 10) * 1000)
    const ac = new AbortController()
    process.on('SIGINT', () => ac.abort())

    try {
      consola.info('Following events for run %s (Ctrl+C to stop)…', args.run)
      await followWorkflowRunEvents({
        runId: args.run,
        intervalMs,
        timeoutMs,
        json: args.json,
        signal: ac.signal,
      })
    } catch (err) {
      handleError(err)
    }
  },
})
