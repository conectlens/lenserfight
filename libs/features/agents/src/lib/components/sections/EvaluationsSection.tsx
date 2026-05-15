import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Crosshair, ListChecks, Play, Plus, Sparkles, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EvaluationCasesDrawer } from '../drawers/EvaluationCasesDrawer'
import { EvaluationDrawer } from '../drawers/EvaluationDrawer'
import { FailedCaseDrawer } from '../drawers/FailedCaseDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { formatDateTime } from './_shared'
import { SectionPage } from './SectionPage'

import type {
  EvaluationBaselineRecord,
  EvaluationCaseResultRow,
  EvaluationRecord,
  EvaluationRubricCriterion,
  EvaluationRubricRecord,
  EvaluationRunRecord,
} from '@lenserfight/types'

// ─── RubricBuilder ────────────────────────────────────────────────────────────

const OPERATORS = ['>=', '<=', '=='] as const

const emptyRow = (): EvaluationRubricCriterion => ({
  name: '',
  weight: 1,
  threshold: 0.5,
  operator: '>=',
})

const RubricBuilder: React.FC<{
  evaluationId: string
  isOwner: boolean
}> = ({ evaluationId, isOwner }) => {
  const queryClient = useQueryClient()

  const rubrics = useQuery<EvaluationRubricRecord[]>({
    queryKey: ['rubrics', evaluationId],
    queryFn: () => agentWorkspaceService.listEvaluationRubrics(evaluationId),
    staleTime: 60_000,
  })

  const current = rubrics.data?.[0] ?? null
  const [rows, setRows] = useState<EvaluationRubricCriterion[]>([])

  useEffect(() => {
    setRows(current?.criteria?.length ? current.criteria : [emptyRow()])
  }, [current?.id])

  const save = useMutation({
    mutationFn: () => agentWorkspaceService.createEvaluationRubric(evaluationId, rows),
    onSuccess: () => {
      toast.success('Rubric saved as new version')
      queryClient.invalidateQueries({ queryKey: ['rubrics', evaluationId] })
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const updateRow = (i: number, patch: Partial<EvaluationRubricCriterion>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  if (rubrics.isLoading) return null

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
          Rubric
        </p>
        {current && (
          <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
            v{current.version}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Criterion name"
              value={row.name}
              onChange={(e) => updateRow(i, { name: e.target.value })}
              disabled={!isOwner}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <SelectField
              value={row.operator}
              onChange={(value) =>
                updateRow(i, { operator: value as EvaluationRubricCriterion['operator'] })
              }
              disabled={!isOwner}
              options={OPERATORS.map((operator) => ({ value: operator, label: operator }))}
              className="w-24"
            />
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={row.threshold}
              onChange={(e) => updateRow(i, { threshold: parseFloat(e.target.value) || 0 })}
              disabled={!isOwner}
              className="w-16 rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">w</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={row.weight}
              onChange={(e) => updateRow(i, { weight: parseFloat(e.target.value) || 1 })}
              disabled={!isOwner}
              className="w-14 rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            {isOwner && rows.length > 1 && (
              <Button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                className="rounded-full p-1 text-gray-400 hover:text-red-500"
              >
                <X size={12} />
              </Button>
            )}
          </div>
        ))}
      </div>

      {isOwner && (
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
          >
            + Add criterion
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            isLoading={save.isPending}
            className="ml-auto"
          >
            {save.isPending ? 'Saving…' : 'Save as new version'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Eval run history sub-component ──────────────────────────────────────────

const EvalRunHistory: React.FC<{
  evaluation: EvaluationRecord
  onSelectRun: (run: EvaluationRunRecord) => void
  selectedRunId: string | null
  onInspectFailures: (run: EvaluationRunRecord) => void
  isOwner: boolean
}> = ({ evaluation, onSelectRun, selectedRunId, onInspectFailures, isOwner }) => {
  const queryClient = useQueryClient()

  const runs = useQuery<EvaluationRunRecord[]>({
    queryKey: queryKeys.agents.evaluationRuns(evaluation.id),
    queryFn: () => agentWorkspaceService.listEvaluationRuns(evaluation.id),
    staleTime: 30_000,
  })

  const baseline = useQuery<EvaluationBaselineRecord | null>({
    queryKey: ['evalBaseline', evaluation.id],
    queryFn: () => agentWorkspaceService.getEvaluationBaseline(evaluation.id),
    staleTime: 30_000,
  })

  const setBaseline = useMutation({
    mutationFn: (runId: string) => agentWorkspaceService.setEvaluationBaseline(evaluation.id, runId),
    onSuccess: () => {
      toast.success('Baseline set')
      queryClient.invalidateQueries({ queryKey: ['evalBaseline', evaluation.id] })
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const runList = runs.data ?? []
  const baselineScore = baseline.data?.score ?? null
  const baselineRunId = baseline.data?.run_id ?? null

  // Build chart data (oldest → newest)
  const chartData = [...runList]
    .filter((r) => r.score !== null)
    .reverse()
    .map((r) => ({
      date: new Date(r.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: r.score as number,
    }))

  if (runs.isLoading) {
    return <p className="py-2 text-xs text-gray-400">Loading run history…</p>
  }
  if (runList.length === 0) {
    return <p className="py-2 text-xs text-gray-400">No runs yet.</p>
  }

  return (
    <div className="space-y-3">
      {/* Regression chart */}
      {chartData.length >= 2 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-700">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            Score history
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 12 }}
                formatter={(v) => [typeof v === 'number' ? v.toFixed(3) : v, 'score']}
              />
              {baselineScore !== null && (
                <ReferenceLine
                  y={baselineScore}
                  stroke="#f59e0b"
                  strokeDasharray="4 2"
                  label={{ value: 'baseline', position: 'right', fontSize: 10, fill: '#f59e0b' }}
                />
              )}
              <Line
                type="monotone"
                dataKey="score"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, fill: '#6366f1' }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Run rows */}
      <div className="space-y-1.5">
        {runList.map((run) => {
          const isBaseline = run.id === baselineRunId
          const delta =
            !isBaseline && baselineScore !== null && run.score !== null
              ? run.score - baselineScore
              : null

          return (
            <div
              key={run.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs dark:border-gray-800 dark:bg-gray-700"
            >
              <span className="font-mono text-gray-500 dark:text-gray-400">
                {run.id.slice(0, 8)}
              </span>
              <span className="rounded-full border border-gray-200 px-2 py-0.5 font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                {run.status}
              </span>
              {run.score !== null && (
                <span className="rounded-full border border-primary-yellow-200 px-2 py-0.5 font-semibold text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300">
                  {run.score.toFixed(3)}
                </span>
              )}
              {isBaseline && (
                <span className="rounded-full border border-yellow-300 bg-yellow-50 px-2 py-0.5 font-semibold text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
                  Baseline
                </span>
              )}
              {delta !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${delta >= 0
                    ? 'border border-green-200 text-green-700 dark:border-green-500/30 dark:text-green-300'
                    : 'border border-red-200 text-red-600 dark:border-red-500/30 dark:text-red-400'
                    }`}
                >
                  {delta >= 0 ? '+' : ''}{delta.toFixed(3)}
                </span>
              )}
              <span className="text-gray-400 dark:text-gray-500">
                {formatDateTime(run.started_at)}
              </span>

              <div className="ml-auto flex items-center gap-1.5">
                {isOwner && run.status === 'completed' && !isBaseline && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBaseline.mutate(run.id)}
                    disabled={setBaseline.isPending}
                    title="Set as baseline"
                  >
                    <Crosshair size={11} />
                    Baseline
                  </Button>
                )}
                {run.status === 'completed' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onInspectFailures(run)}
                  >
                    Failures
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => onSelectRun(run)}
                  className={`rounded-xl border px-2 py-1 font-semibold transition ${selectedRunId === run.id
                    ? 'border-primary-yellow-300 text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300'
                    : 'border-gray-200 text-gray-600 hover:border-primary-yellow-300 hover:text-primary-yellow-700 dark:border-gray-700 dark:text-gray-400'
                    }`}
                >
                  Results
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export const EvaluationsSection: React.FC = () => {
  const { profile, bootstrap, viewMode } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const isOwner = viewMode === 'agent_owner' || viewMode === 'human_owner'
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRun, setSelectedRun] = useState<EvaluationRunRecord | null>(null)
  const [casesDrawerEval, setCasesDrawerEval] = useState<EvaluationRecord | null>(null)
  const [expandedEvalId, setExpandedEvalId] = useState<string | null>(null)
  const [failedCaseRun, setFailedCaseRun] = useState<EvaluationRunRecord | null>(null)

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
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.evaluations(profile.id) })
      // refresh run history for the expanded eval
      if (expandedEvalId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.agents.evaluationRuns(expandedEvalId),
        })
      }
      // auto-select the new run for results polling
      setSelectedRun({ id: runId } as EvaluationRunRecord)
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const results = useQuery<EvaluationCaseResultRow[]>({
    queryKey: queryKeys.agents.evaluationResults(selectedRun?.id ?? ''),
    queryFn: () => agentWorkspaceService.getEvaluationResults(selectedRun!.id),
    enabled: !!selectedRun,
    refetchInterval: 5_000,
    staleTime: 0,
  })

  return (
    <SectionPage
      eyebrow="Evaluations"
      docsPath="/how-to/agents/workspace/evaluations"
      docsTip="Test-suite-style regression panel. Each evaluation runs cases against the current binding and emits a pass/fail score. Failed cases open a side-by-side diff."
      title="Quality control and scoring"
      description="Test agents, lenses, tools, and workflows before production use. Define cases, run them against a chosen model, and review case-by-case scoring."
      toolbar={
        isOwner ? (
          <Button
            type="button"
            onClick={() => setDrawerOpen(true)}
          >
            <Plus size={16} />
            New evaluation
          </Button>
        ) : undefined
      }
    >
      {isOwner && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">What are evaluations?</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
            An evaluation suite is a named collection of test cases. Each case defines an expected
            input → output pair. Build a rubric with scoring criteria, run the suite against a model,
            and track regressions via the history chart. Set a baseline run to show delta on future runs.
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Start with{' '}
            <strong className="font-semibold text-gray-700 dark:text-gray-200">New evaluation</strong>{' '}
            above, add test cases inside the drawer, build a rubric, then hit{' '}
            <strong className="font-semibold text-gray-700 dark:text-gray-200">Run</strong> to queue
            an execution and review case-by-case scores.
          </p>
        </div>
      )}

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
        >
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              variant="dark"
              onClick={() => setDrawerOpen(true)}
            >
              New evaluation
            </Button>
          </div>
        </EmptyPanel>
      ) : (
        <div className="grid gap-4">
          {(evals.data ?? []).map((e) => (
            <div
              key={e.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{e.name}</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {e.target_type} · {e.target_id.slice(0, 8)} · created{' '}
                    {formatDateTime(e.created_at)}
                  </p>
                  {e.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{e.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCasesDrawerEval(e)}
                  >
                    <ListChecks size={14} />
                    Cases
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedEvalId(expandedEvalId === e.id ? null : e.id)}
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${expandedEvalId === e.id ? 'rotate-0' : '-rotate-90'}`}
                    />
                    History
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => runEval.mutate(e.id)}
                    disabled={runEval.isPending}
                    isLoading={runEval.isPending}
                  >
                    <Play size={14} />
                    {runEval.isPending ? 'Queueing…' : 'Run'}
                  </Button>
                </div>
              </div>

              {expandedEvalId === e.id && (
                <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    Run history
                  </p>
                  <EvalRunHistory
                    evaluation={e}
                    onSelectRun={(run) => setSelectedRun(run)}
                    selectedRunId={selectedRun?.id ?? null}
                    onInspectFailures={(run) => setFailedCaseRun(run)}
                    isOwner={isOwner}
                  />
                  <RubricBuilder evaluationId={e.id} isOwner={isOwner} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedRun && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Run results</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRun(null)}
            >
              Close
            </Button>
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
                  <span className="font-mono text-xs">{row.case_id.slice(0, 8)}</span>
                  <div className="flex items-center gap-2 text-xs">
                    {row.passed === true && (
                      <span className="rounded-full border border-green-200 px-2 py-0.5 font-semibold text-green-700 dark:border-green-500/30 dark:text-green-300">
                        pass
                      </span>
                    )}
                    {row.passed === false && (
                      <span className="rounded-full border border-red-200 px-2 py-0.5 font-semibold text-red-600 dark:border-red-500/30 dark:text-red-400">
                        fail
                      </span>
                    )}
                    <span>
                      score:{' '}
                      <span className="font-semibold">{row.case_score?.toFixed(3) ?? '—'}</span>
                    </span>
                  </div>
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

      <FailedCaseDrawer
        open={!!failedCaseRun}
        onClose={() => setFailedCaseRun(null)}
        run={failedCaseRun}
        aiLenserId={bootstrap?.ai_lenser_id ?? ''}
      />
    </SectionPage>
  )
}
