import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ListChecks, Play, Plus, Sparkles } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EvaluationCasesDrawer } from '../drawers/EvaluationCasesDrawer'
import { EvaluationDrawer } from '../drawers/EvaluationDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { formatDateTime } from './_shared'
import { SectionPage } from './SectionPage'

import type { EvaluationCaseResultRow, EvaluationRecord, EvaluationRunRecord } from '@lenserfight/types'

// ─── Eval run history sub-component ──────────────────────────────────────────

const EvalRunHistory: React.FC<{
  evaluationId: string
  onSelectRun: (runId: string) => void
  selectedRunId: string | null
}> = ({ evaluationId, onSelectRun, selectedRunId }) => {
  const runs = useQuery<EvaluationRunRecord[]>({
    queryKey: queryKeys.agents.evaluationRuns(evaluationId),
    queryFn: () => agentWorkspaceService.listEvaluationRuns(evaluationId),
    staleTime: 30_000,
  })

  if (runs.isLoading) {
    return <p className="text-xs text-gray-400 py-2">Loading run history…</p>
  }
  if ((runs.data ?? []).length === 0) {
    return <p className="text-xs text-gray-400 py-2">No runs yet.</p>
  }

  return (
    <div className="space-y-1.5">
      {(runs.data ?? []).map((run) => (
        <div
          key={run.id}
          className="flex items-center justify-between rounded-[14px] border border-gray-100 bg-gray-50 px-3 py-2 text-xs dark:border-gray-800 dark:bg-gray-950"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-gray-500 dark:text-gray-400">
              {run.id.slice(0, 8)}
            </span>
            <span className="rounded-full border border-gray-200 px-2 py-0.5 font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
              {run.status}
            </span>
            {run.score !== null && (
              <span className="rounded-full border border-amber-200 px-2 py-0.5 font-semibold text-amber-700 dark:border-amber-500/30 dark:text-amber-300">
                score {run.score}
              </span>
            )}
            <span className="text-gray-400 dark:text-gray-500">
              {formatDateTime(run.started_at)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectRun(run.id)}
            className={`rounded-xl border px-2 py-1 font-semibold transition ${
              selectedRunId === run.id
                ? 'border-amber-300 text-amber-700 dark:border-amber-500/30 dark:text-amber-300'
                : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-400'
            }`}
          >
            View results
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export const EvaluationsSection: React.FC = () => {
  const { profile, bootstrap, viewMode } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const isOwner = viewMode === 'agent_owner' || viewMode === 'human_owner'
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [casesDrawerEval, setCasesDrawerEval] = useState<EvaluationRecord | null>(null)
  const [expandedEvalId, setExpandedEvalId] = useState<string | null>(null)

  const evals = useQuery<EvaluationRecord[]>({
    queryKey: queryKeys.agents.evaluations(profile.id),
    queryFn: () => agentWorkspaceService.listEvaluations(profile.id),
    enabled: isOwner,
    staleTime: 30_000,
  })

  const runEval = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.runEvaluation(id, null),
    onSuccess: (runId) => {
      toast.success('Evaluation queued')
      setSelectedRunId(runId)
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.evaluations(profile.id),
      })
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const results = useQuery<EvaluationCaseResultRow[]>({
    queryKey: queryKeys.agents.evaluationResults(selectedRunId ?? ''),
    queryFn: () =>
      agentWorkspaceService.getEvaluationResults(selectedRunId!),
    enabled: !!selectedRunId,
    refetchInterval: 5000,
    staleTime: 0,
  })

  return (
    <SectionPage
      eyebrow="Evaluations"
      title="Quality control and scoring"
      description="Test agents, lenses, tools, and workflows before production use. Define cases, run them against a chosen model, and review case-by-case scoring."
      toolbar={
        isOwner ? (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
          >
            <Plus size={16} />
            New evaluation
          </button>
        ) : undefined
      }
    >
      {!isOwner ? (
        <EmptyPanel
          icon={<Sparkles size={20} />}
          title="Public read-only view"
          description="Evaluation suites are owner-only."
        />
      ) : evals.isLoading ? (
        <p className="py-10 text-center text-sm text-gray-500">Loading…</p>
      ) : (evals.data ?? []).length === 0 ? (
        <EmptyPanel
          icon={<ListChecks size={20} />}
          title="No evaluations yet"
          description="Create an evaluation suite for a lens, workflow, agent, or team. Add cases and run them against a model to score behavior."
        />
      ) : (
        <div className="grid gap-4">
          {(evals.data ?? []).map((e) => (
            <div
              key={e.id}
              className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {e.name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {e.target_type} · {e.target_id.slice(0, 8)} · created{' '}
                    {formatDateTime(e.created_at)}
                  </p>
                  {e.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {e.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCasesDrawerEval(e)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
                  >
                    <ListChecks size={14} />
                    Cases
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedEvalId(expandedEvalId === e.id ? null : e.id)
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${expandedEvalId === e.id ? 'rotate-0' : '-rotate-90'}`}
                    />
                    History
                  </button>
                  <button
                    type="button"
                    onClick={() => runEval.mutate(e.id)}
                    disabled={runEval.isPending}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-amber-300 hover:text-amber-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
                  >
                    <Play size={14} />
                    {runEval.isPending ? 'Queueing…' : 'Run'}
                  </button>
                </div>
              </div>

              {expandedEvalId === e.id && (
                <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    Run history
                  </p>
                  <EvalRunHistory
                    evaluationId={e.id}
                    onSelectRun={setSelectedRunId}
                    selectedRunId={selectedRunId}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedRunId && (
        <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Run results
            </h3>
            <button
              type="button"
              onClick={() => setSelectedRunId(null)}
              className="text-xs text-gray-500 hover:text-amber-600 dark:text-gray-400"
            >
              Close
            </button>
          </div>
          {results.isLoading ? (
            <p className="mt-4 text-sm text-gray-500">Polling…</p>
          ) : (results.data ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              Run is queued. Results will populate once the runner picks it up.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {(results.data ?? []).map((row) => (
                <div
                  key={row.result_id}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
                >
                  <span className="font-mono text-xs">
                    {row.case_id.slice(0, 8)}
                  </span>
                  <span className="text-xs">
                    score:{' '}
                    <span className="font-semibold">
                      {row.case_score ?? '—'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isOwner && (
        <EvaluationDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ownerLenserId={profile.id}
          aiLenserId={bootstrap?.ai_lenser_id ?? null}
          onSaved={() =>
            queryClient.invalidateQueries({
              queryKey: queryKeys.agents.evaluations(profile.id),
            })
          }
        />
      )}

      <EvaluationCasesDrawer
        open={!!casesDrawerEval}
        onClose={() => setCasesDrawerEval(null)}
        evaluation={casesDrawerEval}
        aiLenserId={bootstrap?.ai_lenser_id ?? ''}
      />
    </SectionPage>
  )
}
