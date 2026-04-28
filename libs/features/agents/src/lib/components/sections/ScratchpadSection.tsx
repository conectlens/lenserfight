import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileStack, Play, Sparkles } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EmptyPanel } from '../EmptyPanel'

import { ProfileCard, formatDateTime } from './_shared'
import { SectionPage } from './SectionPage'

import type {
  AgentMemoryProfileRecord,
  ScratchpadRunRecord,
} from '@lenserfight/types'

export const ScratchpadSection: React.FC = () => {
  const { profile, bootstrap, viewMode } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const isAgentOwner = viewMode === 'agent_owner'

  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingRunId, setPendingRunId] = useState<string | null>(null)

  const runs = useQuery<ScratchpadRunRecord[]>({
    queryKey: queryKeys.agents.scratchpadRuns(bootstrap?.ai_lenser_id ?? ''),
    queryFn: () =>
      agentWorkspaceService.listScratchpadRuns(bootstrap!.ai_lenser_id),
    enabled: isAgentOwner && !!bootstrap?.ai_lenser_id,
    staleTime: 5_000,
  })

  const memoryProfiles =
    (bootstrap?.profiles.memory as AgentMemoryProfileRecord[] | undefined) ?? []

  const invalidateRuns = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.scratchpadRuns(bootstrap?.ai_lenser_id ?? ''),
    })

  const startRun = useMutation({
    mutationFn: () =>
      agentWorkspaceService.createScratchpadRun({
        ai_lenser_id: bootstrap!.ai_lenser_id,
        prompt: prompt.trim(),
      }),
    onSuccess: (run) => {
      setPendingRunId(run.id)
      setPrompt('')
      invalidateRuns()
    },
    onError: (err) => setError((err as Error).message ?? 'Run failed'),
  })

  const completeRun = useMutation({
    mutationFn: (runId: string) =>
      agentWorkspaceService.completeScratchpadRun({
        run_id: runId,
        output:
          'Scratchpad executor not yet wired in this environment. Mark complete to free the run.',
        status: 'completed',
      }),
    onSuccess: () => {
      setPendingRunId(null)
      invalidateRuns()
    },
  })

  const promote = useMutation({
    mutationFn: ({
      runId,
      memoryProfileId,
    }: {
      runId: string
      memoryProfileId: string
    }) => agentWorkspaceService.promoteScratchpadToMemory(runId, memoryProfileId),
    onSuccess: invalidateRuns,
  })

  if (!isAgentOwner) {
    return (
      <SectionPage
        eyebrow="Scratchpad"
        title="Read-only view"
        description="The scratchpad is owner-only — switch into this AI workspace to run prompts here."
      >
        <EmptyPanel
          icon={<FileStack size={20} />}
          title="Scratchpad is owner-only"
          description="Public viewers cannot trigger scratchpad runs."
        />
      </SectionPage>
    )
  }

  return (
    <SectionPage
      eyebrow="Scratchpad"
      title={`@${profile.handle} interactive workbench`}
      description="Test prompts, draft tool calls, and persist scratchpad runs. Promote good outputs into a memory profile so future runs benefit from them."
    >
      <ProfileCard
        title="Run a prompt"
        subtitle="Each run is persisted with status, started_at, completed_at, and an audit trail."
      >
        <div className="space-y-3">
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the test prompt for this agent..."
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          {error && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => startRun.mutate()}
              disabled={!prompt.trim() || startRun.isPending || !bootstrap}
              className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              <Play size={14} />
              {startRun.isPending ? 'Queueing…' : 'Run'}
            </button>
          </div>
        </div>
      </ProfileCard>

      {pendingRunId && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 px-5 py-4 text-sm dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-center justify-between gap-3">
            <span className="text-amber-800 dark:text-amber-200">
              Run {pendingRunId.slice(0, 8)} is queued. Mark complete to free
              the slot manually.
            </span>
            <button
              type="button"
              onClick={() => completeRun.mutate(pendingRunId)}
              className="rounded-2xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:bg-gray-900 dark:hover:bg-amber-500/20"
            >
              Mark complete
            </button>
          </div>
        </div>
      )}

      <ProfileCard
        title="Recent scratchpad runs"
        subtitle="The newest 50 runs for this workspace."
      >
        {runs.isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (runs.data ?? []).length === 0 ? (
          <EmptyPanel
            icon={<Sparkles size={20} />}
            title="No scratchpad runs yet"
            description="Type a prompt above to seed your first run."
          />
        ) : (
          <div className="space-y-3">
            {(runs.data ?? []).map((run) => (
              <div
                key={run.id}
                className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Run {run.id.slice(0, 8)} · {run.status}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(run.started_at)} →{' '}
                      {formatDateTime(run.completed_at)} · {run.cost_credits}{' '}
                      credits
                    </p>
                    <p className="mt-2 text-xs text-gray-700 dark:text-gray-200">
                      {run.prompt.slice(0, 200)}
                      {run.prompt.length > 200 ? '…' : ''}
                    </p>
                  </div>
                  {run.status === 'completed' && memoryProfiles.length > 0 && (
                    <select
                      onChange={(e) => {
                        const memoryProfileId = e.target.value
                        if (!memoryProfileId) return
                        promote.mutate({ runId: run.id, memoryProfileId })
                        e.currentTarget.value = ''
                      }}
                      defaultValue=""
                      className="rounded-2xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    >
                      <option value="">Promote to memory…</option>
                      {memoryProfiles.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {run.output && (
                  <pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-gray-950 p-4 text-xs leading-6 text-amber-100">
                    {run.output}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </ProfileCard>
    </SectionPage>
  )
}
