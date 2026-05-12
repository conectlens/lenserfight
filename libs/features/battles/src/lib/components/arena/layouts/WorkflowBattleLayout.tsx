import React, { useState } from 'react'
import type { BattleLayoutContext } from '../../../types/battle-layout.types'
import type { Contender, Submission } from '../../../types/battle.types'
import type { PublicExecutionJobRecord } from '../../../hooks/query/useExecutionJobs'
import { BattleResultsPanel } from '../../results/BattleResultsPanel'
import { ExecutionStatusBadge } from '../ExecutionStatusBadge'

interface WorkflowStep {
  tool?: string
  action?: string
  result?: string
  latency_ms?: number
  error?: string
}

function parseWorkflowSteps(submission: Submission | undefined): WorkflowStep[] {
  if (!submission?.content_text) return []
  try {
    const parsed = JSON.parse(submission.content_text)
    if (Array.isArray(parsed)) return parsed as WorkflowStep[]
    if (parsed.steps && Array.isArray(parsed.steps)) return parsed.steps as WorkflowStep[]
  } catch {
    // Not JSON — treat as plain execution output (no steps to parse)
  }
  return []
}

function WorkflowTrace({
  steps,
  finalOutput,
}: {
  steps: WorkflowStep[]
  finalOutput?: string | null
}) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  if (steps.length === 0 && !finalOutput) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-surface-text-muted">
        <span className="text-2xl">🤖</span>
        <p className="text-sm font-semibold">No workflow trace available</p>
      </div>
    )
  }

  const totalLatency = steps.reduce((sum, s) => sum + (s.latency_ms ?? 0), 0)

  return (
    <div className="p-4 space-y-3">
      {steps.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled">
              Execution trace ({steps.length} step{steps.length !== 1 ? 's' : ''})
            </p>
            {totalLatency > 0 && (
              <span className="text-[10px] font-semibold text-surface-text-muted">
                {(totalLatency / 1000).toFixed(2)}s total
              </span>
            )}
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-surface-border-subtle" />

            <div className="space-y-2 relative">
              {steps.map((step, i) => {
                const hasError = !!step.error
                const isOpen = expandedStep === i
                return (
                  <div key={i} className="flex gap-3">
                    {/* Step dot */}
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-black z-10 ${
                      hasError
                        ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                        : 'border-primary-yellow-500 bg-primary-yellow-100 text-primary-yellow-900 dark:bg-primary-yellow-900/20 dark:text-primary-yellow-300'
                    }`}>
                      {i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => setExpandedStep(isOpen ? null : i)}
                        className="w-full text-left rounded-lg border border-surface-border-subtle bg-surface-raised hover:bg-surface-interactive transition-colors px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-surface-text truncate flex-1">
                            {step.tool ?? step.action ?? `Step ${i + 1}`}
                          </span>
                          {step.latency_ms && (
                            <span className="text-[10px] text-surface-text-muted tabular-nums flex-shrink-0">
                              {step.latency_ms}ms
                            </span>
                          )}
                          {hasError && (
                            <span className="text-[10px] font-bold text-red-500 flex-shrink-0">Error</span>
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="mt-1 rounded-lg border border-surface-border-subtle bg-surface-base px-3 py-2.5 space-y-1.5">
                          {step.result && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-surface-text-disabled mb-1">Output</p>
                              <p className="text-xs text-surface-text leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">{step.result}</p>
                            </div>
                          )}
                          {step.error && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">Error</p>
                              <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{step.error}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Final output */}
      {finalOutput && (
        <div className="mt-4 rounded-xl border border-surface-border bg-surface-raised p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled mb-2">Final output</p>
          <p className="text-sm text-surface-text leading-relaxed whitespace-pre-wrap">{finalOutput}</p>
        </div>
      )}
    </div>
  )
}

function ContenderWorkflowPanel({
  contender,
  submission,
  executionJob,
}: {
  contender: Contender
  submission?: Submission
  executionJob?: PublicExecutionJobRecord | null
}) {
  const steps = parseWorkflowSteps(submission)
  const finalOutput = steps.length > 0 ? undefined : submission?.content_text

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-border bg-surface-base sticky top-0 z-10">
        <div className="h-7 w-7 rounded-lg bg-primary-yellow-500 flex items-center justify-center text-xs font-black text-dark-900">
          {contender.slot}
        </div>
        <span className="text-sm font-bold text-surface-text truncate flex-1">{contender.display_name}</span>
        {executionJob && (
          <ExecutionStatusBadge status={executionJob.status} retryCount={executionJob.retry_count} />
        )}
      </div>

      {/* Workflow trace */}
      <div className="flex-1 overflow-y-auto bg-surface-base">
        <WorkflowTrace steps={steps} finalOutput={finalOutput} />
      </div>
    </div>
  )
}

/**
 * GRASP: Polymorphism — specialized layout for workflow/agent battles.
 * Visualizes execution flow, tools used, steps, latency, and agent reasoning.
 * Each contender gets a full trace panel rather than raw text output.
 */
export function WorkflowBattleLayout(ctx: BattleLayoutContext) {
  const {
    battle,
    currentPhase,
    isResult,
    contenders,
    submissions,
    aggregates,
    totalVotes,
    executionJobs,
    scorecardData,
    currentUserId,
    myVote,
    onVote,
  } = ctx

  return (
    <div className="flex flex-col">
      {/* Prompt */}
      {battle.task_prompt && (
        <div className="border-b border-surface-border-subtle bg-surface-sunken px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-yellow-500" />
            Task
          </p>
          <p className="text-sm text-surface-text leading-relaxed max-w-4xl">{battle.task_prompt}</p>
        </div>
      )}

      {/* Workflow type indicator */}
      <div className="px-6 py-2.5 border-b border-surface-border-subtle bg-surface-base flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-surface-text-muted">
          🤖 Agentic Workflow Battle
        </span>
        <span className="text-surface-text-disabled text-[10px]">— execution traces shown per contender</span>
      </div>

      {/* Contender workflow panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-surface-border min-h-[400px] md:min-h-[480px]">
        {contenders.map((contender, idx) => {
          const submission = submissions.find((s) => s.contender_id === contender.id)
          const executionJob = executionJobs.find((j) => j.contender_id === contender.id)
          const aggregate = aggregates.find((a) => a.contender_id === contender.id)
          const voteCount = aggregate?.raw_vote_count ?? 0
          const votePercent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

          return (
            <div
              key={contender.id}
              className={`flex flex-col ${idx === 0 ? 'border-b md:border-b-0 md:border-r' : ''} border-surface-border-subtle`}
            >
              <ContenderWorkflowPanel
                contender={contender}
                submission={submission}
                executionJob={executionJob}
              />
              {/* Vote bar */}
              <div className="border-t border-surface-border bg-surface-raised px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-surface-interactive overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-yellow-500 transition-all duration-700"
                    style={{ width: `${votePercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-surface-text-muted tabular-nums w-9 text-right">{voteCount}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* First-class results */}
      <BattleResultsPanel
        battle={battle}
        currentPhase={currentPhase}
        isResult={isResult}
        contenders={contenders}
        aggregates={aggregates}
        totalVotes={totalVotes}
        executionJobs={executionJobs}
        scorecardData={scorecardData}
        currentUserId={currentUserId}
        myVote={myVote}
        onVote={onVote}
      />
    </div>
  )
}
