import { queryKeys } from '@lenserfight/data/cache'
import { lensesService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { AIResultsSection } from '@lenserfight/features/generations'
import { useReportContent } from '@lenserfight/features/home'
import { CreateLenserProfileModal } from '@lenserfight/features/onboarding'
import { useShareContext } from '@lenserfight/features/share'
import { CreateVersionParamInput, ReportReasonEnum } from '@lenserfight/types'
import { SEOHead, Badge, Button, Card, DesktopFrame } from '@lenserfight/ui/components'
import { ConfirmModal } from '@lenserfight/ui/modals'
import { useUI } from '@lenserfight/ui/providers'
import { useQueryClient } from '@tanstack/react-query'
import { GitFork, History, Lock, Loader2, Pencil, Trash2, Flag, Play, ChevronDown, ChevronUp } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'


import { CreateLensModal } from '../components/CreateLensModal'
import { LabArtifactViewer } from '../components/LabArtifactViewer'
import { LabExecutionPanel } from '../components/LabExecutionPanel'
import { LensAuthorList } from '../components/LensAuthorList'
import { LensBodyViewer } from '../components/LensBodyViewer'
import { LensDetailHeader } from '../components/LensDetailHeader'
import { LensRelatedList } from '../components/LensRelatedList'
import { useAuthenticatedLenser } from '../hooks/useAuthenticatedLenser'
import { useCloneLens } from '../hooks/useCloneLens'
import { useCreateLens } from '../hooks/useCreateLens'
import { useForkTree } from '../hooks/useForkTree'
import { useFundingSource } from '../hooks/useFundingSource'
import { useLabController } from '../hooks/useLabController'
import { useLensDetailController } from '../hooks/useLensDetailController'
import { useLensVersionsPaginated, useLensVersionDetail, useLatestPublishedVersion } from '../hooks/useLensVersions'

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

  const activeVersionLabel = previewVersion?.versionNumber ?? latestPublishedDetail?.versionNumber ?? null
  const parameterCount = activeVersionParams?.length ?? 0
  const selectedModel = lab.providerModels.find((m) => m.key === lab.selectedModelKey)
  const inputModalities = selectedModelInputModalities?.length ? selectedModelInputModalities.join(', ') : 'text'
  const executionLabel =
    funding.fundingSource === 'user_byok_cloud'
      ? 'Cloud BYOK'
      : funding.fundingSource === 'user_byok_local'
      ? 'Local BYOK'
      : 'Managed provider'
  const providerLabel = selectedModel?.name ?? lab.selectedModelKey ?? 'Model not selected'
  const outputStateLabel = lab.latestResult
    ? 'Latest execution available'
    : lab.streamState === 'streaming' || lab.streamState === 'loading'
    ? 'Execution in progress'
    : 'No execution yet'
  const historyLabel = versions.length > 0 ? `${versions.length} versions` : 'No version history yet'

  const { cloneLens, isCloning } = useCloneLens(lens ?? null)
  const { forkTree } = useForkTree(id ?? '', lens?.parentLensId)

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

  const ensureProfile = useCallback((): boolean => {
    if (!hasLenser) {
      setShowProfileModal(true)
      return false
    }
    return true
  }, [hasLenser])

  useEffect(() => {
    if (!lens) return
    setPageTitle(lens.title)
    setShareConfig({ title: lens.title, resourceType: 'lens', resourceId: lens.id })
  }, [lens, setPageTitle, setShareConfig])

  const handleCreateClick = useCallback(() => {
    if (ensureProfile()) openCreateModal()
  }, [ensureProfile, openCreateModal])

  const handleDeleteClick = useCallback((targetId: string) => {
    setDeleteTargetId(targetId)
    setIsDeleteModalOpen(true)
  }, [])

  const handleEditClick = useCallback(
    (targetId?: string) => {
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
    },
    [ensureProfile, lenser, lens?.id, openCreateModal],
  )

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
  }, [hasLenser, handleDeleteClick, handleEditClick, isOwner, lens])

  useEffect(() => { setPageActions(pageActions) }, [pageActions, setPageActions])

  const handleCopy = async () => {
    if (!lens || !ensureProfile() || !lenser) return
    try {
      await navigator.clipboard.writeText(previewVersion?.templateBody ?? latestPublishedDetail?.templateBody ?? lens.content)
      await actions.copyLens()
    } catch (error) {
      void error
    }
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
    <div className="space-y-8">
      <SEOHead type="lens" data={lens} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-2 p-4">
          <Badge color="blue" variant="outline">
            Inputs
          </Badge>
          <p className="text-lg font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
            {parameterCount > 0 ? `${parameterCount} parameters` : 'Freeform Lens'}
          </p>
          <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-400">
            {inputModalities} inputs are available for the current version.
          </p>
        </Card>

        <Card className="space-y-2 p-4">
          <Badge color="purple" variant="outline">
            Execution
          </Badge>
          <p className="text-lg font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
            {executionLabel}
          </p>
          <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-400">{providerLabel}</p>
        </Card>

        <Card className="space-y-2 p-4">
          <Badge color="green" variant="outline">
            Output
          </Badge>
          <p className="text-lg font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
            {outputStateLabel}
          </p>
          <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-400">
            Read the generated artifact below or run the Lens to produce a fresh result.
          </p>
        </Card>

        <Card className="space-y-2 p-4">
          <Badge color="gray" variant="outline">
            History
          </Badge>
          <p className="text-lg font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
            {historyLabel}
          </p>
          <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-400">
            {activeVersionLabel ? `Currently previewing v${activeVersionLabel}.` : 'Latest published version in view.'}
          </p>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.04fr)_360px]">
        <div className="space-y-8">
          <Card className="space-y-4 p-6">
            <LensDetailHeader
              lens={lens}
              onSave={handleSave}
              onEdit={() => handleEditClick(lens.id)}
              canEdit={isOwner}
              isSaved={lens.isSaved}
              isSaving={isSaving}
              saveCount={lens.reactionCounts.saved}
              forkTree={forkTree}
            />
          </Card>

          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => cloneLens(previewVersionId ?? null)}
                disabled={isCloning}
                title={previewVersionId ? 'Clone this version as a new lens' : 'Clone latest version as a new lens'}
                className="flex items-center gap-1.5 rounded-2xl border border-surface-border bg-surface-base px-3 py-2 text-xs font-medium text-greyscale-600 shadow-sm transition-colors hover:border-status-blue hover:text-greyscale-900 disabled:opacity-50 dark:text-greyscale-400 dark:hover:text-greyscale-50"
              >
                {isCloning ? <Loader2 size={13} className="animate-spin" /> : <GitFork size={13} />}
                <span>{previewVersionId ? 'Clone this version' : 'Clone'}</span>
              </button>

              <button
                type="button"
                onClick={handleVersionToggle}
                title={showVersionPicker ? 'Hide version history' : 'Show version history'}
                className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-medium shadow-sm transition-colors ${
                  showVersionPicker
                    ? 'border-status-blue bg-status-blue/10 text-status-blue'
                    : 'border-surface-border bg-surface-base text-greyscale-600 hover:border-status-blue hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-50'
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

            <DesktopFrame
              title="Lens reader preview"
              url={`lenserfight.com/lenses/${lens.id}`}
              label={activeVersionLabel ? `v${activeVersionLabel}` : 'Reader view'}
            >
              <LensBodyViewer
                content={previewVersion?.templateBody ?? latestPublishedDetail?.templateBody ?? lens.content}
                versionParams={activeVersionParams}
                onCopy={handleCopy}
              />
            </DesktopFrame>
          </Card>

          {showVersionPicker && (
            <Card className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">Version history</p>
                  <p className="text-xs text-greyscale-500 dark:text-greyscale-400">
                    Select a version to preview its parameters and body.
                  </p>
                </div>
                {isLoadingVersions && (
                  <span className="flex items-center gap-2 text-xs text-greyscale-500">
                    <Loader2 size={13} className="animate-spin" />
                    Loading
                  </span>
                )}
              </div>
              {versions.length === 0 ? (
                <div className="py-4 text-center text-sm text-greyscale-500 dark:text-greyscale-400">No versions found.</div>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-2xl border border-surface-border">
                  <div className="divide-y divide-surface-border">
                    {versions.map((v) => {
                      const isSelected = v.id === previewVersionId
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setPreviewVersionId(isSelected ? null : v.id)}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                            isSelected
                              ? 'bg-status-blue/10 text-status-blue'
                              : 'bg-surface-base text-greyscale-700 hover:bg-surface-raised dark:text-greyscale-300'
                          }`}
                        >
                          <span className="font-mono text-xs font-bold w-8 shrink-0">v{v.versionNumber}</span>
                          <Badge color={v.status === 'draft' ? 'yellow' : 'green'} variant="outline">
                            {v.status}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate text-xs text-greyscale-500 dark:text-greyscale-400">
                            {v.changelog ?? 'No changelog'}
                          </span>
                          <span className="shrink-0 text-[10px] text-greyscale-400">
                            {new Date(v.createdAt).toLocaleDateString()}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {hasMoreVersions && <div ref={versionSentinelRef} className="h-2" />}
                  {isFetchingMoreVersions && (
                    <div className="flex justify-center py-2">
                      <Loader2 size={12} className="animate-spin text-greyscale-400" />
                    </div>
                  )}
                  {previewVersionId && isLoadingPreview && (
                    <div className="flex items-center justify-center gap-2 border-t border-surface-border px-4 py-3 text-xs text-greyscale-500">
                      <Loader2 size={12} className="animate-spin" />
                      Loading selected version
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          <Card className="space-y-4 p-5">
            <button
              type="button"
              onClick={() => setShowRunPanel((v) => !v)}
              className="flex w-full items-center gap-3 rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-left transition-colors hover:border-status-blue"
            >
              <Play size={15} className="flex-shrink-0 text-status-blue" />
              <span className="flex-1 text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">Run Lens</span>
              {showRunPanel ? (
                <ChevronUp size={15} className="text-greyscale-400" />
              ) : (
                <ChevronDown size={15} className="text-greyscale-400" />
              )}
            </button>

            {showRunPanel && (
              <div className="space-y-4 pt-1">
                <LabExecutionPanel
                  lensContent={previewVersion?.templateBody ?? latestPublishedDetail?.templateBody ?? lens.content}
                  providers={lab.providers}
                  isLoadingProviders={lab.isLoadingProviders}
                  providerModels={lab.providerModels}
                  isLoadingModels={lab.isLoadingModels}
                  selectedProviderKey={lab.selectedProviderKey}
                  selectedModelKey={lab.selectedModelKey}
                  onProviderChange={lab.handleProviderChange}
                  onModelChange={lab.setSelectedModelKey}
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
          </Card>

          <Card className="p-6">
            <AIResultsSection lensId={lens.id} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-3 p-5">
            <Badge color="blue" variant="outline">
              Execution context
            </Badge>
            <div className="space-y-3 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
              <p>
                <span className="font-semibold text-greyscale-900 dark:text-greyscale-50">Provider: </span>
                {providerLabel}
              </p>
              <p>
                <span className="font-semibold text-greyscale-900 dark:text-greyscale-50">Input modalities: </span>
                {inputModalities}
              </p>
              <p>
                <span className="font-semibold text-greyscale-900 dark:text-greyscale-50">Result state: </span>
                {outputStateLabel}
              </p>
              <p>
                <span className="font-semibold text-greyscale-900 dark:text-greyscale-50">History: </span>
                {historyLabel}
              </p>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
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
          </Card>

          <Card className="space-y-4 p-5">
            <LensRelatedList
              lenses={relatedLenses}
              onOpen={(id) => navigate(`/lenses/${id}`)}
              isLoading={isLoading}
            />
          </Card>
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
              <Button
                variant="ghost"
                onClick={() => setIsReportOpen(false)}
                className="w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  reportContent.mutate({ targetType: 'lens', targetId: lens.id, reason: reportReason })
                  setIsReportOpen(false)
                }}
                disabled={reportContent.isPending}
                isLoading={reportContent.isPending}
                className="w-auto"
              >
                {reportContent.isPending ? 'Reporting…' : 'Report'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
