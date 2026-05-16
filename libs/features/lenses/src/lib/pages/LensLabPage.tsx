import { lensesService, preferencesService } from '@lenserfight/data/repositories'
import { ExportModal, useExportRunner, LocalDownloadTransport, CloudDownloadTransport } from '@lenserfight/features/exports'
import { SupabaseExportsRepository } from '@lenserfight/data/exports'
import { supabase } from '@lenserfight/data/supabase'
import { useAuth } from '@lenserfight/features/auth'
import { useReportContent } from '@lenserfight/features/home'
import { useShareContext } from '@lenserfight/features/share'
import { useChainabitConnection } from '@lenserfight/features/store'
import { LenserPreferences } from '@lenserfight/types'
import { ReportReasonEnum } from '@lenserfight/types'
import { Button, HelpButton, SEOHead } from '@lenserfight/ui/components'
import { ConfirmModal } from '@lenserfight/ui/modals'
import { SelectField } from '@lenserfight/ui/forms'
import { useUI } from '@lenserfight/ui/providers'
import { useDrawerRouter } from '@lenserfight/ui/routing'
import { copyTextToClipboard, renderLensContentForCopy } from '@lenserfight/utils/text'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { History, Lock, Loader2, Pencil, Trash2, Flag, ListVideo } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'


import { CreateLensModal } from '../components/CreateLensModal'
import { ExecutionHistoryDrawer } from '../components/ExecutionHistoryDrawer'
import { LabArtifactViewer } from '../components/LabArtifactViewer'
import { LabExecutionPanel } from '../components/LabExecutionPanel'
import { LabExecutionTimeline } from '../components/LabExecutionTimeline'
import { LensBodyViewer } from '../components/LensBodyViewer'
import { LensDetailHeader } from '../components/LensDetailHeader'
import { useAuthenticatedLenser } from '../hooks/useAuthenticatedLenser'
import { useCreateLens } from '../hooks/useCreateLens'
import { useForkLens } from '../hooks/useForkLens'
import { useFundingSource } from '../hooks/useFundingSource'
import { useLabController } from '../hooks/useLabController'
import { useLensDetailController } from '../hooks/useLensDetailController'
import { useLensVersions, useLensVersionDetail } from '../hooks/useLensVersions'
import { useVersionExecution } from '../hooks/useVersionExecution'

export const LensLabPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { lenser, hasLenser } = useAuthenticatedLenser()
  const drawerRouter = useDrawerRouter()
  const { isLoading: authLoading, isAuthenticated, redirectToLogin, user } = useAuth()
  const { setShareConfig } = useShareContext()
  const { setPageActions, setPageTitle } = useUI()
  const queryClient = useQueryClient()

  const { lens, isLoading, error, actions } = useLensDetailController(id, { includeRelated: false })

  const { data: preferences } = useQuery<LenserPreferences | null>({
    queryKey: ['preferences'],
    queryFn: () => preferencesService.getPreferences(),
    enabled: !!isAuthenticated,
    staleTime: 1000 * 60 * 5,
  })

  // Lazy provider loading: only fetch when user first opens the provider dropdown
  const [providersEnabled, setProvidersEnabled] = useState(false)
  const handleProviderDropdownOpen = useCallback(() => setProvidersEnabled(true), [])

  // resolveLocalKey ref — breaks the circular dependency between lab and funding.
  // The ref is written synchronously on every render before triggerStream could be called.
  const resolveLocalKeyRef = useRef<((id: string) => Promise<string>) | undefined>(undefined)
  const stableResolveLocalKey = useCallback(
    (keyId: string) =>
      resolveLocalKeyRef.current
        ? resolveLocalKeyRef.current(keyId)
        : Promise.reject(new Error('Local key resolver not ready')),
    [],
  )

  const lab = useLabController(id ?? '', !!isAuthenticated, {
    preferredProviderKey: preferences?.ai_provider_key,
    preferredModelKey: preferences?.ai_model_key,
    providersEnabled,
    resolveLocalKey: stableResolveLocalKey,
  })

  const funding = useFundingSource(lab.selectedProviderKey)
  const chainabit = useChainabitConnection()
  // Keep the ref current so triggerStream always uses the latest decryption function
  resolveLocalKeyRef.current = funding.resolveLocalKey

  // Auto-sync Cloud BYOK key's provider → lab model query
  // (provider picker is hidden in Cloud BYOK mode; models must load for the right provider)
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

  const { forkLens, isForking } = useForkLens(lens ?? null)

  // Version restore/preview orchestration
  const versionExecution = useVersionExecution()

  // Versioning — lazy, only loads when the picker is opened
  const [showVersionPicker, setShowVersionPicker] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const { versions, isLoading: isLoadingVersions } = useLensVersions(id ?? '', {
    enabled: showVersionPicker,
  })
  const { data: selectedVersion } = useLensVersionDetail(selectedVersionId)

  // Active version: prefer restore-pinned version, then manually selected, then base lens
  const activeVersion = versionExecution.previewVersion ?? selectedVersion ?? null
  const activeLensContent = activeVersion?.templateBody ?? lens?.content ?? ''
  const activeVersionParams = activeVersion?.parameters ?? undefined


  // Selected model input + output modalities
  const selectedModel = lab.providerModels.find((m) => m.key === lab.selectedModelKey)
  const selectedModelInputModalities = selectedModel?.inputModalities
  const selectedModelOutputModalities = selectedModel?.outputModalities

  const reportContent = useReportContent()

  const [isSaving, setIsSaving] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReasonEnum>('spam')

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

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

  const normalizedLenserHandle = lenser?.handle?.trim().toLowerCase()
  const hasActiveLenserProfile =
    !!lenser && hasLenser && normalizedLenserHandle !== 'anon' && normalizedLenserHandle !== 'anonymous'

  const ensureProfile = useCallback((): boolean => {
    if (!isAuthenticated) {
      redirectToLogin()
      return false
    }
    if (!hasActiveLenserProfile) {
      navigate('/onboarding', { state: { from: window.location.pathname } })
      return false
    }
    return true
  }, [hasActiveLenserProfile, isAuthenticated, navigate, redirectToLogin])

  const isOwner = !!(lenser && lens && lens.author.id === lenser.id)

  const buildExportContext = useCallback(() => ({
    userId: user?.id ?? null,
    tenantId: null,
    via: 'web' as const,
    host: window.location.host,
    isOwner,
    isAuthenticated,
  }), [user?.id, isOwner, isAuthenticated])

  const resolveExportTransport = useCallback((id: 'cloud-download' | 'local-download' | 'local-workspace') => {
    if (id === 'local-download') return new LocalDownloadTransport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new CloudDownloadTransport(new SupabaseExportsRepository(supabase as any))
  }, [])

  const runExportInner = useExportRunner({
    kind: 'lens',
    slug: lens?.id ?? '',
    title: lens?.title ?? null,
    fetchPayload: async () => lens,
    buildContext: buildExportContext,
    resolveTransport: resolveExportTransport,
  })
  const runExport = useCallback(
    async (input: { format: import('@lenserfight/domain/exports').ExportFormat; destination: import('@lenserfight/features/exports').TransportId }) => { await runExportInner(input) },
    [runExportInner],
  )

  const handleDeleteClick = useCallback((targetId: string) => {
    setDeleteTargetId(targetId)
    setIsDeleteModalOpen(true)
  }, [])

  const handleCreateClick = useCallback(() => {
    openCreateModal()
  }, [openCreateModal])

  const handleEditClick = useCallback(
    (targetId?: string) => {
      if (!ensureProfile()) return
      const editId = targetId || lens?.id
      if (editId && lenser) {
        lensesService.getLensDetail(editId, lenser.id).then((detail) => {
          if (detail) {
            openCreateModal({
              id: detail.id,
              title: detail.title,
              content: detail.content,
              tags: detail.tags,
              visibility: detail.visibility,
            })
          }
        })
      }
    },
    [ensureProfile, lens?.id, lenser, openCreateModal],
  )

  const pageActions = useMemo(() => {
    if (!lens?.id) return []

    if (isOwner) {
      return [
        {
          label: 'Edit Lens',
          icon: <Pencil size={16} />,
          onClick: () => handleEditClick(lens.id),
        },
        {
          label: 'Delete Lens',
          icon: <Trash2 size={16} />,
          onClick: () => handleDeleteClick(lens.id),
          variant: 'danger' as const,
        },
      ]
    }

    if (hasActiveLenserProfile) {
      return [
        {
          label: 'Report Lens',
          icon: <Flag size={16} />,
          onClick: () => setIsReportOpen(true),
          variant: 'danger' as const,
        },
      ]
    }

    return []
  }, [handleDeleteClick, handleEditClick, hasActiveLenserProfile, isOwner, lens?.id])

  useEffect(() => {
    setPageActions(pageActions)
  }, [pageActions, setPageActions])

  useEffect(() => {
    return () => {
      setPageActions([])
      setPageTitle(null)
      setShareConfig(null)
    }
  }, [setPageActions, setPageTitle, setShareConfig])

  useEffect(() => {
    if (!lens) {
      setPageTitle(null)
      setShareConfig(null)
      return
    }

    setPageTitle(lens.title)
    setShareConfig({
      title: lens.title,
      resourceType: 'lens',
      resourceId: lens.id,
    })
  }, [lens, setPageTitle, setShareConfig])

  const handleCopy = async () => {
    if (!lens) return
    await copyTextToClipboard(renderLensContentForCopy(activeLensContent, activeVersionParams ?? []))
  }

  const handleSave = async () => {
    if (!ensureProfile()) return
    setIsSaving(true)
    try {
      await actions.saveLens()
    } finally {
      setIsSaving(false)
    }
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
    } else {
      navigate(`/lenses/${newId}`)
    }
  }

  // --- Loading / error states ---
  if (authLoading || isLoading) {
    return (
      <div className="animate-pulse flex flex-col gap-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-40 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
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
        <button
          onClick={() => navigate('/lenses')}
          className="text-primary-700 dark:text-primary-400 hover:underline"
        >
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
    <div className="flex flex-col gap-6">
      <SEOHead type="lens" data={lens} />

      {/* Header */}
      <LensDetailHeader
        lens={lens}
        onSave={handleSave}
        onEdit={() => handleEditClick(lens.id)}
        canEdit={isOwner}
        isSaved={lens.isSaved}
        isSaving={isSaving}
        saveCount={lens.reactionCounts.saved}
        onCopy={handleCopy}
        onFork={() => forkLens({})}
        canFork={hasActiveLenserProfile}
        isForking={isForking}
        onCreate={handleCreateClick}
        onExport={() => setIsExportOpen(true)}
        exportModal={
          <ExportModal
            open={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            kind="lens"
            slug={lens.id}
            title={lens.title ?? undefined}
            fetchPayload={async () => lens}
            onConfirm={runExport}
          />
        }
      />

      {/* Lens body + Execution panel row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:items-start">
        <div className="lg:col-span-7 flex flex-col gap-2 lg:h-full">
          {/* Viewer toolbar — History icon button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HelpButton path="/explanation/lenses/what-is-a-lens" label="What is a Lens?" />
              <HelpButton path="/tutorials/walkthroughs/create-a-lens" label="How to create?" />
            </div>

            <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!ensureProfile()) return
                drawerRouter.open('executions')
              }}
              title={hasActiveLenserProfile ? 'View execution history' : 'Sign in or register to view executions'}
              className="flex items-center gap-1.5 rounded-2xl border border-surface-border bg-surface-base px-3 py-2 text-xs font-medium text-greyscale-600 shadow-sm transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-50"
            >
              <ListVideo size={13} />
              <span>Executions</span>
            </button>
            <button
              type="button"
              onClick={() => { setShowVersionPicker((v) => !v); setSelectedVersionId(null) }}
              title={showVersionPicker ? 'Hide version history' : 'Show version history'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border shadow-sm transition-all ${showVersionPicker
                ? 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <History size={13} />
              <span>
                {selectedVersionId
                  ? `v${versions.find((v) => v.id === selectedVersionId)?.versionNumber ?? '?'} selected`
                  : 'Version history'}
              </span>
            </button>
            </div>
          </div>

          <LensBodyViewer
            content={activeLensContent}
            versionParams={activeVersionParams}
            onCopy={handleCopy}
            onFork={() => forkLens({})}
            canFork={hasActiveLenserProfile}
            isForking={isForking}
          />

          {/* Compact version picker — hidden by default */}
          {showVersionPicker && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
              {isLoadingVersions ? (
                <div className="flex items-center justify-center gap-2 py-5 text-xs text-gray-400">
                  <Loader2 size={13} className="animate-spin" />
                  Loading versions…
                </div>
              ) : versions.length === 0 ? (
                <div className="py-5 text-xs text-center text-gray-400">No versions found.</div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-48 overflow-y-auto">
                  {versions.map((v) => {
                    const isSelected = v.id === selectedVersionId
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVersionId(isSelected ? null : v.id)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        <span className="font-mono font-bold text-xs w-8 shrink-0">
                          v{v.versionNumber}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${v.status === 'draft'
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
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Artifact viewer — below lens body */}
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
            localMediaArtifact={lab.localMediaArtifact}
            isOwner={isOwner}
            isAuthenticatedLenser={hasActiveLenserProfile}
          />
        </div>

        <div className="lg:col-span-5 flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
          {lab.asyncMediaRunId && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary-yellow-200 bg-primary-yellow-50 px-4 py-3 text-sm dark:border-primary-yellow-800 dark:bg-primary-yellow-950">
              <Loader2 size={16} className="animate-spin shrink-0 text-primary-yellow-600 dark:text-primary-yellow-400" />
              <span className="text-primary-yellow-800 dark:text-primary-yellow-200">
                Generating media — this may take a minute…
              </span>
            </div>
          )}
          <LabExecutionPanel
            lensContent={activeLensContent}
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
            selectedModelInputModalities={selectedModelInputModalities}
            selectedModelOutputModalities={selectedModelOutputModalities}
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
            onUpdateLocalKey={funding.updateLocalKey}
            onProviderDropdownOpen={handleProviderDropdownOpen}
            chainabitState={chainabit.state}
            chainabitModels={chainabit.models}
            onChainabitConnect={chainabit.reconnect}
            isLocked={!hasActiveLenserProfile}
            onSignIn={ensureProfile}
          />
        </div>
      </div>

      {/* History row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        {/* Execution timeline — right 5 cols (offset to align with execution panel) */}
        <div className="lg:col-start-8 lg:col-span-5 border-t pt-6 border-gray-100 dark:border-gray-800 lg:border-t-0 lg:pt-0">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">History</h4>
            {lab.comparisonRunIds.length > 0 && (
              <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                {lab.comparisonRunIds.length}/2 selected
              </span>
            )}
          </div>
          <LabExecutionTimeline
            history={lab.history}
            isLoading={lab.isLoadingHistory}
            hasMore={lab.hasMoreHistory}
            selectedRunId={lab.selectedRunId}
            comparisonRunIds={lab.comparisonRunIds}
            onSelectRun={(_requestId, runId) => runId && lab.setSelectedRunId(runId)}
            onToggleComparison={lab.toggleComparison}
            onLoadMore={lab.loadMoreHistory}
            isOwner={isOwner}
            onRestoreVersion={versionExecution.restoreAndExecute}
            isAuthenticatedLenser={hasActiveLenserProfile}
          />
        </div>
      </div>

      {/* Modals */}
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


      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Lens"
        message="Are you sure you want to delete this lens? This action cannot be undone."
        confirmLabel="Delete"
        isLoading={isDeleting}
      />

      <ExecutionHistoryDrawer
        open={drawerRouter.isOpen('executions')}
        onClose={drawerRouter.close}
        lensId={id ?? ''}
        history={lab.history}
        isLoadingHistory={lab.isLoadingHistory}
        hasMoreHistory={lab.hasMoreHistory}
        loadMoreHistory={lab.loadMoreHistory}
        onSelectRun={lab.setSelectedRunId}
      />

      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Report Lens</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Why are you reporting this lens?
            </p>
            <SelectField
              value={reportReason}
              onChange={(v) => setReportReason(v as 'spam' | 'harassment' | 'misinformation' | 'off_topic' | 'other')}
              options={(['spam', 'harassment', 'misinformation', 'off_topic', 'other'] as const).map((r) => ({
                value: r,
                label: r.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
              }))}
            />
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
                  reportContent.mutate({
                    targetType: 'lens',
                    targetId: lens.id,
                    reason: reportReason,
                  })
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
