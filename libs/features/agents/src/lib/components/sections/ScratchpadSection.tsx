import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type {
  AgentMemoryProfileRecord,
  AgentModelProfileRecord,
  ScratchpadRunMetadata,
  ScratchpadRunRecord,
} from '@lenserfight/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Edge, Node } from '@xyflow/react'
import { Bot, Brain, Cpu, Play, Sparkles } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { AgentGraphShell } from '../AgentGraphShell'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'
import { EmptyPanel } from '../EmptyPanel'

import { ProfileCard, formatDateTime } from './_shared'
import { SectionPage } from './SectionPage'

export const ScratchpadSection: React.FC = () => {
  const {
    profile,
    bootstrap,
    bootstrapState,
    isOwner,
    defaultInstructionBinding,
    modelBindings,
  } = useAgentWorkspace()
  const queryClient = useQueryClient()

  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingRunId, setPendingRunId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState('')

  const runs = useQuery<ScratchpadRunRecord[]>({
    queryKey: queryKeys.agents.scratchpadRuns(bootstrap?.ai_lenser_id ?? ''),
    queryFn: () => agentWorkspaceService.listScratchpadRuns(bootstrap!.ai_lenser_id),
    enabled: isOwner && !!bootstrap?.ai_lenser_id,
    staleTime: 5_000,
  })

  const memoryProfiles =
    (bootstrap?.profiles.memory as AgentMemoryProfileRecord[] | undefined) ?? []
  const modelProfiles =
    (bootstrap?.profiles.models as AgentModelProfileRecord[] | undefined) ?? []

  useEffect(() => {
    if (selectedModelId) return
    const defaultModelId =
      modelBindings.find((binding) => binding.is_default)?.model_id ??
      modelProfiles.find((model) => model.is_default)?.model_id ??
      modelProfiles[0]?.model_id ??
      ''
    setSelectedModelId(defaultModelId ?? '')
  }, [modelBindings, modelProfiles, selectedModelId])

  const selectedModelProfile =
    modelProfiles.find((model) => model.model_id === selectedModelId) ?? null

  const nodes = useMemo<Node[]>(
    () =>
      [
        {
          id: 'agent',
          position: { x: 0, y: 160 },
          data: { label: profile.display_name || `@${profile.handle}` },
        },
        defaultInstructionBinding
          ? {
              id: 'instruction',
              position: { x: -260, y: 20 },
              data: {
                label: `Instruction lens ${defaultInstructionBinding.lens_id.slice(0, 8)}`,
              },
            }
          : null,
        selectedModelProfile
          ? {
              id: 'model',
              position: { x: 260, y: 20 },
              data: {
                label: selectedModelProfile.name,
              },
            }
          : null,
      ].filter(Boolean) as Node[],
    [defaultInstructionBinding, profile.display_name, profile.handle, selectedModelProfile]
  )

  const edges = useMemo<Edge[]>(
    () =>
      [
        defaultInstructionBinding
          ? { id: 'instruction-agent', source: 'instruction', target: 'agent', animated: true }
          : null,
        selectedModelProfile
          ? { id: 'model-agent', source: 'model', target: 'agent' }
          : null,
      ].filter(Boolean) as Edge[],
    [defaultInstructionBinding, selectedModelProfile]
  )

  const invalidateRuns = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.scratchpadRuns(bootstrap?.ai_lenser_id ?? ''),
    })

  const startRun = useMutation({
    mutationFn: () => {
      const metadata: ScratchpadRunMetadata = {
        instruction_lens_id: defaultInstructionBinding?.lens_id ?? null,
        instruction_version_id: defaultInstructionBinding?.version_id ?? null,
        canvas_state: {
          nodes: nodes.map((node) => ({
            id: node.id,
            x: node.position.x,
            y: node.position.y,
            label: String((node.data as { label?: string } | undefined)?.label ?? node.id),
          })),
          edges: edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
          })),
        },
      }

      return agentWorkspaceService.createScratchpadRun({
        ai_lenser_id: bootstrap!.ai_lenser_id,
        prompt: prompt.trim(),
        model_id: selectedModelId || null,
        metadata,
      })
    },
    onSuccess: (run) => {
      setPendingRunId(run.id)
      setPrompt('')
      setError(null)
      invalidateRuns()
    },
    onError: (cause) => {
      setError((cause as Error).message ?? 'Run failed')
    },
  })

  const completeRun = useMutation({
    mutationFn: (runId: string) =>
      agentWorkspaceService.completeScratchpadRun({
        run_id: runId,
        output: null,
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

  if (!isOwner) {
    return (
      <SectionPage
        eyebrow="Drafts"
        title="Private workbench"
        description="Drafts are the owner-only solo workbench for testing prompts, tools, instructions, and early automation ideas before they become reusable workflows or shared team assets."
      >
        <EmptyPanel
          icon={<Brain size={20} />}
          title="Drafts are owner-only"
          description="Public viewers can inspect the agent overview, but only the owner can use the private workbench for drafts and experiments."
        />
      </SectionPage>
    )
  }

  return (
    <SectionPage
      eyebrow="Drafts"
      title={`${profile.display_name || `@${profile.handle}`} workbench`}
      description="The drafts workbench is a private solo canvas. Use it to test prompts against the selected AI lenser, keep the default instruction source in view, and preserve each run with the lens-version metadata that shaped it."
    >
      <BootstrapStatusPanel state={bootstrapState} />

      {bootstrapState.kind === 'loading' && (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <div className="h-80 animate-pulse rounded-[24px] border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900" />
            <div className="space-y-4">
              {[120, 96, 80].map((h, idx) => (
                <div
                  key={idx}
                  style={{ height: h }}
                  className="animate-pulse rounded-[24px] border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {bootstrap && (
        <AgentGraphShell
          readOnly
          nodes={nodes}
          edges={edges}
          emptyState={{
            title: 'Scratchpad canvas is ready',
            description:
              'Bind an instruction lens and a model to give this solo workbench a stable execution context before you run prompts.',
          }}
          sidePanel={
            <>
              <ProfileCard
                title="Run draft workbench"
                subtitle="Prompt the selected AI lenser directly from the private automation workbench."
              >
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      Bound model
                    </span>
                    <select
                      value={selectedModelId}
                      onChange={(event) => setSelectedModelId(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Use workspace default</option>
                      {modelProfiles.map((model) => (
                        <option key={model.id} value={model.model_id ?? ''}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <textarea
                    rows={6}
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Describe the prompt, test case, or tool call you want this agent to execute..."
                    className={`${inputClass} resize-none`}
                  />

                  {error && (
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => startRun.mutate()}
                    disabled={!prompt.trim() || startRun.isPending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
                  >
                    <Play size={15} />
                    {startRun.isPending ? 'Queueing run...' : 'Run on scratchpad'}
                  </button>
                </div>
              </ProfileCard>

              <ProfileCard
                title="Workbench context"
                subtitle="This is the canonical context attached to new scratchpad runs."
              >
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <WorkbenchRow
                    icon={<Bot size={14} />}
                    label="Instruction lens"
                    value={
                      defaultInstructionBinding
                        ? defaultInstructionBinding.lens_id.slice(0, 8)
                        : 'Not configured'
                    }
                  />
                  <WorkbenchRow
                    icon={<Sparkles size={14} />}
                    label="Instruction version"
                    value={
                      defaultInstructionBinding?.version_id
                        ? defaultInstructionBinding.version_id.slice(0, 8)
                        : 'Latest published'
                    }
                  />
                  <WorkbenchRow
                    icon={<Cpu size={14} />}
                    label="Model"
                    value={selectedModelProfile?.name ?? 'Workspace default'}
                  />
                </div>
              </ProfileCard>

              {pendingRunId && (
                <ProfileCard
                  title="Queued run"
                  subtitle="The executor is not wired here, so queued runs can be completed manually for now."
                >
                  <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <p>Run {pendingRunId.slice(0, 8)} is waiting.</p>
                    <button
                      type="button"
                      onClick={() => completeRun.mutate(pendingRunId)}
                      disabled={completeRun.isPending}
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
                    >
                      Mark complete
                    </button>
                  </div>
                </ProfileCard>
              )}

              <ProfileCard
                title="Recent runs"
                subtitle="The latest scratchpad history stays in a side rail so the canvas remains clear."
              >
                {runs.isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-950"
                      />
                    ))}
                  </div>
                ) : (runs.data ?? []).length === 0 ? (
                  <EmptyPanel
                    icon={<Sparkles size={20} />}
                    title="No scratchpad runs yet"
                    description="Run the first prompt from this workbench to seed a private execution history."
                  />
                ) : (
                  <div className="space-y-3">
                    {(runs.data ?? []).map((run) => (
                      <div
                        key={run.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              Run {run.id.slice(0, 8)} · {run.status}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTime(run.started_at)} · {run.cost_credits} credits
                            </p>
                            <p className="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-300">
                              {run.prompt.slice(0, 180)}
                              {run.prompt.length > 180 ? '...' : ''}
                            </p>
                          </div>
                        </div>

                        {run.output && (
                          <pre className="mt-3 max-h-40 overflow-auto rounded-2xl bg-gray-950 p-3 text-xs leading-6 text-amber-100">
                            {run.output}
                          </pre>
                        )}

                        {run.status === 'completed' && memoryProfiles.length > 0 && (
                          <select
                            onChange={(event) => {
                              const memoryProfileId = event.target.value
                              if (!memoryProfileId) return
                              promote.mutate({ runId: run.id, memoryProfileId })
                              event.currentTarget.value = ''
                            }}
                            defaultValue=""
                            className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                          >
                            <option value="">Promote to memory profile...</option>
                            {memoryProfiles.map((profileRecord) => (
                              <option key={profileRecord.id} value={profileRecord.id}>
                                {profileRecord.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ProfileCard>
            </>
          }
        />
      )}
    </SectionPage>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const WorkbenchRow: React.FC<{
  icon: React.ReactNode
  label: string
  value: string
}> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="inline-flex items-center gap-2">
      {icon}
      {label}
    </span>
    <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
  </div>
)
