import { queryKeys } from '@lenserfight/data/cache'
import { lensesService } from '@lenserfight/data/repositories'
import { LocaleLink } from '@lenserfight/shared/i18n-routing'
import { Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { ConfirmModal } from '@lenserfight/ui/modals'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, ExternalLink, GitFork, Pencil, Search, Sparkles, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { LensVersion } from '@lenserfight/types'
import { useAgentLensPicker } from '../hooks/useAgentLensPicker'
import { EmptyPanel } from './EmptyPanel'
import { ProfileCard } from './sections/_shared'

export interface LensBindingPickerProps {
  enabled: boolean
  onSelect: (lensId: string, versionId: string | null) => void
  bindLabel?: string
  isSaving?: boolean
  currentLensId?: string | null
  currentVersionId?: string | null
}

export const LensBindingPicker: React.FC<LensBindingPickerProps> = ({
  enabled,
  onSelect,
  bindLabel = 'Bind lens',
  isSaving = false,
  currentLensId,
  currentVersionId,
}) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedLensId, setSelectedLensId] = useState(currentLensId ?? '')
  const [selectedVersionId, setSelectedVersionId] = useState(currentVersionId ?? '')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Sync if parent binding changes (e.g. after a successful bind)
  useEffect(() => {
    setSelectedLensId(currentLensId ?? '')
    setSelectedVersionId(currentVersionId ?? '')
  }, [currentLensId, currentVersionId])

  const {
    ownLenses,
    communityLenses,
    isLoading,
    hasNextOwnPage,
    fetchNextOwnPage,
    isFetchingNextOwnPage,
    hasNextCommunityPage,
    fetchNextCommunityPage,
    isFetchingNextCommunityPage,
  } = useAgentLensPicker(enabled, search)

  const versionsQuery = useQuery<LensVersion[]>({
    queryKey: queryKeys.lensVersions.list(selectedLensId),
    queryFn: () => lensesService.getVersions(selectedLensId),
    enabled: !!selectedLensId,
    staleTime: 30_000,
  })

  // Shared by the community "Fork & use" action and "My lenses" row-level
  // "Copy" action — both clone a lens into the caller's workspace and select
  // the copy, they only differ in the toast message.
  const cloneMutation = useMutation({
    mutationFn: (sourceLensId: string) => lensesService.cloneLens(sourceLensId),
    onSuccess: async (newLensId: string, sourceLensId: string) => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.lenses.all, 'agent-picker-own'],
      })
      setSelectedLensId(newLensId)
      setSelectedVersionId('')
      const isOwnLens = ownLenses.some((lens) => lens.id === sourceLensId)
      toast.success(isOwnLens ? 'Lens copied' : 'Lens forked into your workspace')
    },
    onError: (e) => toast.error((e as Error).message ?? 'Fork failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => lensesService.deleteLens(id),
    onSuccess: async (_result, id: string) => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.lenses.all, 'agent-picker-own'],
      })
      if (selectedLensId === id) {
        setSelectedLensId('')
        setSelectedVersionId('')
      }
      setDeleteTargetId(null)
      toast.success('Lens deleted')
    },
    onError: (e) => toast.error((e as Error).message ?? 'Delete failed'),
  })

  const handleBind = () => {
    if (!selectedLensId) return
    onSelect(selectedLensId, selectedVersionId || null)
  }

  const selectLens = (id: string) => {
    setSelectedLensId(id)
    setSelectedVersionId('')
  }

  const isEmpty = ownLenses.length === 0 && communityLenses.length === 0 && !isLoading

  return (
    <ProfileCard
      title="Choose a lens"
      subtitle="Browse your lenses or fork a community lens. Community lenses must be forked before binding."
      toolbar={
        <Button
          type="button"
          onClick={handleBind}
          disabled={!selectedLensId || isSaving || cloneMutation.isPending}
          isLoading={isSaving}
        >
          <Sparkles size={14} />
          {isSaving ? 'Binding…' : bindLabel}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lenses…"
            className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        )}

        {isEmpty && !isLoading && (
          <EmptyPanel
            icon={<Search size={18} />}
            title="No lenses found"
            description="Create a lens in the Lens Studio, or search for a community lens to fork."
          />
        )}

        {/* My lenses */}
        {ownLenses.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              My lenses
            </p>
            <div className="space-y-1">
              {ownLenses.map((lens) => (
                <div
                  key={lens.id}
                  className={`group flex items-center gap-1 rounded-2xl border pl-4 pr-1.5 py-1.5 transition ${selectedLensId === lens.id
                      ? 'border-primary-yellow-400 bg-primary-yellow-50 dark:bg-primary-yellow-500/10'
                      : 'border-gray-200 bg-white hover:border-primary-yellow-300 dark:border-gray-700 dark:bg-gray-900'
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => selectLens(lens.id)}
                    className={`flex-1 min-w-0 py-1 text-left text-sm font-medium transition ${selectedLensId === lens.id
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-700 hover:text-primary-yellow-700 dark:text-gray-200'
                      }`}
                  >
                    {lens.title}
                    {lens.description && (
                      <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                        {lens.description.slice(0, 60)}{lens.description.length > 60 ? '…' : ''}
                      </span>
                    )}
                  </button>
                  <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <LocaleLink
                      to={`/lenses/${lens.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open lens detail in a new tab"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                      <ExternalLink size={14} />
                    </LocaleLink>
                    <button
                      type="button"
                      title="Edit lens"
                      onClick={() => navigate(`/lenses/${lens.id}/main`)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800 dark:hover:text-blue-400"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      title="Copy lens"
                      disabled={cloneMutation.isPending}
                      onClick={() => cloneMutation.mutate(lens.id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      title="Delete lens"
                      onClick={() => setDeleteTargetId(lens.id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {hasNextOwnPage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={fetchNextOwnPage}
                  disabled={isFetchingNextOwnPage}
                  isLoading={isFetchingNextOwnPage}
                >
                  {isFetchingNextOwnPage ? 'Loading…' : 'Load more'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Community lenses */}
        {communityLenses.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Community lenses
            </p>
            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {communityLenses.map((lens) => (
                <div
                  key={lens.id}
                  className="flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2.5 dark:border-gray-700"
                >
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">
                    {lens.title}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={cloneMutation.isPending}
                    onClick={() => cloneMutation.mutate(lens.id)}
                  >
                    <GitFork size={12} />
                    Fork &amp; use
                  </Button>
                </div>
              ))}
              {hasNextCommunityPage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={fetchNextCommunityPage}
                  disabled={isFetchingNextCommunityPage}
                  isLoading={isFetchingNextCommunityPage}
                >
                  {isFetchingNextCommunityPage ? 'Loading…' : 'Load more'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Version selector */}
        {selectedLensId && (
          <div>
            <SelectField
              label="Version"
              value={selectedVersionId}
              onChange={setSelectedVersionId}
              disabled={versionsQuery.isLoading}
              options={[
                { value: '', label: 'Latest published' },
                ...(versionsQuery.data ?? []).map((version) => ({
                  value: version.id,
                  label: `v${version.versionNumber} · ${version.status}`,
                })),
              ]}
            />
          </div>
        )}

      </div>

      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
        title="Delete lens"
        message="Are you sure you want to delete this lens? This action cannot be undone."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </ProfileCard>
  )
}
