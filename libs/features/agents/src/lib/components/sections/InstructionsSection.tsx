import { queryKeys } from '@lenserfight/data/cache'
import { agentsService, lensesService } from '@lenserfight/data/repositories'
import { VersionParamFields } from '@lenserfight/features/lenses'
import { useLenserWorkspace } from '@lenserfight/features/profile'
import { Drawer } from '@lenserfight/ui/overlays'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Bot, Plus, Search, Sparkles } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EmptyPanel } from '../EmptyPanel'

import { ProfileCard } from './_shared'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'
import { SectionPage } from './SectionPage'

import type { LensVersion, LensVersionParam } from '@lenserfight/types'

export const InstructionsSection: React.FC = () => {
  const {
    profile,
    agentProfile,
    bootstrapState,
    defaultInstructionBinding,
    instructionBindings,
    isOwner,
  } = useAgentWorkspace()
  const { humanWorkspace } = useLenserWorkspace()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedLensId, setSelectedLensId] = useState('')
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({})
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({})
  const [createLensDrawer, setCreateLensDrawer] = useState(false)
  const [newLensTitle, setNewLensTitle] = useState('')
  const [newLensError, setNewLensError] = useState<string | null>(null)

  const ownerId = humanWorkspace?.id ?? agentProfile?.owner_lenser_id ?? profile.id

  const ownedLensesQuery = useQuery({
    queryKey: queryKeys.lenses.byOwner(ownerId),
    queryFn: () => lensesService.getMyLenses(0, 60),
    // Defer until we have a real human owner ID to avoid querying under the AI lenser's ID
    enabled: isOwner && (!!humanWorkspace?.id || !!agentProfile?.owner_lenser_id),
    staleTime: 30_000,
  })

  const [newLensContent, setNewLensContent] = useState('')

  const openCreateLensDrawer = () => {
    setNewLensTitle('')
    setNewLensContent('')
    setNewLensError(null)
    setCreateLensDrawer(true)
  }

  const createLens = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      return lensesService.createLens({ title, content, visibility: 'private', tagIds: [] })
    },
    onSuccess: async (newLens) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.lenses.byOwner(ownerId) })
      setSelectedLensId(newLens.id)
      setSelectedVersionId('')
      setCreateLensDrawer(false)
      setNewLensTitle('')
      setNewLensContent('')
      setNewLensError(null)
    },
    onError: (cause) => setNewLensError((cause as Error).message ?? 'Failed to create lens.'),
  })

  const agentHandle = agentProfile?.handle ?? ''

  const searchQuery = useQuery({
    queryKey: [...queryKeys.lenses.feed({ search }), 'instructions-search', search, agentHandle],
    queryFn: () => lensesService.search(search, 0, 20, agentProfile?.profile_id ?? null),
    enabled: isOwner && search.trim().length >= 2 && !!agentHandle,
    staleTime: 15_000,
  })

  const lensOptions = useMemo(() => {
    if (search.trim().length >= 2) {
      const data = searchQuery.data
      return Array.isArray(data) ? data : (data?.data ?? [])
    }
    const data = ownedLensesQuery.data
    return Array.isArray(data) ? data : (data?.data ?? [])
  }, [ownedLensesQuery.data, search, searchQuery.data])

  const selectedLens = lensOptions.find((lens) => lens.id === selectedLensId) ?? null

  const versionsQuery = useQuery<LensVersion[]>({
    queryKey: queryKeys.lensVersions.list(selectedLensId),
    queryFn: () => lensesService.getVersions(selectedLensId),
    enabled: !!selectedLensId,
    staleTime: 30_000,
  })

  // Resolve the best version to preview params for — even when the dropdown shows "Latest published".
  // Prefers published, falls back to the first available version (draft/archived).
  const effectiveVersionId = useMemo(() => {
    if (selectedVersionId) return selectedVersionId
    const versions = versionsQuery.data ?? []
    return (
      versions.find((v) => v.status === 'published')?.id ??
      versions[0]?.id ??
      ''
    )
  }, [selectedVersionId, versionsQuery.data])

  const selectedVersionDetailQuery = useQuery<LensVersion | null>({
    queryKey: queryKeys.lensVersions.detail(effectiveVersionId),
    queryFn: () => lensesService.getVersionById(effectiveVersionId),
    enabled: !!effectiveVersionId,
    staleTime: 60_000,
  })

  const versionParams: LensVersionParam[] = selectedVersionDetailQuery.data?.parameters ?? []

  useEffect(() => {
    if (!selectedLensId && defaultInstructionBinding?.lens_id) {
      setSelectedLensId(defaultInstructionBinding.lens_id)
      setSelectedVersionId(defaultInstructionBinding.version_id ?? '')
    }
  }, [defaultInstructionBinding, selectedLensId])

  useEffect(() => {
    setParamValues({})
    setParamErrors({})
  }, [effectiveVersionId])

  const handleBind = async () => {
    if (!agentProfile?.ai_lenser_id) {
      setError('Agent profile not loaded. Please refresh the page.')
      return
    }
    if (!selectedLensId) return
    setSaving(true)
    setError(null)
    try {
      await agentsService.setMainLensBinding(
        agentProfile.ai_lenser_id,
        selectedLensId,
        selectedVersionId || null
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

  return (
    <SectionPage
      eyebrow="Instructions"
      title="Instruction lens binding"
      description="Instead of personality profiles, the selected AI lenser now uses a bound lens version as its default instruction source. That keeps instructions versioned, reusable, and consistent with the rest of the product."
      toolbar={
        <a
          href="/lenses"
          className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
        >
          Open lens studio
        </a>
      }
    >
      <BootstrapStatusPanel state={bootstrapState} />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ProfileCard
          title="Current default"
          subtitle="Owner-initiated runs fall back to this instruction source unless a workflow node overrides it."
        >
          {defaultInstructionBinding ? (
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <Row
                label="Lens"
                value={defaultInstructionBinding.lens_id.slice(0, 8)}
              />
              <Row
                label="Version"
                value={
                  defaultInstructionBinding.version_id
                    ? defaultInstructionBinding.version_id.slice(0, 8)
                    : 'Latest published'
                }
              />
              <Row
                label="Bindings"
                value={String(instructionBindings.length)}
              />
            </div>
          ) : (
            <EmptyPanel
              icon={<Bot size={20} />}
              title="No instruction lens bound"
              description="Bind a lens version here so the selected AI lenser has a canonical instruction source instead of ad hoc personality text."
            >
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={openCreateLensDrawer}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
                >
                  <Plus size={14} />
                  Create instruction lens
                </button>
              </div>
            </EmptyPanel>
          )}
        </ProfileCard>

        <ProfileCard
          title="Bind a lens version"
          subtitle="Choose a reusable lens and optionally pin a specific published version."
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Search lenses
              </span>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search your lenses or public instruction lenses..."
                  className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  Lens
                </span>
                <select
                  value={selectedLensId}
                  onChange={(event) => {
                    setSelectedLensId(event.target.value)
                    setSelectedVersionId('')
                  }}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Select a lens</option>
                  {lensOptions.map((lens) => (
                    <option key={lens.id} value={lens.id}>
                      {lens.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  Version
                </span>
                <select
                  value={selectedVersionId}
                  onChange={(event) => setSelectedVersionId(event.target.value)}
                  disabled={!selectedLensId || versionsQuery.isLoading}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Latest published</option>
                  {(versionsQuery.data ?? []).map((version) => (
                    <option key={version.id} value={version.id}>
                      v{version.versionNumber} · {version.status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedLens && (
              <div className="rounded-[20px] border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {selectedLens.title}
                </div>
                {selectedLens.description && (
                  <p className="mt-2 leading-6">{selectedLens.description}</p>
                )}
              </div>
            )}

            {effectiveVersionId && selectedVersionDetailQuery.isLoading && (
              <p className="text-xs text-gray-400 dark:text-gray-500">Loading version parameters…</p>
            )}

            {effectiveVersionId && !selectedVersionDetailQuery.isLoading && selectedVersionDetailQuery.data === null && (
              <p className="text-xs text-amber-500 dark:text-amber-400">Could not load version details. The version may be unavailable or you may not have access.</p>
            )}

            {versionParams.length > 0 && (
              <div className="rounded-[20px] border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
                  These parameters are shown for reference. Fill them to preview execution, but the binding itself does not store parameter values.
                </p>
                <VersionParamFields
                  params={versionParams}
                  values={paramValues}
                  errors={paramErrors}
                  onChange={(name, value) =>
                    setParamValues((prev) => ({ ...prev, [name]: value }))
                  }
                  onImportJson={() => {}}
                  onImportCsv={() => {}}
                />
              </div>
            )}

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleBind}
                disabled={!selectedLensId || saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
              >
                <Sparkles size={14} />
                {saving ? 'Binding…' : 'Bind instruction lens'}
              </button>
              <button
                type="button"
                onClick={openCreateLensDrawer}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
              >
                <Plus size={14} />
                Create a new lens
              </button>
            </div>
          </div>
        </ProfileCard>
      </div>
      <Drawer
        open={createLensDrawer}
        onClose={() => setCreateLensDrawer(false)}
        side="right"
        width="w-[480px]"
        title="Create a new lens"
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
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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
              className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateLensDrawer(false)}
              className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { if (newLensTitle.trim() && newLensContent.trim()) createLens.mutate({ title: newLensTitle.trim(), content: newLensContent.trim() }) }}
              disabled={createLens.isPending || !newLensTitle.trim() || newLensContent.trim().length < 50}
              className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              <Plus size={14} />
              {createLens.isPending ? 'Creating…' : 'Create lens'}
            </button>
          </div>
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
