import { lensesService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useAIModels } from '@lenserfight/features/generations'
import { useCreateLens, CreateLensModal, useFundingSource, FundingSourceToggle } from '@lenserfight/features/lenses'
import { Avatar, Badge, Button } from '@lenserfight/ui/components'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Bookmark, ChevronDown, GitBranch, GitFork, Lock, Pencil, Play, Square, Swords, ThumbsUp, X } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { CreateWorkflowWizard } from '../components/CreateWorkflowWizard'
import { WorkflowBuilderCanvas } from '../components/WorkflowBuilderCanvas'
import { WorkflowLensPalette } from '../components/WorkflowLensPalette'
import { WorkflowNodeConfigPanel } from '../components/WorkflowNodeConfigPanel'
import { WorkflowProgressView } from '../components/WorkflowProgressView'
import { WorkflowRootInputsPanel } from '../components/WorkflowRootInputsPanel'
import { useForkWorkflow } from '../hooks/useForkWorkflow'
import { useWorkflow } from '../hooks/useWorkflow'
import { useWorkflowExecution } from '../hooks/useWorkflowExecution'
import { useWorkflowReaction } from '../hooks/useWorkflowReaction'
import { useWorkflowRun } from '../hooks/useWorkflowRun'

import type { WorkflowNodeConfig } from '../components/WorkflowCanvasNode'
import type { AIProvider, AIProviderModel } from '@lenserfight/types'

interface WorkflowBuilderPageProps {
  workflowId: string
  runId?: string
  onBattleClick?: (workflowId: string) => void
}

export function WorkflowBuilderPage({ workflowId, onBattleClick }: WorkflowBuilderPageProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { workflow, nodes, edges, isLoading } = useWorkflow(workflowId)
  const { startRun, stopRun, isPending: starting, runId, nodeResults, isRunning } = useWorkflowRun(workflowId)
  const { models, isLoading: modelsLoading } = useAIModels()
  const [showRunPanel, setShowRunPanel] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

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

  const isOwner = !!user && user.id === workflow?.lenser_id
  const { mutate: forkWorkflow, isPending: isForking } = useForkWorkflow()
  const { liked, saved, likeCount, savedCount, toggleLike, toggleSave, isPending: reactionPending } =
    useWorkflowReaction(workflowId, workflow?.reaction_totals as Record<string, number> | null | undefined)

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

  const providerModels: AIProviderModel[] = useMemo(() => {
    if (!selectedProviderKey) return []
    return models
      .filter((m) => m.is_active && !!m.key && m.provider === selectedProviderKey)
      .map((m) => ({ key: m.key, name: m.name, inputModalities: m.input_modalities }))
  }, [models, selectedProviderKey])

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

  const handleExecuteClick = async (rootInputs: Record<string, unknown> = {}) => {
    if (!canExecute) return
    const run = await startRun({ inputs: rootInputs, globalModelId: selectedModelKey })
    setSelectedNodeConfig(null)

    // Fire execution orchestrator in background — status updates flow via Realtime
    if (run?.id) {
      executeWorkflow(run.id, selectedModelKey, rootInputs).catch((err) => {
        toast.error(`Workflow execution failed: ${err instanceof Error ? err.message : String(err)}`)
      })
    }
  }

  const handleStopClick = () => {
    stopExecution()
    stopRun()
  }

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

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-base">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-surface-border bg-surface-base px-4 h-[52px]">

        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/workflows')}
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
                  className="flex h-8 w-8 items-center justify-center rounded-xl !p-0"
                  title="Edit workflow"
                >
                  <Pencil size={12} />
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

          {/* Battle */}
          {onBattleClick && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onBattleClick(workflow.id)}
                className="gap-1.5 w-auto"
              >
                <Swords size={12} /> Battle it
              </Button>
            </div>
          )}
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
        {/* Lens palette sidebar */}
        <WorkflowLensPalette
          onDragStart={() => undefined}
          collapsed={paletteCollapsed}
          onToggleCollapse={() => setPaletteCollapsed((v) => !v)}
        />

        {/* Canvas — fills remaining space */}
        <div className="relative flex-1 overflow-hidden">
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

          {/* Battle CTA — shown when workflow has nodes and isn't running */}
          {nodes.length > 0 && !isRunning && !showRunPanel && !selectedNodeConfig && onBattleClick && (
            <div className="pointer-events-auto absolute top-3 right-3 flex items-center gap-2 rounded-2xl border border-primary-yellow-500/30 bg-primary-yellow-500/5 px-3 py-2 shadow-sm">
              <p className="text-xs font-medium text-greyscale-700 dark:text-greyscale-300">
                Workflow ready.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onBattleClick(workflow.id)}
                className="!text-xs !font-semibold !text-primary-yellow-600 hover:!bg-primary-yellow-500/10 w-auto !h-auto !py-1 !px-2"
              >
                Battle it →
              </Button>
            </div>
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
          <aside className="flex flex-col w-80 flex-shrink-0 border-l border-surface-border bg-surface-base overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border">
              <p className="text-xs font-semibold text-greyscale-900 dark:text-greyscale-50">
                {runId ? `Run ${isRunning ? '— in progress' : '— complete'}` : 'Run Workflow'}
              </p>
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
              {/* Funding source + model selection in run panel */}
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
              />
              {runId && (
                <WorkflowProgressView nodes={nodes} edges={edges} nodeResults={nodeResults} />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── Workflow edit modal (wizard in edit mode) ────────────────────────── */}
      {isEditModalOpen && (
        <CreateWorkflowWizard
          editMode
          initialWorkflow={{
            id: workflow.id,
            title: workflow.title,
            description: workflow.description,
            visibility: workflow.visibility ?? 'public',
          }}
          onCreated={() => setIsEditModalOpen(false)}
          onCancel={() => setIsEditModalOpen(false)}
        />
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
