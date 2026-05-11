import type { IncomingMessage, ServerResponse } from 'node:http'
import { getBearerToken } from '../../lib/http'
import { createUserSupabaseClient } from '../../lib/supabase'

const POLL_INTERVAL_MS = 2_000
const KEEP_ALIVE_INTERVAL_MS = 15_000
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out'])

export async function handleRunsSseRoute(
  req: IncomingMessage,
  res: ServerResponse,
  runId: string,
): Promise<void> {
  const token = getBearerToken(req)
  if (!token) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ code: 'unauthorized', message: 'Missing bearer token' }))
    return
  }

  const lastEventIdHeader = req.headers['last-event-id']
  let cursor = typeof lastEventIdHeader === 'string' ? parseInt(lastEventIdHeader, 10) : 0
  if (!Number.isFinite(cursor) || cursor < 0) cursor = 0

  const userClient = createUserSupabaseClient(token)

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Expose-Headers': 'Last-Event-ID',
  })

  let closed = false
  req.on('close', () => {
    closed = true
  })

  const keepAliveTimer = setInterval(() => {
    if (!closed) res.write(': keep-alive\n\n')
  }, KEEP_ALIVE_INTERVAL_MS)

  try {
    while (!closed) {
      const { data: runData } = await userClient.rpc('fn_get_run_details', {
        p_run_id: runId,
      })

      const run = Array.isArray(runData) ? runData[0] : runData
      if (run) {
        const eventId = cursor + 1
        res.write(
          `id: ${eventId}\nevent: run_status\ndata: ${JSON.stringify({ status: run.status, runId, timestamp: run.created_at })}\n\n`,
        )
        cursor = eventId
      }

      if (closed) break

      const { data: stateData } = await userClient
        .rpc('fn_get_workflow_run_state', { p_run_id: runId })

      const state = Array.isArray(stateData) ? stateData[0] : stateData
      const status = String(state?.status ?? run?.status ?? '')

      if (TERMINAL_STATUSES.has(status)) {
        res.write(`event: done\ndata: ${JSON.stringify({ status, runId })}\n\n`)
        break
      }

      await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  } finally {
    clearInterval(keepAliveTimer)
    if (!closed) res.end()
  }
}
