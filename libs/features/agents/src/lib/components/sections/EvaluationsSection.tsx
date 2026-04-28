import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListChecks, Play, Plus, Sparkles } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EvaluationDrawer } from '../drawers/EvaluationDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { formatDateTime } from './_shared'
import { SectionPage } from './SectionPage'

import type { EvaluationRecord } from '@lenserfight/types'

export const EvaluationsSection: React.FC = () => {
  const { profile, bootstrap, viewMode } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const isOwner = viewMode === 'agent_owner' || viewMode === 'human_owner'
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const evals = useQuery<EvaluationRecord[]>({
    queryKey: queryKeys.agents.evaluations(profile.id),
    queryFn: () => agentWorkspaceService.listEvaluations(profile.id),
    enabled: isOwner,
    staleTime: 30_000,
  })

  const runEval = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.runEvaluation(id, null),
    onSuccess: (runId) => {
      setSelectedRunId(runId)
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.evaluations(profile.id),
      })
    },
  })

  const results = useQuery({
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
          ))}
        </div>
      )}

      {selectedRunId && (
        <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Latest run results
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
    </SectionPage>
  )
}
