import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import { useQuery } from '@tanstack/react-query'

// V2 — Battle replay events.
//
// Resolves the battle's two contenders, walks each contender's most recent
// `submission.execution_run_id`, then loads `lenses.workflow_run_events`
// (via fn_list_workflow_run_events) for both runs. Events are interleaved
// chronologically and tagged with the contender slot label so the UI can
// render a side-by-side timeline.
//
// Implementation notes:
//   * We stay on the existing `fn_list_workflow_run_events` RPC instead of
//     touching the migration set — Phase V is additive and shouldn't push
//     new schema for a read-only view.
//   * If a contender has no submission or no execution_run_id, that side is
//     simply absent from the timeline. Empty-state is the caller's concern.
export type BattleReplayEventKind = string

export interface BattleReplayEvent {
  id: string // synthetic, stable: `${runId}:${event_id}`
  contender_label: 'A' | 'B'
  occurred_at: string
  kind: BattleReplayEventKind
  payload: Record<string, unknown>
}

interface ContenderRunRow {
  id: string
  slot: 'A' | 'B'
  execution_run_id: string | null
}

async function loadContenderRuns(battleId: string): Promise<ContenderRunRow[]> {
  // Pull the pair of (contender, latest submission). We accept the most recent
  // submission per contender to support hybrid/manual battles where the run
  // id sits on the submission, not the contender.
  const { data: contenders, error: contendersError } = await supabase
    .schema('battles')
    .from('contenders')
    .select('id, slot')
    .eq('battle_id', battleId)

  if (contendersError) throw new Error(contendersError.message)
  if (!contenders || contenders.length === 0) return []

  const { data: submissions, error: submissionsError } = await supabase
    .schema('battles')
    .from('submissions')
    .select('contender_id, execution_run_id, content_text, submitted_at')
    .eq('battle_id', battleId)

  if (submissionsError) throw new Error(submissionsError.message)

  const submissionByContender = new Map<string, { execution_run_id: string | null; content_text: string | null; submitted_at: string | null }>()
  for (const s of submissions ?? []) {
    const existing = submissionByContender.get(s.contender_id as string)
    const incomingSubmittedAt = (s.submitted_at as string | null) ?? null
    // Keep the most recently submitted row per contender. When both rows
    // are missing `submitted_at`, the first one wins (insertion order).
    if (
      !existing ||
      (incomingSubmittedAt &&
        (!existing.submitted_at || incomingSubmittedAt > existing.submitted_at))
    ) {
      submissionByContender.set(s.contender_id as string, {
        execution_run_id: (s.execution_run_id as string | null) ?? null,
        content_text: (s.content_text as string | null) ?? null,
        submitted_at: incomingSubmittedAt,
      })
    }
  }

  return (contenders as Array<{ id: string; slot: 'A' | 'B' }>)
    .map((c) => {
      const sub = submissionByContender.get(c.id)
      let runId: string | null = sub?.execution_run_id ?? null
      // Fallback: legacy submissions encode the run id in `content_text` as
      // `workflow_run:<runId>`. Match the parser used by WorkflowSubmissionViewer.
      if (!runId && sub?.content_text?.startsWith('workflow_run:')) {
        runId = sub.content_text.slice('workflow_run:'.length) || null
      }
      return { id: c.id, slot: c.slot, execution_run_id: runId }
    })
    .filter((row): row is ContenderRunRow => !!row)
}

async function loadEventsForRun(
  runId: string,
  label: 'A' | 'B',
): Promise<BattleReplayEvent[]> {
  // The RPC is cursor-based; for a read-only replay view we paginate through
  // until the page comes back smaller than the requested size.
  const PAGE = 500
  let after = 0
  const events: BattleReplayEvent[] = []
  // Hard cap of 5 pages (2,500 events) per side — replay UIs degrade past
  // that and a longer history should be paginated lazily, not here.
  for (let i = 0; i < 5; i++) {
    const rows = await workflowsService.listRunEvents(runId, after, PAGE)
    if (rows.length === 0) break
    for (const row of rows) {
      events.push({
        id: `${runId}:${row.event_id}`,
        contender_label: label,
        occurred_at: row.timestamp,
        kind: row.type,
        payload: row.payload,
      })
    }
    after = rows[rows.length - 1].event_id
    if (rows.length < PAGE) break
  }
  return events
}

export interface UseBattleReplayEventsResult {
  events: BattleReplayEvent[]
  loading: boolean
  error: Error | null
}

export const useBattleReplayEvents = (
  battleId: string | undefined,
): UseBattleReplayEventsResult => {
  const query = useQuery<BattleReplayEvent[], Error>({
    queryKey: [...queryKeys.battles.all, 'replay-events', battleId ?? ''],
    enabled: !!battleId,
    staleTime: 1000 * 30,
    queryFn: async () => {
      if (!battleId) return []
      const runs = await loadContenderRuns(battleId)
      const eligible = runs.filter((r) => !!r.execution_run_id)
      if (eligible.length === 0) return []
      const groups = await Promise.all(
        eligible.map((r) => loadEventsForRun(r.execution_run_id as string, r.slot)),
      )
      const flat = groups.flat()
      flat.sort((a, b) => {
        const ta = Date.parse(a.occurred_at) || 0
        const tb = Date.parse(b.occurred_at) || 0
        return ta - tb
      })
      return flat
    },
  })

  return {
    events: query.data ?? [],
    loading: query.isLoading,
    error: query.error ?? null,
  }
}
