import { queryKeys } from '@lenserfight/data/cache'
import { agentsService, lensesService } from '@lenserfight/data/repositories'
import { Button } from '@lenserfight/ui/components'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Plus } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { LensBindingPicker } from '../LensBindingPicker'
import { EmptyPanel } from '../EmptyPanel'

import { ProfileCard } from './_shared'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'
import { SectionPage } from './SectionPage'

export const InstructionsSection: React.FC = () => {
  const {
    profile,
    agentProfile,
    bootstrapState,
    defaultInstructionBinding,
    instructionBindings,
    isOwner,
  } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createLensDrawer, setCreateLensDrawer] = useState(false)
  const [newLensTitle, setNewLensTitle] = useState('')
  const [newLensContent, setNewLensContent] = useState('')
  const [newLensError, setNewLensError] = useState<string | null>(null)

  const ownerId = agentProfile?.ai_lenser_id ?? ''

  const openCreateLensDrawer = () => {
    setNewLensTitle('')
    setNewLensContent('')
    setNewLensError(null)
    setCreateLensDrawer(true)
  }

  const createLens = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) =>
      lensesService.createLens({ title, content, visibility: 'private', tagIds: [] }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.lenses.all, 'agent-picker-own'],
      })
      setCreateLensDrawer(false)
      setNewLensTitle('')
      setNewLensContent('')
      setNewLensError(null)
    },
    onError: (cause) => setNewLensError((cause as Error).message ?? 'Failed to create lens.'),
  })

  const handleBind = async (lensId: string, versionId: string | null) => {
    if (!agentProfile?.ai_lenser_id) {
      setError('Agent profile not loaded. Please refresh the page.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await agentsService.setMainLensBinding(
        agentProfile.ai_lenser_id,
        lensId,
        versionId,
        ['instruction']
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.agents.lensBindings(agentProfile.ai_lenser_id),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
        }),
      ])
    } catch (cause) {
      setError((cause as Error).message ?? 'Failed to bind instruction lens.')
    } finally {
      setSaving(false)
    }
  }

  // Instruction bindings exclude personality-tagged ones
  const instructionOnlyBindings = instructionBindings.filter(
    (b) => !b.category_tags.includes('personality')
  )

  return (
    <SectionPage
      eyebrow="Instructions"
      docsPath="/how-to/agents/workspace/instructions"
      docsTip="Bind a versioned lens as the default system prompt. Owner-only and version-pinned — promoting a new lens version requires an explicit rebind."
      title="Instruction lens binding"
      description="Bind a versioned lens as the default instruction source for this agent. Instructions stay versioned, reusable, and consistent across runs."
      toolbar={
        <a
          href="/lenses"
          className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary-yellow-300 hover:text-primary-yellow-700 dark:border-gray-700 dark:text-gray-200"
        >
          Open lens studio
        </a>
      }
    >
      <BootstrapStatusPanel state={bootstrapState} />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Current default */}
        <ProfileCard
          title="Current default"
          subtitle="Owner-initiated runs fall back to this instruction source unless a workflow node overrides it."
        >
          {defaultInstructionBinding ? (
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <Row label="Lens" value={defaultInstructionBinding.lens_id.slice(0, 8)} />
              <Row
                label="Version"
                value={
                  defaultInstructionBinding.version_id
                    ? defaultInstructionBinding.version_id.slice(0, 8)
                    : 'Latest published'
                }
              />
              <Row label="Bindings" value={String(instructionOnlyBindings.length)} />
            </div>
          ) : (
            <EmptyPanel
              icon={<Bot size={20} />}
              title="No instruction lens bound"
              description="Bind a lens version so this agent has a canonical instruction source instead of ad hoc text."
            >
              <div className="mt-6 flex justify-center">
                <Button
                  type="button"
                  onClick={openCreateLensDrawer}
                >
                  <Plus size={14} />
                  Create instruction lens
                </Button>
              </div>
            </EmptyPanel>
          )}
        </ProfileCard>

        {/* Shared picker */}
        <LensBindingPicker
          enabled={isOwner && !!agentProfile}
          onSelect={handleBind}
          bindLabel="Bind instruction lens"
          isSaving={saving}
          currentLensId={defaultInstructionBinding?.lens_id}
          currentVersionId={defaultInstructionBinding?.version_id}
        />
      </div>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      )}

      {/* Create lens drawer — instruction-specific quick creation */}
      <Drawer
        open={createLensDrawer}
        onClose={() => setCreateLensDrawer(false)}
        side="right"
        width="w-[480px]"
        title="Draft new lens"
        footer={
          <DrawerFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateLensDrawer(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (newLensTitle.trim() && newLensContent.trim()) {
                  createLens.mutate({ title: newLensTitle.trim(), content: newLensContent.trim() })
                }
              }}
              disabled={createLens.isPending || !newLensTitle.trim() || newLensContent.trim().length < 50}
              isLoading={createLens.isPending}
            >
              <Plus size={14} />
              {createLens.isPending ? 'Creating…' : 'Create lens'}
            </Button>
          </DrawerFooter>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The lens will be created as a private draft. You can publish it from the lens studio later.
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Title
            </span>
            <input
              value={newLensTitle}
              onChange={(e) => setNewLensTitle(e.target.value)}
              placeholder="e.g. System instructions v1"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Content
            </span>
            <textarea
              rows={8}
              value={newLensContent}
              onChange={(e) => setNewLensContent(e.target.value)}
              placeholder="Write the instruction content for this lens (at least 50 characters)..."
              className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <span className="mt-1 block text-xs text-gray-400 dark:text-gray-500">
              {newLensContent.length} / 50 min characters
            </span>
          </label>
          {newLensError && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {newLensError}
            </p>
          )}

        </div>
      </Drawer>
    </SectionPage>
  )
}

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span>{label}</span>
    <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
  </div>
)
