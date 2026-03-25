import { useQueryClient } from '@tanstack/react-query'
import { GitFork, History, Lock, Loader2, Pencil, Trash2, Flag, Play, ChevronDown, ChevronUp } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { ConfirmModal } from '@lenserfight/ui/modals'
import { SEOHead } from '@lenserfight/ui/components'
import { useAuth } from '@lenserfight/features/auth'
import { useShareContext } from '@lenserfight/features/share'
import { useUI } from '@lenserfight/ui/providers'
import { lensesService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { useReportContent } from '@lenserfight/features/home'
import { CreateVersionParamInput, ReportReasonEnum } from '@lenserfight/types'
import { AIResultsSection } from '@lenserfight/features/generations'
import { CreateLenserProfileModal } from '@lenserfight/features/onboarding'
import { CreateLensModal } from '../components/CreateLensModal'
import { LensAuthorList } from '../components/LensAuthorList'
import { LensBodyViewer } from '../components/LensBodyViewer'
import { LensDetailHeader } from '../components/LensDetailHeader'
import { LensRelatedList } from '../components/LensRelatedList'
import { LabExecutionPanel } from '../components/LabExecutionPanel'
import { LabArtifactViewer } from '../components/LabArtifactViewer'
import { useAuthenticatedLenser } from '../hooks/useAuthenticatedLenser'
import { useCloneLens } from '../hooks/useCloneLens'
import { useCreateLens } from '../hooks/useCreateLens'
import { useForkTree } from '../hooks/useForkTree'
import { useLensDetailController } from '../hooks/useLensDetailController'
import { useLensVersionsPaginated, useLensVersionDetail, useLatestPublishedVersion } from '../hooks/useLensVersions'
import { useLabController } from '../hooks/useLabController'
import { useFundingSource } from '../hooks/useFundingSource'

export const LensDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { lenser, hasLenser } = useAuthenticatedLenser()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const { setShareConfig } = useShareContext()
  const { setPageActions, setPageTitle } = useUI()
  const queryClient = useQueryClient()

  const { lens, relatedLenses, authorLenses, isLoading, error, actions } =
    useLensDetailController(id)

  const reportContent = useReportContent()

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReasonEnum>('spam')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Execution panel state
  const [showRunPanel, setShowRunPanel] = useState(false)
  const [providersEnabled, setProvidersEnabled] = useState(false)
  const handleProviderDropdownOpen = useCallback(() => setProvidersEnabled(true), [])

  const resolveLocalKeyRef = useRef<((id: string) => Promise<string>) | undefined>(undefined)
  const stableResolveLocalKey = useCallback(
    (keyId: string) =>
      resolveLocalKeyRef.current
        ? resolveLocalKeyRef.current(keyId)
        : Promise.reject(new Error('Local key resolver not ready')),
    [],
  )

  const lab = useLabController(id ?? '', !!isAuthenticated, {
    providersEnabled,
    resolveLocalKey: stableResolveLocalKey,
  })
  const funding = useFundingSource(lab.selectedProviderKey)
  resolveLocalKeyRef.current = funding.resolveLocalKey

  // Auto-sync Cloud BYOK key's provider → lab model query
  useEffect(() => {
    if (funding.fundingSource !== 'user_byok_cloud') return
    const key = funding.availableKeys.find((k) => k.id === funding.selectedKeyRefId)
    if (key) lab.handleProviderChange(key.providerKey)
  }, [funding.fundingSource, funding.selectedKeyRefId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-sync Local BYOK non-Ollama key's provider → lab model query
  useEffect(() => {
    if (funding.fundingSource !== 'user_byok_local') return
    const localKey = funding.localKeys.find((k) => k.id === funding.selectedLocalKeyId)
    if (localKey && localKey.provider !== 'ollama') lab.handleProviderChange(localKey.provider)
  }, [funding.fundingSource, funding.selectedLocalKeyId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Version history (lazy — only fetched when picker is opened)
  const [showVersionPicker, setShowVersionPicker] = useState(false)
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null)

  const {
    versions,
    isLoading: isLoadingVersions,
    hasMore: hasMoreVersions,
    isFetchingMore: isFetchingMoreVersions,
    sentinelRef: versionSentinelRef,
  } = useLensVersionsPaginated(id ?? '', {
    enabled: showVersionPicker,
  })
  const { data: previewVersion, isLoading: isLoadingPreview } = useLensVersionDetail(previewVersionId)

  // Auto-load latest published version on page init so params are available immediately
  const { data: latestPublished } = useLatestPublishedVersion(id ?? '')
  const { data: latestPublishedDetail, isLoading: isLoadingLatestDetail } = useLensVersionDetail(latestPublished?.id)

  // Explicit version selection takes precedence; falls back to latest published
  const activeVersionParams =
    previewVersion?.parameters ?? latestPublishedDetail?.parameters ?? undefined


  const selectedModelInputModalities = lab.providerModels.find(
    (m) => m.key === lab.selectedModelKey,
  )?.inputModalities

  const { cloneLens, isCloning } = useCloneLens(lens ?? null)
  const { forkTree, isLoadingForkTree } = useForkTree(id ?? '', lens?.parentLensId)

  const {
    isOpen: isCreateOpen,
    openModal: openCreateModal,
    closeModal: closeCreateModal,
    form: createForm,
    isSubmitting: isCreateSubmitting,
    error: createError,
    submit: submitCreate,
    isEditMode,
  } = useCreateLens()

  const isOwner = !!(lenser && lens && lens.author.id === lenser.id)

  const ensureProfile = (): boolean => {
    if (!hasLenser) { setShowProfileModal(true); return false }
    return true
  }

  useEffect(() => {
    if (!lens) return
    setPageTitle(lens.title)
    setShareConfig({ title: lens.title, resourceType: 'lens', resourceId: lens.id })
  }, [lens, setPageTitle, setShareConfig])

  const pageActions = useMemo(() => {
    if (isOwner && lens?.id) {
      return [
        { label: 'Edit Lens', icon: <Pencil size={16} />, onClick: () => handleEditClick(lens.id) },
        { label: 'Delete Lens', icon: <Trash2 size={16} />, onClick: () => handleDeleteClick(lens.id), variant: 'danger' as const },
      ]
    }
    if (!isOwner && lens?.id && hasLenser) {
      return [
        { label: 'Report Lens', icon: <Flag size={16} />, onClick: () => setIsReportOpen(true), variant: 'danger' as const },
      ]
    }
    return []
  }, [isOwner, lens, hasLenser])

  useEffect(() => { setPageActions(pageActions) }, [pageActions, setPageActions])

  const handleCreateClick = () => { if (ensureProfile()) openCreateModal() }

  const handleDeleteClick = (targetId: string) => {
    setDeleteTargetId(targetId)
    setIsDeleteModalOpen(true)
  }

  const handleEditClick = (targetId?: string) => {
    if (!ensureProfile()) return
    const editId = targetId || lens?.id
    if (editId && lenser) {
      lensesService.getLensDetail(editId, lenser.id).then(async (detail) => {
        if (!detail) return
        let initialVersionParams: CreateVersionParamInput[] = []
        if (detail.latestVersionId) {
          const versionDetail = await lensesService.getVersionById(detail.latestVersionId)
          initialVersionParams = (versionDetail?.parameters ?? []).map((p) => ({
            label: p.label,
            toolId: p.toolId,
          }))
        }
        openCreateModal({
          id: detail.id,
          title: detail.title,
          content: detail.content,
          tags: detail.tags,
          visibility: detail.visibility,
          versionParams: initialVersionParams,
        })
      })
    }
  }

  const handleCopy = async () => {
    if (!lens || !ensureProfile() || !lenser) return
    try {
      await navigator.clipboard.writeText(previewVersion?.templateBody ?? latestPublishedDetail?.templateBody ?? lens.content)
      await actions.copyLens()
    } catch { }
  }

  const handleSave = async () => {
    if (!ensureProfile()) return
    setIsSaving(true)
    try { await actions.saveLens() } finally { setIsSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTargetId || !lenser) return
    setIsDeleting(true)
    try {
      await lensesService.deleteLens(deleteTargetId, lenser.id)
      setIsDeleteModalOpen(false)
      if (lens && deleteTargetId === lens.id) {
        navigate('/lenses')
      } else {
        queryClient.invalidateQueries({ queryKey: ['lens-list'] })
        queryClient.invalidateQueries({ queryKey: ['lens-composite', lens?.id] })
      }
    } finally {
      setIsDeleting(false)
      setDeleteTargetId(null)
    }
  }

  const handleCreateSubmit = (newId: string) => {
    if (isEditMode && lens && newId === lens.id) {
      queryClient.invalidateQueries({ queryKey: ['lens-composite', lens.id] })
      // Refresh version data so post-edit params & version list are immediately current
      queryClient.invalidateQueries({ queryKey: queryKeys.lensVersions.latestPublished(lens.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.lensVersions.all })
    } else {
      navigate(`/lenses/${newId}`)
    }
  }

  const handleVersionToggle = () => {
    setShowVersionPicker((v) => !v)
    setPreviewVersionId(null)
  }

  if (authLoading || isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-pulse">
        <div className="lg:col-span-8 space-y-8">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-16 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-64 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  if (error === '401') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-full mb-6">
          <Lock className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Access Denied</h2>
        <button onClick={() => navigate('/lenses')} className="text-primary-700 dark:text-primary-400 hover:underline">
          Return to Library
        </button>
      </div>
    )
  }

  if (!lens || error === '404') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Lens Not Found</h2>
        <button onClick={() => navigate('/lenses')} className="text-primary hover:underline">
          Return to Library
        </button>
      </div>
    )
  }

  return (
    <div>
      <SEOHead type="lens" data={lens} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          <div className="max-w-[860px] mx-auto">
            <LensDetailHeader
              lens={lens}
              onSave={handleSave}
              onEdit={() => handleEditClick(lens.id)}
              canEdit={isOwner}
              isSaved={lens.isSaved}
              isSaving={isSaving}
              saveCount={lens.reactionCounts.saved}
              forkTree={forkTree}
              isLoadingForkTree={isLoadingForkTree}
            />
          </div>

          <div className="flex flex-col gap-2 mb-6">
            {/* Viewer toolbar */}
            <div className="flex items-center justify-end gap-2">
              {/* Clone button */}
              <button
                type="button"
                onClick={() => cloneLens(previewVersionId ?? null)}
                disabled={isCloning}
                title={previewVersionId ? 'Clone this version as a new lens' : 'Clone latest version as a new lens'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border shadow-sm transition-all border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50"
              >
                {isCloning ? <Loader2 size={13} className="animate-spin" /> : <GitFork size={13} />}
                <span>{previewVersionId ? 'Clone this version' : 'Clone'}</span>
              </button>

              {/* Version history button */}
              <button
                type="button"
                onClick={handleVersionToggle}
                title={showVersionPicker ? 'Hide version history' : 'Show version history'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border shadow-sm transition-all ${
                  showVersionPicker
                    ? 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <History size={13} />
                <span>
                  {previewVersionId
                    ? `v${versions.find((v) => v.id === previewVersionId)?.versionNumber ?? '?'} selected`
                    : 'Version history'}
                </span>
              </button>
            </div>

            <LensBodyViewer
              content={previewVersion?.templateBody ?? latestPublishedDetail?.templateBody ?? lens.content}
              versionParams={activeVersionParams}
              onCopy={handleCopy}
            />
          </div>

          {/* Compact version picker — collapsed by default */}
          {showVersionPicker && (
            <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
              {isLoadingVersions ? (
                <div className="flex items-center justify-center gap-2 py-5 text-xs text-gray-400">
                  <Loader2 size={13} className="animate-spin" />
                  Loading versions…
                </div>
              ) : versions.length === 0 ? (
                <div className="py-5 text-xs text-center text-gray-400">No versions found.</div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-52 overflow-y-auto">
                  {versions.map((v) => {
                    const isSelected = v.id === previewVersionId
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setPreviewVersionId(isSelected ? null : v.id)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                          isSelected
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="font-mono font-bold text-xs w-8 shrink-0">
                          v{v.versionNumber}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                            v.status === 'draft'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          }`}
                        >
                          {v.status}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
                          {v.changelog ?? '—'}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </span>
                        {isSelected && isLoadingPreview && (
                          <Loader2 size={12} className="animate-spin text-gray-400 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                  {/* Infinite scroll sentinel for compact picker */}
                  {hasMoreVersions && <div ref={versionSentinelRef} className="h-2" />}
                  {isFetchingMoreVersions && (
                    <div className="flex justify-center py-2">
                      <Loader2 size={12} className="animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Run Lens collapsible panel */}
          <div className="max-w-[860px] mx-auto mb-6">
            <button
              type="button"
              onClick={() => setShowRunPanel((v) => !v)}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <Play size={15} className="text-primary-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-1">
                Run Lens
              </span>
              {showRunPanel ? (
                <ChevronUp size={15} className="text-gray-400" />
              ) : (
                <ChevronDown size={15} className="text-gray-400" />
              )}
            </button>

            {showRunPanel && (
              <div className="mt-3 space-y-4">
                <LabExecutionPanel
                  lensId={lens.id}
                  lensContent={previewVersion?.templateBody ?? latestPublishedDetail?.templateBody ?? lens.content}
                  providers={lab.providers}
                  isLoadingProviders={lab.isLoadingProviders}
                  providerModels={lab.providerModels}
                  isLoadingModels={lab.isLoadingModels}
                  selectedProviderKey={lab.selectedProviderKey}
                  selectedModelKey={lab.selectedModelKey}
                  onProviderChange={lab.handleProviderChange}
                  onModelChange={lab.setSelectedModelKey}
                  onTrigger={lab.triggerExecution}
                  onTriggerStream={lab.triggerStream}
                  isTriggeringExecution={lab.isTriggeringExecution}
                  isConnecting={lab.streamState === 'loading'}
                  isStreaming={lab.streamState === 'loading' || lab.streamState === 'streaming'}
                  onStop={lab.stopStream}
                  versionParams={activeVersionParams}
                  isLoadingVersionParams={!previewVersionId && (isLoadingLatestDetail || (!!latestPublished && !latestPublishedDetail))}
                  selectedModelInputModalities={selectedModelInputModalities}
                  fundingSource={funding.fundingSource}
                  onFundingSourceChange={funding.setFundingSource}
                  selectedKeyRefId={funding.selectedKeyRefId}
                  onKeyRefIdChange={funding.setSelectedKeyRefId}
                  availableKeys={funding.availableKeys}
                  walletBalance={funding.walletBalance}
                  canUseBYOK={funding.canUseBYOK}
                  selectedLocalKeyId={funding.selectedLocalKeyId}
                  onLocalKeyIdChange={funding.setSelectedLocalKeyId}
                  availableLocalKeys={funding.localKeys}
                  onAddLocalKey={funding.addLocalKey}
                  onRemoveLocalKey={funding.removeLocalKey}
                  onProviderDropdownOpen={handleProviderDropdownOpen}
                />
                <LabArtifactViewer
                  selectedRunId={lab.selectedRunId}
                  comparisonRunIds={lab.comparisonRunIds}
                  latestResult={lab.latestResult}
                  streamState={lab.streamState}
                  streamOutput={lab.streamOutput}
                  streamRunId={lab.streamRunId}
                  streamUsage={lab.streamUsage}
                  streamCredits={lab.streamCredits}
                  streamError={lab.streamError}
                  isOwner={isOwner}
                />
              </div>
            )}
          </div>

          <div className="max-w-[860px] mx-auto">
            <AIResultsSection lensId={lens.id} />
          </div>
        </div>

        <div className="lg:col-span-4 border-t lg:border-t-0 border-gray-100 dark:border-gray-800 pt-8 lg:pt-0">
          <LensAuthorList
            lenses={authorLenses}
            authorName={lens.author.displayName}
            onOpen={(id) => navigate(`/lenses/${id}`)}
            isLoading={isLoading}
            onCreateClick={handleCreateClick}
            isOwner={isOwner}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
          <LensRelatedList
            lenses={relatedLenses}
            onOpen={(id) => navigate(`/lenses/${id}`)}
            isLoading={isLoading}
          />
        </div>
      </div>

      <CreateLensModal
        isOpen={isCreateOpen}
        onClose={closeCreateModal}
        onSubmit={() => submitCreate(handleCreateSubmit)}
        form={createForm}
        isSubmitting={isCreateSubmitting}
        error={createError}
        isEditMode={isEditMode}
        lensId={isEditMode && lens ? lens.id : undefined}
      />

      {showProfileModal && <CreateLenserProfileModal onClose={() => setShowProfileModal(false)} />}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Lens"
        message="Are you sure you want to delete this lens? This action cannot be undone."
        confirmLabel="Delete"
        isLoading={isDeleting}
      />

      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Report Lens</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Why are you reporting this lens?</p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value as typeof reportReason)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {(['spam', 'harassment', 'misinformation', 'off_topic', 'other'] as const).map((r) => (
                <option key={r} value={r}>
                  {r.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => setIsReportOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  reportContent.mutate({ targetType: 'lens', targetId: lens.id, reason: reportReason })
                  setIsReportOpen(false)
                }}
                disabled={reportContent.isPending}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {reportContent.isPending ? 'Reporting…' : 'Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
