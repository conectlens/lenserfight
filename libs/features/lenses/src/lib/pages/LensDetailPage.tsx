import { useQueryClient } from '@tanstack/react-query'
import { Lock, Pencil, Trash2, Flag } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { ConfirmModal } from '@lenserfight/ui/modals'
import { SEOHead } from '@lenserfight/ui/components'
import { useAuth } from '@lenserfight/features/auth'
import { useShareContext } from '@lenserfight/features/share'
import { useUI } from '@lenserfight/ui/components'
import { lensesService } from '@lenserfight/data/repositories'
import { useReportContent } from '@lenserfight/features/home'
import { ReportReasonEnum } from '@lenserfight/types'
import { AIResultsSection, AIProviderModelSelect } from '@lenserfight/features/generations'
import { CreateLenserProfileModal } from '@lenserfight/features/onboarding'
import { CreateLensModal } from '../components/CreateLensModal'
import { LensAuthorList } from '../components/LensAuthorList'
import { LensBodyViewer } from '../components/LensBodyViewer'
import { LensDetailHeader } from '../components/LensDetailHeader'
import { LensRelatedList } from '../components/LensRelatedList'
import { LensVersionHistoryPanel } from '../components/LensVersionHistoryPanel'
import { CreateLensVersionModal } from '../components/CreateLensVersionModal'
import { ResourceAttachmentsPanel } from '../components/ResourceAttachmentsPanel'
import { useAuthenticatedLenser } from '../hooks/useAuthenticatedLenser'
import { useCreateLens } from '../hooks/useCreateLens'
import { useLensDetailController } from '../hooks/useLensDetailController'
import { useLensVersions, useLensVersionDetail } from '../hooks/useLensVersions'
import { useVersionResources, useResourceAttachments } from '../hooks/useResourceAttachments'

export const LensDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { lenser, hasLenser } = useAuthenticatedLenser()
  const { isLoading: authLoading } = useAuth()
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

  const [selectedProviderKey, setSelectedProviderKey] = useState('')
  const [selectedModelKey, setSelectedModelKey] = useState('')

  // Versioning state
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false)

  const { versions, isLoading: isLoadingVersions, createVersion, isCreating: isCreatingVersion, publishVersion, isPublishing } =
    useLensVersions(id ?? '')
  const { data: selectedVersion } = useLensVersionDetail(selectedVersionId)

  // Resources for selected version
  const { data: versionResources = [], isLoading: isLoadingResources } = useVersionResources(selectedVersionId)
  const { uploadAndAttach, detachResource, uploadProgress: rawUploadProgress } = useResourceAttachments(selectedVersionId)
  const uploadProgress = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(rawUploadProgress).map(([k, s]) => [
          k,
          { status: s, percent: s === 'done' ? 100 : s === 'uploading' ? 50 : 0 },
        ])
      ),
    [rawUploadProgress]
  )

  const handleProviderChange = (key: string) => {
    setSelectedProviderKey(key)
    setSelectedModelKey('')
  }

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
      lensesService.getLensDetail(editId, lenser.id).then((detail) => {
        if (detail) openCreateModal({ id: detail.id, title: detail.title, content: detail.content, tags: detail.tags, visibility: detail.visibility })
      })
    }
  }

  const handleCopy = async () => {
    if (!lens || !ensureProfile() || !lenser) return
    try {
      await navigator.clipboard.writeText(lens.content)
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
    } else {
      navigate(`/lenses/${newId}`)
    }
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
            />
          </div>

          <div className="mb-8">
            <LensBodyViewer
              content={selectedVersion?.templateBody ?? lens.content}
              onCopy={handleCopy}
            />
          </div>

          <div className="max-w-[860px] mx-auto mb-6">
            <AIProviderModelSelect
              providerKey={selectedProviderKey}
              modelKey={selectedModelKey}
              onProviderChange={handleProviderChange}
              onModelChange={setSelectedModelKey}
            />
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
          <LensVersionHistoryPanel
            versions={versions}
            selectedVersionId={selectedVersionId}
            onVersionSelect={setSelectedVersionId}
            onCreateVersion={() => setIsCreateVersionOpen(true)}
            onPublishVersion={publishVersion}
            isPublishing={isPublishing}
            isOwner={isOwner}
            isLoading={isLoadingVersions}
          />

          {selectedVersionId && (
            <ResourceAttachmentsPanel
              resources={versionResources}
              isOwner={isOwner}
              onUploadAndAttach={async (file, key) => { await uploadAndAttach(file, key) }}
              onDetach={detachResource}
              uploadProgress={uploadProgress}
              isLoading={isLoadingResources}
            />
          )}

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
      />

      <CreateLensVersionModal
        isOpen={isCreateVersionOpen}
        onClose={() => setIsCreateVersionOpen(false)}
        onSubmit={async (data) => {
          await createVersion({
            lensId: lens.id,
            templateBody: data.templateBody,
            changelog: data.changelog || null,
            parameters: data.parameters,
          })
          setIsCreateVersionOpen(false)
        }}
        isSubmitting={isCreatingVersion}
        initialContent={lens.content}
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
