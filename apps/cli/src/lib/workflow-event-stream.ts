/**
 * Poll workflow_run_events and render new rows with terminal FX (SSE-style tail).
 */

import { callRest } from '../utils/api'
import { printJson } from '../utils/output'
import { glitchLine, startSpinner, streamTokenLine } from './terminal-fx'
import { A } from '../utils/ansi'

export interface WorkflowRunEventRow {
  event_id: number
  type: string
  run_id: string
  workflow_id: string | null
  timestamp: string
  payload: Record<string, unknown>
}

export async function fetchWorkflowRunEvents(
  runId: string,
  afterEventId: number,
  limit: number,
): Promise<WorkflowRunEventRow[]> {
  const query: Record<string, string | number> = {
    select: 'event_id,type,run_id,workflow_id,timestamp,payload',
    run_id: `eq.${runId}`,
    order: 'event_id.asc',
    limit,
  }
  if (afterEventId > 0) {
    query.event_id = `gt.${afterEventId}`
  }
  const rows = await callRest<WorkflowRunEventRow[]>(
    'lenses',
    'workflow_run_events',
    'GET',
    undefined,
    { requireAuth: true, query },
  )
  return rows ?? []
}

function formatEventRow(e: WorkflowRunEventRow): string {
  const ts = new Date(e.timestamp).toLocaleTimeString()
  const payload =
    e.payload && typeof e.payload === 'object'
      ? JSON.stringify(e.payload).slice(0, 80)
      : ''
  return `${A.gray}${ts}${A.reset} ${A.brightCyan}${e.type.padEnd(18)}${A.reset} ${A.dim}#${e.event_id}${A.reset} ${payload}`
}

/** Follow new workflow run events until aborted or timeout. */
export async function followWorkflowRunEvents(opts: {
  runId: string
  intervalMs: number
  timeoutMs: number
  json: boolean
  signal?: AbortSignal
}): Promise<void> {
  const { runId, intervalMs, timeoutMs, json, signal } = opts
  const deadline = Date.now() + timeoutMs
  let lastId = 0
  const collected: WorkflowRunEventRow[] = []

  if (!json && process.stderr.isTTY) {
    for (const line of [`  ${glitchLine(`run:${runId.slice(0, 8)}`, 52)}`, '']) {
      process.stderr.write(line + '\n')
    }
  }

  const spinner = startSpinner(`streaming events · ${runId.slice(0, 8)}…`)

  try {
    while (Date.now() < deadline) {
      if (signal?.aborted) break

      const batch = await fetchWorkflowRunEvents(runId, lastId, 50)
      for (const row of batch) {
        lastId = Math.max(lastId, row.event_id)
        collected.push(row)
        if (json) continue
        if (row.type.includes('token') || row.type.includes('stream')) {
          const text = String(row.payload?.['text'] ?? row.payload?.['chunk'] ?? '')
          if (text) process.stdout.write(streamTokenLine(row.type, text) + '\n')
        } else {
          process.stdout.write(formatEventRow(row) + '\n')
        }
      }

      await new Promise((r) => setTimeout(r, intervalMs))
    }
  } finally {
    spinner.stop('stream ended')
  }

  if (json) {
    printJson(collected)
  }
}
