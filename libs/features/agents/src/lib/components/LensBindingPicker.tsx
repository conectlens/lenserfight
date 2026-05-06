import { queryKeys } from '@lenserfight/data/cache'
import { lensesService } from '@lenserfight/data/repositories'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GitFork, Search, Sparkles } from 'lucide-react'
import React, { useEffect, useState } from 'react'
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
  const [search, setSearch] = useState('')
  const [selectedLensId, setSelectedLensId] = useState(currentLensId ?? '')
  const [selectedVersionId, setSelectedVersionId] = useState(currentVersionId ?? '')

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

  const forkMutation = useMutation({
    mutationFn: (sourceLensId: string) => lensesService.cloneLens(sourceLensId),
    onSuccess: async (newLensId: string) => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.lenses.all, 'agent-picker-own'],
      })
      setSelectedLensId(newLensId)
      setSelectedVersionId('')
      toast.success('Lens forked into your workspace')
    },
    onError: (e) => toast.error((e as Error).message ?? 'Fork failed'),
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
            className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => selectLens(lens.id)}
                  className={`w-full rounded-2xl border px-4 py-2.5 text-left text-sm font-medium transition ${
                    selectedLensId === lens.id
                      ? 'border-amber-400 bg-amber-50 text-gray-900 dark:bg-amber-500/10 dark:text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
                  }`}
                >
                  {lens.title}
                  {lens.description && (
                    <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                      {lens.description.slice(0, 60)}{lens.description.length > 60 ? '…' : ''}
                    </span>
                  )}
                </button>
              ))}
              {hasNextOwnPage && (
                <button
                  type="button"
                  onClick={fetchNextOwnPage}
                  disabled={isFetchingNextOwnPage}
                  className="w-full rounded-2xl border border-dashed border-gray-200 py-2 text-xs font-semibold text-gray-400 transition hover:border-amber-300 hover:text-amber-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-500"
                >
                  {isFetchingNextOwnPage ? 'Loading…' : 'Load more'}
                </button>
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
            <div className="space-y-1">
              {communityLenses.map((lens) => (
                <div
                  key={lens.id}
                  className="flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2.5 dark:border-gray-700"
                >
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">
                    {lens.title}
                  </span>
                  <button
                    type="button"
                    disabled={forkMutation.isPending}
                    onClick={() => forkMutation.mutate(lens.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-amber-300 hover:text-amber-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                  >
                    <GitFork size={12} />
                    Fork &amp; use
                  </button>
                </div>
              ))}
              {hasNextCommunityPage && (
                <button
                  type="button"
                  onClick={fetchNextCommunityPage}
                  disabled={isFetchingNextCommunityPage}
                  className="w-full rounded-2xl border border-dashed border-gray-200 py-2 text-xs font-semibold text-gray-400 transition hover:border-amber-300 hover:text-amber-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-500"
                >
                  {isFetchingNextCommunityPage ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Version selector */}
        {selectedLensId && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Version
            </span>
            <select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              disabled={versionsQuery.isLoading}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="">Latest published</option>
              {(versionsQuery.data ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} · {v.status}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={handleBind}
          disabled={!selectedLensId || isSaving || forkMutation.isPending}
          className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          <Sparkles size={14} />
          {isSaving ? 'Binding…' : bindLabel}
        </button>
      </div>
    </ProfileCard>
  )
}
