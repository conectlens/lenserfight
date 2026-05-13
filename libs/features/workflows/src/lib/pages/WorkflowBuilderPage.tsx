import { lensesService, workflowsService, seoService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useAIModels } from '@lenserfight/features/generations'
import { useCreateLens, CreateLensModal, useFundingSource, FundingSourceToggle } from '@lenserfight/features/lenses'
import { useLenser } from '@lenserfight/features/profile'
import { Avatar, Badge, Button } from '@lenserfight/ui/components'
import { PageMeta } from '@lenserfight/ui/layout'
import { Dialog } from '@lenserfight/ui/overlays'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Bookmark, CalendarClock, ChevronDown, GitBranch, GitFork, History, Layers, Lock, Pencil, Play, Square, Swords, ThumbsUp, X } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { CreateWorkflowWizard } from '../components/CreateWorkflowWizard'
import { WorkflowBuilderCanvas } from '../components/WorkflowBuilderCanvas'
import { WorkflowCronPanel } from '../components/WorkflowCronPanel'
import { WorkflowFinalOutputBanner } from '../components/WorkflowFinalOutputBanner'
import { WorkflowLensPalette } from '../components/WorkflowLensPalette'
import { WorkflowNodeConfigPanel } from '../components/WorkflowNodeConfigPanel'
import { WorkflowPhasesEditor } from '../components/WorkflowPhasesEditor'
import { WorkflowProgressView } from '../components/WorkflowProgressView'
import { WorkflowRootInputsPanel } from '../components/WorkflowRootInputsPanel'
import { WorkflowRunHistoryPanel } from '../components/WorkflowRunHistoryPanel'
import { WorkflowRunRecoveryBanner } from '../components/WorkflowRunRecoveryBanner'
import { useForkWorkflow } from '../hooks/useForkWorkflow'
import { useWorkflow } from '../hooks/useWorkflow'
import { useWorkflowExecution } from '../hooks/useWorkflowExecution'
import { useWorkflowReaction } from '../hooks/useWorkflowReaction'
import { useWorkflowRun } from '../hooks/useWorkflowRun'
import { useWorkflowRunHistory } from '../hooks/useWorkflowRunHistory'
import {
  useWorkflowRunProvenance,
  useWorkflowRunState,
} from '../hooks/useWorkflowRunState'

import type { WorkflowNodeConfig } from '../components/WorkflowCanvasNode'
import type { AIProvider, AIProviderModel } from '@lenserfight/types'

interface WorkflowBuilderPageProps {
  workflowId: string
  runId?: string
  onBattleClick?: (workflowId: string) => void
}

export function WorkflowBuilderPage({ workflowId, onBattleClick }: WorkflowBuilderPageProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { lenser } = useLenser()
  const { workflow, nodes, edges, isLoading } = useWorkflow(workflowId)
  const { models, isLoading: modelsLoading } = useAIModels()
  const [showRunPanel, setShowRunPanel] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [runPanelTab, setRunPanelTab] = useState<'run' | 'history' | 'schedule'>('run')
  const [builderMode, setBuilderMode] = useState<'canvas' | 'phases'>('canvas')
  const [selectedHistoryRunId, setSelectedHistoryRunId] = useState<string | null>(null)
  const returnTo = searchParams.get('returnTo') || '/workflows'

  // Provider/model selection state (replaces globalModelId SelectField)
  const [selectedProviderKey, setSelectedProviderKey] = useState('')
  const [selectedModelKey, setSelectedModelKey] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('lf-workflow-global-model') ?? ''
  })

  const [paletteCollapsed, setPaletteCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  )

  // ── Funding source (BYOK / platform credit) ────────────────────────────────
  const funding = useFundingSource(selectedProviderKey)

  const { startRun, stopRun, retryRun, isPending: starting, isRetrying, runId, nodeResults, isRunning } = useWorkflowRun(workflowId, {
    skipSse: funding.fundingSource === 'user_byok_local',
  })
  const resolveLocalKeyRef = useRef<((id: string) => Promise<string>) | undefined>(undefined)
  resolveLocalKeyRef.current = funding.resolveLocalKey
  const stableResolveLocalKey = useCallback(
    (keyId: string) =>
      resolveLocalKeyRef.current
        ? resolveLocalKeyRef.current(keyId)
        : Promise.reject(new Error('Local key resolver not ready')),
    [],
  )

  const { execute: executeWorkflow, stopExecution } = useWorkflowExecution({
    nodes,
    edges,
    models,
    fundingSource: funding.fundingSource,
    selectedKeyRefId: funding.selectedKeyRefId,
    selectedLocalKeyId: funding.selectedLocalKeyId,
    resolveLocalKey: stableResolveLocalKey,
    localKeys: funding.localKeys,
  })

  // Per-node config overrides — synced to DB via canvas debounced save (workflow_nodes.config)
  const [nodeConfigs, setNodeConfigs] = useState<Record<string, WorkflowNodeConfig>>({})

  // Selected node for the config panel
  const [selectedNodeConfig, setSelectedNodeConfig] = useState<{ nodeId: string; lensId: string; versionId: string | null; nodeLabel: string } | null>(null)

  // ── Run history ─────────────────────────────────────────────────────────────
  // Defer the run-history fetch until the user opens the run panel. This keeps
  // initial page load lean for the common case (just viewing the workflow).
  const { runs: historyRuns } = useWorkflowRunHistory(workflowId, {
    enabled: showRunPanel,
  })

  const { data: historyNodeResults = [] } = useQuery({
    queryKey: ['workflow', workflowId, 'run', selectedHistoryRunId, 'nodeResults'],
    queryFn: () => workflowsService.getNodeResults(selectedHistoryRunId!),
    enabled: !!selectedHistoryRunId,
    staleTime: 1000 * 60,
  })

  // N8N inspector — drive the live run strip from the canonical projection so
  // active node + waiting reasons reflect engine state instead of just SSE
  // frames. The history variant uses the same projection scoped to the
  // selected run so replays show identical lineage badges.
  const { data: liveRunState } = useWorkflowRunState(runId)
  const { data: liveProvenance = [] } = useWorkflowRunProvenance(runId)
  const { data: historyRunState } = useWorkflowRunState(selectedHistoryRunId)
  const { data: historyProvenance = [] } = useWorkflowRunProvenance(selectedHistoryRunId)

  // Terminal node: the node with no outgoing edges
  const terminalNodeId = useMemo(() => {
    const targetSet = new Set(edges.map((e) => e.target_node_id))
    return (
      nodes
        .filter((n) => !targetSet.has(n.id))
        .sort((a, b) => b.ordinal - a.ordinal)[0]?.id ?? null
    )
  }, [nodes, edges])

  const terminalNodeResult = nodeResults.find((r) => r.node_id === terminalNodeId)
  const terminalNodeLabel =
    nodes.find((n) => n.id === terminalNodeId)?.label ??
    `Node ${(nodes.find((n) => n.id === terminalNodeId)?.ordinal ?? 0) + 1}`

  // ── Output callbacks — defined after handleExecuteClick (see below) ──────────
  const handlePostToThread = useCallback(
    (text: string, nodeLabel: string) => {
      const body = encodeURIComponent(`**${nodeLabel}**\n\n${text}`)
      navigate(`/threads/compose?body=${body}`)
    },
    [navigate],
  )

  const handleEditClose = useCallback(() => {
    setIsEditModalOpen(false)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('step')
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])

  const isOwner = !!lenser && lenser.id === workflow?.lenser_id
  const { mutate: forkWorkflow, isPending: isForking } = useForkWorkflow()
  const { liked, saved, likeCount, savedCount, toggleLike, toggleSave, isPending: reactionPending } =
    useWorkflowReaction(
      workflowId,
      workflow?.reaction_totals as Record<string, number> | null | undefined,
      workflow?.viewer_reactions as Record<string, boolean> | null | undefined,
      isLoading,
    )

  // ── Lens edit modal (via useCreateLens in edit mode) ────────────────────────
  const lensModal = useCreateLens()
  const [editingLensId, setEditingLensId] = useState<string | null>(null)

  const handleEditLens = async (lensId: string) => {
    try {
      const lens = await lensesService.getLensDetail(lensId, user?.id)
      if (!lens) return
      let initialVersionParams = lens.params ?? []
      if (lens.latestVersionId) {
        const versionDetail = await lensesService.getVersionById(lens.latestVersionId)
        initialVersionParams = (versionDetail?.parameters ?? []).map((param) => ({
          label: param.label,
          toolId: param.toolId,
        }))
      }
      setEditingLensId(lens.id)
      lensModal.openModal({
        id: lens.id,
        title: lens.title,
        content: lens.content,
        tags: lens.tags ?? [],
        visibility: lens.visibility,
        versionParams: initialVersionParams,
      })
    } catch {
      // silently ignore — can't edit if fetch fails
    }
  }

  useEffect(() => {
    if (!lensModal.isOpen) {
      setEditingLensId(null)
    }
  }, [lensModal.isOpen])

  // ── Node config panel ───────────────────────────────────────────────────────
  const handleConfigNode = (nodeId: string, lensId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    setSelectedNodeConfig({
      nodeId,
      lensId,
      versionId: node?.version_id ?? null,
      nodeLabel: node?.label ?? `Node ${(node?.ordinal ?? 0) + 1}`,
    })
    // Hide run panel when config panel opens
    setShowRunPanel(false)
  }

  const handleSaveNodeConfig = (nodeId: string, config: WorkflowNodeConfig) => {
    setNodeConfigs((prev) => ({ ...prev, [nodeId]: config }))
  }

  // ── Providers/Models derived from flat useAIModels list ─────────────────────
  const providers: AIProvider[] = useMemo(() => {
    const seen = new Set<string>()
    return models
      .filter((m) => m.is_active && !!m.key && !seen.has(m.provider) && (seen.add(m.provider), true))
      .map((m) => ({ key: m.provider, display_name: m.providerDisplayName ?? m.provider, id: m.provider_id ?? '' }))
  }, [models])

  const effectiveProviderKey = useMemo(() => {
    if (funding.fundingSource === 'user_byok_cloud') {
      return funding.availableKeys.find((k) => k.id === funding.selectedKeyRefId)?.providerKey ?? ''
    }
    if (funding.fundingSource === 'user_byok_local') {
      return funding.localKeys.find((k) => k.id === funding.selectedLocalKeyId)?.provider ?? ''
    }
    return selectedProviderKey
  }, [
    funding.fundingSource,
    funding.availableKeys,
    funding.selectedKeyRefId,
    funding.localKeys,
    funding.selectedLocalKeyId,
    selectedProviderKey,
  ])

  const providerModels: AIProviderModel[] = useMemo(() => {
    if (!effectiveProviderKey) return []
    return models
      .filter((m) => m.is_active && !!m.key && m.provider === effectiveProviderKey)
      .map((m) => ({ key: m.key, name: m.name, inputModalities: m.input_modalities }))
  }, [models, effectiveProviderKey])

  // ── Run ─────────────────────────────────────────────────────────────────────
  const handleModelChange = (value: string) => {
    setSelectedModelKey(value)
    if (typeof window !== 'undefined') localStorage.setItem('lf-workflow-global-model', value)
  }

  const handleProviderChange = (key: string) => {
    setSelectedProviderKey(key)
    setSelectedModelKey('')
  }

  const canExecute = !!selectedModelKey && funding.isReady

  useEffect(() => {
    if (funding.fundingSource !== 'user_byok_cloud' || isRunning) return
    const hasCloudAuthFailure = nodeResults.some((r) =>
      /invalid[_\s-]?api[_\s-]?key|api key|unauthorized|auth|permission|forbidden/i.test(
        String(r.error_message ?? '')
      )
    )
    if (!hasCloudAuthFailure) return

    funding.setFundingSource('platform_credit')
    toast.error('Cloud BYOK key failed authentication. Switched funding mode to Cloud credits.')
  }, [funding, isRunning, nodeResults])

  const handleExecuteClick = async (rootInputs: Record<string, unknown> = {}) => {
    if (!canExecute) return
    const run = await startRun({ inputs: rootInputs, globalModelId: selectedModelKey })
    setSelectedNodeConfig(null)
    if (!run?.id) return

    if (funding.fundingSource === 'user_byok_cloud') {
      // Cloud BYOK keys are resolved server-side only. In this mode we enqueue
      // the run and let the platform executor/worker consume it.
      toast.message('Workflow queued on platform executor (Cloud BYOK).')
      return
    }

    // Fire execution orchestrator in background — status updates flow via Realtime
    executeWorkflow(run.id, selectedModelKey, rootInputs).catch((err) => {
      toast.error(`Workflow execution failed: ${err instanceof Error ? err.message : String(err)}`)
    })
  }

  const handleStopClick = () => {
    stopExecution()
    stopRun()
  }

  const handleRerunWithContext = useCallback(
    (data: Record<string, unknown>) => {
      setRunPanelTab('run')
      setSelectedHistoryRunId(null)
      handleExecuteClick(data)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleExecuteClick],
  )

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-greyscale-400">
        Loading workflow…
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-greyscale-400">
        Workflow not found.
      </div>
    )
  }

  const wfMeta = seoService.getWorkflowMeta(workflow)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-base">
      <PageMeta
        title={wfMeta.title}
        description={wfMeta.description}
        robots={wfMeta.index === false ? 'noindex,nofollow' : 'index,follow'}
      />
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-surface-border bg-surface-base px-4 h-[52px]">

        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(returnTo)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl !p-0 text-greyscale-400 hover:text-greyscale-700 hover:bg-surface-raised transition-colors dark:hover:text-greyscale-200"
          title="Back to workflows"
        >
          <ArrowLeft size={16} />
        </Button>

        {/* Workflow identity */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-raised">
            <GitBranch size={14} className="text-greyscale-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-greyscale-900 dark:text-greyscale-50">
              {workflow.title}
            </h1>
            {workflow.description && (
              <p className="truncate text-xs text-greyscale-400 leading-none mt-0.5">
                {workflow.description}
              </p>
            )}

          </div>
          <Badge color="blue" variant="outline" className="flex-shrink-0 text-xs">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Canvas / Phases mode toggle */}
        <div className="flex items-center gap-0.5 rounded-lg border border-surface-border bg-surface-raised p-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setBuilderMode('canvas')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${builderMode === 'canvas'
              ? 'bg-surface-base text-greyscale-900 dark:text-greyscale-50 shadow-sm'
              : 'text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-200'
              }`}
          >
            <GitBranch size={11} /> Canvas
          </button>
          <button
            type="button"
            onClick={() => setBuilderMode('phases')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${builderMode === 'phases'
              ? 'bg-surface-base text-greyscale-900 dark:text-greyscale-50 shadow-sm'
              : 'text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-200'
              }`}
          >
            <Layers size={11} /> Phases
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Social: Like / Save / Fork — shown when authenticated */}
          {user && (
            <>
              <Button
                variant={liked ? 'primary' : 'secondary'}
                size="sm"
                onClick={toggleLike}
                disabled={reactionPending}
                title={liked ? 'Unlike' : 'Like'}
                aria-pressed={liked}
                className={`gap-1.5 w-auto rounded-xl px-2.5 py-1 transition-colors ${liked
                  ? 'border-primary-yellow-500 bg-primary-yellow-500/15 text-primary-yellow-700 shadow-sm ring-1 ring-primary-yellow-500/20'
                  : 'border-surface-border bg-surface-raised text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-100'
                  }`}
              >
                <ThumbsUp size={12} className={liked ? 'fill-current' : ''} />
                {likeCount > 0 && <span>{likeCount}</span>}
              </Button>

              <Button
                variant={saved ? 'primary' : 'secondary'}
                size="sm"
                onClick={toggleSave}
                disabled={reactionPending}
                title={saved ? 'Unsave' : 'Save'}
                aria-pressed={saved}
                className={`gap-1.5 w-auto rounded-xl px-2.5 py-1 transition-colors ${saved
                  ? 'border-primary-yellow-500 bg-primary-yellow-500/15 text-primary-yellow-700 shadow-sm ring-1 ring-primary-yellow-500/20'
                  : 'border-surface-border bg-surface-raised text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-100'
                  }`}
              >
                <Bookmark size={12} className={saved ? 'fill-current' : ''} />
                {savedCount > 0 && <span>{savedCount}</span>}
              </Button>

              {/* Edit button — owner only, left of Fork */}
              {isOwner && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsEditModalOpen(true)}
                  className="gap-1.5 w-auto rounded-xl px-2.5 py-1"
                  title="Edit workflow"
                >
                  <Pencil size={12} /> Edit
                </Button>
              )}

              {workflow.parent_workflow_id && (
                <button
                  type="button"
                  onClick={() => navigate(`/workflows/${workflow.parent_workflow_id}`)}
                  className="mt-1 flex max-w-full items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-2.5 py-1 text-left transition-colors hover:border-primary-yellow-500/40 hover:bg-primary-yellow-500/5"
                  title={workflow.parent_workflow_title ?? 'Parent workflow'}
                >
                  <Avatar
                    src={workflow.parent_workflow_author_profile?.avatar_url ?? null}
                    alt={workflow.parent_workflow_author_profile?.display_name ?? 'Parent workflow author'}
                    size="sm"
                    className="!w-5 !h-5 ring-1 ring-white dark:ring-surface-base"
                  />
                  <span className="truncate text-[11px] font-medium text-greyscale-600 dark:text-greyscale-300">
                    Forked from {workflow.parent_workflow_title ?? 'Parent workflow'}
                  </span>
                  <span className="truncate text-[11px] text-greyscale-400">
                    @{workflow.parent_workflow_author_profile?.handle ?? 'unknown'}
                  </span>
                </button>
              )}

              {!isOwner && workflow.visibility === 'public' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => forkWorkflow(workflowId)}
                  isLoading={isForking}
                  className="gap-1.5 w-auto"
                >
                  <GitFork size={12} /> Fork
                </Button>
              )}

              {workflow.visibility === 'private' && (
                <span
                  title="Private workflow"
                  className="flex items-center text-greyscale-400"
                >
                  <Lock size={14} />
                </span>
              )}
            </>
          )}

          {/* Run — run/stop button (model selector in run drawer) */}
          <div className="flex items-center gap-1.5">
            {isRunning ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleStopClick}
                className="gap-1.5 w-auto border-status-red/30 text-status-red hover:bg-status-red/10"
                title="Stop workflow"
              >
                <Square size={12} /> Stop
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => { setShowRunPanel(true); setSelectedNodeConfig(null) }}
                isLoading={starting}
                disabled={nodes.length === 0}
                className="gap-1.5 w-auto"
              >
                <Play size={12} /> Run
              </Button>
            )}
          </div>

          {/* Run panel toggle */}
          {runId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setShowRunPanel((v) => !v); setSelectedNodeConfig(null) }}
              className="gap-1.5 rounded-xl border border-surface-border bg-surface-raised px-2.5 py-1 text-greyscale-600 hover:text-greyscale-900 transition-colors dark:text-greyscale-300 w-auto"
            >
              {isRunning ? (
                <Badge color="blue" variant="outline" className="text-[10px]">Running</Badge>
              ) : (
                <Badge color="green" variant="outline" className="text-[10px]">Done</Badge>
              )}
              <ChevronDown size={12} className={`transition-transform ${showRunPanel ? 'rotate-180' : ''}`} />
            </Button>
          )}
        </div>
      </header>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Lens palette sidebar — hidden in Phases mode */}
        {builderMode === 'canvas' && (
          <WorkflowLensPalette
            onDragStart={() => undefined}
            collapsed={paletteCollapsed}
            onToggleCollapse={() => setPaletteCollapsed((v) => !v)}
          />
        )}

        {/* Canvas or Phases editor — fills remaining space */}
        <div className="relative flex-1 overflow-hidden">
          {builderMode === 'phases' ? (
            <div className="h-full overflow-y-auto bg-surface-base">
              <WorkflowPhasesEditor workflowId={workflow.id} isOwner={isOwner} />
            </div>
          ) : (
            <>
              <WorkflowBuilderCanvas
                workflowId={workflow.id}
                nodes={nodes}
                edges={edges}
                currentUserId={user?.id}
                nodeConfigOverrides={nodeConfigs}
                onConfigNode={handleConfigNode}
                onEditLens={handleEditLens}
                onEdit={isOwner ? () => setIsEditModalOpen(true) : undefined}
              />

              {/* Empty state overlay */}
              {nodes.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-2 opacity-40">
                    <GitBranch size={40} className="mx-auto text-greyscale-300" />
                    <p className="text-sm font-medium text-greyscale-400">
                      Drag a lens from the left panel to start building
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Node config panel — slides in from right */}
        {selectedNodeConfig && (
          <WorkflowNodeConfigPanel
            nodeId={selectedNodeConfig.nodeId}
            lensId={selectedNodeConfig.lensId}
            versionId={selectedNodeConfig.versionId}
            nodeLabel={selectedNodeConfig.nodeLabel}
            currentUserId={user?.id}
            currentConfig={nodeConfigs[selectedNodeConfig.nodeId] ?? {}}
            nodes={nodes}
            edges={edges}
            onSave={handleSaveNodeConfig}
            onClose={() => setSelectedNodeConfig(null)}
            onEditLens={handleEditLens}
          />
        )}

        {/* Run results panel — slides in from the right */}
        {showRunPanel && !selectedNodeConfig && (
          <aside className="flex flex-col w-100 flex-shrink-0 border-l border-surface-border bg-surface-base overflow-hidden">
            {/* Panel header with tabs */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRunPanelTab('run')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${runPanelTab === 'run'
                    ? 'bg-surface-raised text-greyscale-900 dark:text-greyscale-50'
                    : 'text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-200'
                    }`}
                >
                  Current Run
                </button>
                <button
                  type="button"
                  onClick={() => setRunPanelTab('history')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${runPanelTab === 'history'
                    ? 'bg-surface-raised text-greyscale-900 dark:text-greyscale-50'
                    : 'text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-200'
                    }`}
                >
                  <History size={11} />
                  History
                  {historyRuns.length > 0 && (
                    <span className="text-[9px] bg-surface-raised rounded-full px-1.5 py-0.5 text-greyscale-500">
                      {historyRuns.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setRunPanelTab('schedule')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${runPanelTab === 'schedule'
                    ? 'bg-surface-raised text-greyscale-900 dark:text-greyscale-50'
                    : 'text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-200'
                    }`}
                >
                  <CalendarClock size={11} />
                  Schedule
                </button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRunPanel(false)}
                className="!p-1 !h-6 !w-6 text-greyscale-400 hover:text-greyscale-700 transition-colors"
              >
                <X size={14} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {runPanelTab === 'run' ? (
                <>
                  {/* Funding source + model selection */}
                  <div className="px-4 py-3 border-b border-surface-border">
                    <FundingSourceToggle
                      fundingSource={funding.fundingSource}
                      onFundingSourceChange={funding.setFundingSource}
                      selectedKeyRefId={funding.selectedKeyRefId}
                      onKeyRefIdChange={funding.setSelectedKeyRefId}
                      availableKeys={funding.availableKeys}
                      selectedLocalKeyId={funding.selectedLocalKeyId}
                      onLocalKeyIdChange={funding.setSelectedLocalKeyId}
                      availableLocalKeys={funding.localKeys}
                      onAddLocalKey={funding.addLocalKey}
                      onUpdateLocalKey={funding.updateLocalKey}
                      walletBalance={funding.walletBalance}
                      canUseBYOK={funding.canUseBYOK}
                      providers={providers}
                      isLoadingProviders={modelsLoading}
                      providerModels={providerModels}
                      isLoadingModels={modelsLoading}
                      selectedProviderKey={selectedProviderKey}
                      onProviderChange={handleProviderChange}
                      selectedModelKey={selectedModelKey}
                      onModelChange={handleModelChange}
                    />
                  </div>
                  <WorkflowRootInputsPanel
                    nodes={nodes}
                    edges={edges}
                    onSubmit={(rootInputs) => handleExecuteClick(rootInputs)}
                    isRunning={starting || isRunning}
                    canExecute={canExecute}
                    nodeConfigOverrides={nodeConfigs}
                  />
                  {/* Recovery banner — shown when the run terminated with failure */}
                  {runId && !isRunning &&
                    (liveRunState?.status === 'failed' || liveRunState?.status === 'timed_out') && (
                      <WorkflowRunRecoveryBanner
                        runStatus={liveRunState!.status}
                        failedNodeLabel={
                          liveRunState?.node_results?.find(
                            (r) => r.status === 'failed' || r.status === 'timed_out'
                          )?.node_label ?? null
                        }
                        errorMessage={
                          liveRunState?.node_results?.find(
                            (r) => r.status === 'failed' || r.status === 'timed_out'
                          )?.error_message ?? null
                        }
                        isRetrying={isRetrying}
                        onRetry={() => {
                          retryRun(runId).catch(() => { })
                          setRunPanelTab('run')
                          setShowRunPanel(true)
                        }}
                      />
                    )}
                  {/* Final output banner — shown above progress when run is complete */}
                  {runId && terminalNodeId && !isRunning && (
                    <WorkflowFinalOutputBanner
                      terminalNodeResult={terminalNodeResult}
                      nodeLabel={terminalNodeLabel}
                      onPostToThread={(text) => handlePostToThread(text, terminalNodeLabel)}
                      onRerunWithContext={handleRerunWithContext}
                    />
                  )}
                  {runId && (
                    <WorkflowProgressView
                      nodes={nodes}
                      edges={edges}
                      nodeResults={nodeResults}
                      terminalNodeId={terminalNodeId}
                      onPostToThread={handlePostToThread}
                      onRerunWithContext={handleRerunWithContext}
                      provenance={liveProvenance}
                      activeNodeId={liveRunState?.active_node_id ?? null}
                      runStartedAt={liveRunState?.started_at ?? null}
                      runCompletedAt={liveRunState?.completed_at ?? null}
                      runStatus={liveRunState?.status ?? null}
                    />
                  )}
                </>
              ) : runPanelTab === 'schedule' ? (
                <WorkflowCronPanel workflowId={workflowId} isOwner={isOwner} />
              ) : (
                <>
                  <WorkflowRunHistoryPanel
                    workflowId={workflowId}
                    activeRunId={selectedHistoryRunId}
                    onSelectRun={(id) => setSelectedHistoryRunId(id)}
                  />
                  {selectedHistoryRunId && historyNodeResults.length > 0 && (
                    <WorkflowProgressView
                      nodes={nodes}
                      edges={edges}
                      nodeResults={historyNodeResults}
                      terminalNodeId={terminalNodeId}
                      provenance={historyProvenance}
                      activeNodeId={historyRunState?.active_node_id ?? null}
                      runStartedAt={historyRunState?.started_at ?? null}
                      runCompletedAt={historyRunState?.completed_at ?? null}
                      runStatus={historyRunState?.status ?? null}
                    />
                  )}
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── Workflow edit modal (wizard in edit mode) ────────────────────────── */}
      {isEditModalOpen && (
        <Dialog
          open={isEditModalOpen}
          onClose={handleEditClose}
          maxWidth="max-w-2xl"
        >
          <CreateWorkflowWizard
            editMode
            initialWorkflow={{
              id: workflow.id,
              title: workflow.title,
              description: workflow.description,
              visibility: workflow.visibility ?? 'public',
            }}
            onCreated={handleEditClose}
            onCancel={handleEditClose}
          />
        </Dialog>
      )}

      {/* ── Lens edit modal ─────────────────────────────────────────────────── */}
      <CreateLensModal
        isOpen={lensModal.isOpen}
        onClose={() => {
          lensModal.closeModal()
          setEditingLensId(null)
        }}
        onSubmit={() => lensModal.submit()}
        form={lensModal.form}
        isSubmitting={lensModal.isSubmitting}
        error={lensModal.error}
        isEditMode={lensModal.isEditMode}
        lensId={editingLensId ?? undefined}
      />
    </div>
  )
}
