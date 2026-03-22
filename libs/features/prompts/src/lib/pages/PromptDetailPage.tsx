import { useQueryClient } from '@tanstack/react-query'
import { Lock, Pencil, Trash2, Flag } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { ConfirmModal } from '@lenserfight/ui/modals'
import { SEOHead } from '@lenserfight/ui/components'
import { useAuth } from '@lenserfight/features/auth'
import { useShareContext } from '@lenserfight/features/share'
import { useUI } from '@lenserfight/ui/components'
import { promptsService } from '@lenserfight/data/repositories'
import { useReportContent } from '@lenserfight/features/home'
import { ReportReasonEnum } from '@lenserfight/types'
import { AIResultsSection, AIProviderModelSelect } from '@lenserfight/features/generations'
import { CreateLenserProfileModal } from '@lenserfight/features/onboarding'
import { CreatePromptModal } from '../components/CreatePromptModal'
import { PromptAuthorList } from '../components/PromptAuthorList'
import { PromptBodyViewer } from '../components/PromptBodyViewer'
import { PromptDetailHeader } from '../components/PromptDetailHeader'
import { PromptRelatedList } from '../components/PromptRelatedList'
import { VersionHistoryPanel } from '../components/VersionHistoryPanel'
import { CreateVersionModal } from '../components/CreateVersionModal'
import { ResourceAttachmentsPanel } from '../components/ResourceAttachmentsPanel'
import { useAuthenticatedLenser } from '../hooks/useAuthenticatedLenser'
import { useCreatePrompt } from '../hooks/useCreatePrompt'
import { usePromptDetailController } from '../hooks/usePromptDetailController'
import { usePromptVersions, usePromptVersionDetail } from '../hooks/usePromptVersions'
import { useVersionResources, useResourceAttachments } from '../hooks/useResourceAttachments'

export const PromptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { lenser, hasLenser } = useAuthenticatedLenser()
  const { isLoading: authLoading } = useAuth()
  const { setShareConfig } = useShareContext()
  const { setPageActions, setPageTitle } = useUI()
  const queryClient = useQueryClient()

  const { prompt, relatedPrompts, authorPrompts, isLoading, error, actions } =
    usePromptDetailController(id)

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
    usePromptVersions(id ?? '')
  const { data: selectedVersion } = usePromptVersionDetail(selectedVersionId)

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
  } = useCreatePrompt()

  const isOwner = !!(lenser && prompt && prompt.author.id === lenser.id)

  const ensureProfile = (): boolean => {
    if (!hasLenser) { setShowProfileModal(true); return false }
    return true
  }

  useEffect(() => {
    if (!prompt) return
    setPageTitle(prompt.title)
    setShareConfig({ title: prompt.title, resourceType: 'prompt', resourceId: prompt.id })
  }, [prompt, setPageTitle, setShareConfig])

  const pageActions = useMemo(() => {
    if (isOwner && prompt?.id) {
      return [
        { label: 'Edit Prompt', icon: <Pencil size={16} />, onClick: () => handleEditClick(prompt.id) },
        { label: 'Delete Prompt', icon: <Trash2 size={16} />, onClick: () => handleDeleteClick(prompt.id), variant: 'danger' as const },
      ]
    }
    if (!isOwner && prompt?.id && hasLenser) {
      return [
        { label: 'Report Prompt', icon: <Flag size={16} />, onClick: () => setIsReportOpen(true), variant: 'danger' as const },
      ]
    }
    return []
  }, [isOwner, prompt, hasLenser])

  useEffect(() => { setPageActions(pageActions) }, [pageActions, setPageActions])

  const handleCreateClick = () => { if (ensureProfile()) openCreateModal() }

  const handleDeleteClick = (targetId: string) => {
    setDeleteTargetId(targetId)
    setIsDeleteModalOpen(true)
  }

  const handleEditClick = (targetId?: string) => {
    if (!ensureProfile()) return
    const editId = targetId || prompt?.id
    if (editId && lenser) {
      promptsService.getPromptDetail(editId, lenser.id).then((detail) => {
        if (detail) openCreateModal({ id: detail.id, title: detail.title, content: detail.content, tags: detail.tags, visibility: detail.visibility })
      })
    }
  }

  const handleCopy = async () => {
    if (!prompt || !ensureProfile() || !lenser) return
    try {
      await navigator.clipboard.writeText(prompt.content)
      await actions.copyPrompt()
    } catch { }
  }

  const handleSave = async () => {
    if (!ensureProfile()) return
    setIsSaving(true)
    try { await actions.savePrompt() } finally { setIsSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTargetId || !lenser) return
    setIsDeleting(true)
    try {
      await promptsService.deletePrompt(deleteTargetId, lenser.id)
      setIsDeleteModalOpen(false)
      if (prompt && deleteTargetId === prompt.id) {
        navigate('/len/p')
      } else {
        queryClient.invalidateQueries({ queryKey: ['prompt-list'] })
        queryClient.invalidateQueries({ queryKey: ['prompt-composite', prompt?.id] })
      }
    } finally {
      setIsDeleting(false)
      setDeleteTargetId(null)
    }
  }

  const handleCreateSubmit = (newId: string) => {
    if (isEditMode && prompt && newId === prompt.id) {
      queryClient.invalidateQueries({ queryKey: ['prompt-composite', prompt.id] })
    } else {
      navigate(`/len/p/${newId}`)
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
        <button onClick={() => navigate('/len/p')} className="text-primary-700 dark:text-primary-400 hover:underline">
          Return to Library
        </button>
      </div>
    )
  }

  if (!prompt || error === '404') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Prompt Not Found</h2>
        <button onClick={() => navigate('/len/p')} className="text-primary hover:underline">
          Return to Library
        </button>
      </div>
    )
  }

  return (
    <div>
      <SEOHead type="prompt" data={prompt} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          <div className="max-w-[860px] mx-auto">
            <PromptDetailHeader
              prompt={prompt}
              onSave={handleSave}
              onEdit={() => handleEditClick(prompt.id)}
              canEdit={isOwner}
              isSaved={prompt.isSaved}
              isSaving={isSaving}
              saveCount={prompt.reactionCounts.saved}
            />
          </div>

          <div className="mb-8">
            <PromptBodyViewer
              content={selectedVersion?.templateBody ?? prompt.content}
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
            <AIResultsSection promptId={prompt.id} />
          </div>
        </div>

        <div className="lg:col-span-4 border-t lg:border-t-0 border-gray-100 dark:border-gray-800 pt-8 lg:pt-0">
          <PromptAuthorList
            prompts={authorPrompts}
            authorName={prompt.author.displayName}
            onOpen={(id) => navigate(`/len/p/${id}`)}
            isLoading={isLoading}
            onCreateClick={handleCreateClick}
            isOwner={isOwner}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
          <VersionHistoryPanel
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
              onUploadAndAttach={(file, key) => uploadAndAttach(file, key)}
              onDetach={detachResource}
              uploadProgress={uploadProgress}
              isLoading={isLoadingResources}
            />
          )}

          <PromptRelatedList
            prompts={relatedPrompts}
            onOpen={(id) => navigate(`/len/p/${id}`)}
            isLoading={isLoading}
          />
        </div>
      </div>

      <CreatePromptModal
        isOpen={isCreateOpen}
        onClose={closeCreateModal}
        onSubmit={() => submitCreate(handleCreateSubmit)}
        form={createForm}
        isSubmitting={isCreateSubmitting}
        error={createError}
        isEditMode={isEditMode}
      />

      <CreateVersionModal
        isOpen={isCreateVersionOpen}
        onClose={() => setIsCreateVersionOpen(false)}
        onSubmit={async (data) => {
          await createVersion({
            promptId: prompt.id,
            templateBody: data.templateBody,
            changelog: data.changelog || null,
            parameters: data.parameters,
          })
          setIsCreateVersionOpen(false)
        }}
        isSubmitting={isCreatingVersion}
        initialContent={prompt.content}
      />

      {showProfileModal && <CreateLenserProfileModal onClose={() => setShowProfileModal(false)} />}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Prompt"
        message="Are you sure you want to delete this prompt? This action cannot be undone."
        confirmLabel="Delete"
        isLoading={isDeleting}
      />

      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Report Prompt</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Why are you reporting this prompt?</p>
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
                  reportContent.mutate({ targetType: 'prompt_template', targetId: prompt.id, reason: reportReason })
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
