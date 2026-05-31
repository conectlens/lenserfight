/**
 * Poll workflow_run_events and render new rows with terminal FX (SSE-style tail).
 */

import { callRpc } from '../utils/api'
import { printJson } from '../utils/output'
import { glitchLine, startSpinner, streamTokenLine } from './terminal-fx'
import { A } from '../utils/ansi'

export interface WorkflowRunEventRow {
  event_id: number
  type: string
  run_id: string
  occurred_at: string
  payload: Record<string, unknown>
}

export async function fetchWorkflowRunEvents(
  runId: string,
  afterEventId: number,
  limit: number,
): Promise<WorkflowRunEventRow[]> {
  const rows = await callRpc<WorkflowRunEventRow[]>(
    'fn_list_workflow_run_events',
    { p_run_id: runId, p_after_event_id: afterEventId, p_limit: limit },
    { requireAuth: true },
  )
  return rows ?? []
}

function formatEventRow(e: WorkflowRunEventRow): string {
  const ts = new Date(e.occurred_at).toLocaleTimeString()
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
