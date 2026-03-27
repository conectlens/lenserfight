import { lensesService, battlesService } from '@lenserfight/data/repositories'
import type { BattleRecord } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useCreateLens, CreateLensModal } from '@lenserfight/features/lenses'
import { Badge, Button } from '@lenserfight/ui/components'
import { ArrowLeft, Bookmark, ChevronDown, GitBranch, GitFork, Pencil, Play, Settings, Swords, ThumbsUp, X } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { WorkflowBuilderCanvas } from '../components/WorkflowBuilderCanvas'
import { EditWorkflowModal } from '../components/EditWorkflowModal'
import { WorkflowLensPalette } from '../components/WorkflowLensPalette'
import { WorkflowProgressView } from '../components/WorkflowProgressView'
import { useForkWorkflow } from '../hooks/useForkWorkflow'
import { useWorkflow } from '../hooks/useWorkflow'
import { useWorkflowReaction } from '../hooks/useWorkflowReaction'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { useWorkflowRun } from '../hooks/useWorkflowRun'

interface WorkflowBuilderPageProps {
  workflowId: string
  runId?: string
  onBattleClick?: (workflowId: string) => void
}

export function WorkflowBuilderPage({ workflowId, onBattleClick }: WorkflowBuilderPageProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { workflow, nodes, edges, isLoading } = useWorkflow(workflowId)
  const { startRun, isPending: starting, runId, nodeResults, isRunning } = useWorkflowRun(workflowId)
  const [showRunPanel, setShowRunPanel] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [paletteCollapsed, setPaletteCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  )

  const isOwner = !!user && user.id === workflow?.lenser_id
  const { mutate: forkWorkflow, isPending: isForking } = useForkWorkflow()
  const { liked, saved, likeCount, savedCount, toggleLike, toggleSave, isPending: reactionPending } =
    useWorkflowReaction(workflowId, workflow?.reaction_totals as Record<string, number> | null | undefined)

  // ── Existing draft battle for editing ──────────────────────────────────────
  const { data: draftBattle } = useQuery({
    queryKey: ['workflow-draft-battle', workflowId],
    queryFn: () => battlesService.getLatestDraftBattleByWorkflowId(workflowId),
    enabled: !!workflowId && isOwner,
    staleTime: 1000 * 60,
  })

  // ── Lens edit modal (via useCreateLens in edit mode) ────────────────────────
  const lensModal = useCreateLens()

  const handleEditLens = async (lensId: string) => {
    try {
      const lens = await lensesService.getLensDetail(lensId)
      if (!lens) return
      lensModal.openModal({
        id: lensId,
        title: lens.title,
        content: lens.versions?.[0]?.content ?? '',
        tags: lens.tags ?? [],
        visibility: lens.visibility,
        versionParams: lens.versions?.[0]?.params ?? [],
      })
    } catch {
      // silently ignore — can't edit if fetch fails
    }
  }

  const handleRun = async () => {
    await startRun({})
    setShowRunPanel(true)
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
          <div className="min-w-0">
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
                className={`gap-1.5 w-auto rounded-xl px-2.5 py-1 transition-colors ${liked
                  ? 'border-primary-yellow-500 bg-primary-yellow-500/10 text-primary-yellow-600'
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
                className={`gap-1.5 w-auto rounded-xl px-2.5 py-1 transition-colors ${saved
                  ? 'border-primary-yellow-500 bg-primary-yellow-500/10 text-primary-yellow-600'
                  : 'border-surface-border bg-surface-raised text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-100'
                  }`}
              >
                <Bookmark size={12} className={saved ? 'fill-current' : ''} />
                {savedCount > 0 && <span>{savedCount}</span>}
              </Button>

              {isOwner && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsEditModalOpen(true)}
                  className="gap-1.5 w-auto rounded-xl px-2.5 py-1"
                  title="Edit workflow"
                >
                  <Pencil size={12} />
                </Button>
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
            </>
          )}

          {/* Run */}
          <Button
            size="sm"
            onClick={handleRun}
            isLoading={starting}
            disabled={nodes.length === 0}
            className="gap-1.5 w-auto"
          >
            <Play size={12} /> Run
          </Button>

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
              {draftBattle && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/battles/create?workflow_id=${workflowId}&battleId=${draftBattle.slug}`)}
                  className="!p-2 text-greyscale-400 hover:text-primary-yellow-600 hover:bg-primary-yellow-500/10 transition-colors"
                  title="Edit draft battle"
                >
                  <Settings size={14} />
                </Button>
              )}
            </div>
          )}


          {/* Back */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl !p-0 text-greyscale-400 hover:text-greyscale-700 hover:bg-surface-raised transition-colors dark:hover:text-greyscale-200"
            title="Edit this workflow"
          >
            <Pencil size={16} />
          </Button>

          {/* Run panel toggle */}
          {runId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowRunPanel((v) => !v)}
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
          {nodes.length > 0 && !isRunning && !showRunPanel && onBattleClick && (
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

        {/* Run results panel — slides in from the right */}
        {showRunPanel && runId && (
          <aside className="flex flex-col w-80 flex-shrink-0 border-l border-surface-border bg-surface-base overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border">
              <p className="text-xs font-semibold text-greyscale-900 dark:text-greyscale-50">
                Run {isRunning ? '— in progress' : '— complete'}
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
              <WorkflowProgressView nodes={nodes} edges={edges} nodeResults={nodeResults} />
            </div>
          </aside>
        )}
      </div>

      {/* ── Workflow edit modal ──────────────────────────────────────────────── */}
      {isEditModalOpen && (
        <EditWorkflowModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          workflow={workflow}
        />
      )}

      {/* ── Lens edit modal ─────────────────────────────────────────────────── */}
      <CreateLensModal
        isOpen={lensModal.isOpen}
        onClose={lensModal.closeModal}
        onSubmit={() => lensModal.submit()}
        form={lensModal.form}
        isSubmitting={lensModal.isSubmitting}
        error={lensModal.error}
        isEditMode={lensModal.isEditMode}
      />
    </div>
  )
}
