import { useQueryClient } from '@tanstack/react-query'
import { Lock, Pencil, Trash2 } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { ConfirmModal } from '@lenserfight/ui/modals'
import { SEOHead } from '@lenserfight/ui/components'
import { useAuth } from '@lenserfight/features/auth'
import { useShareContext } from '@lenserfight/features/share'
import { useUI } from '@lenserfight/ui/components'
import { promptsService } from '@lenserfight/data/repositories'
import { AIResultsSection } from '@lenserfight/features/generations'
import { CreateLenserProfileModal } from '@lenserfight/features/onboarding'
import { CreatePromptModal } from '../components/CreatePromptModal'
import { PromptAuthorList } from '../components/PromptAuthorList'
import { PromptBodyViewer } from '../components/PromptBodyViewer'
import { PromptDetailHeader } from '../components/PromptDetailHeader'
import { PromptRelatedList } from '../components/PromptRelatedList'
import { useAuthenticatedLenser } from '../hooks/useAuthenticatedLenser'
import { useCreatePrompt } from '../hooks/useCreatePrompt'
import { usePromptDetailController } from '../hooks/usePromptDetailController'

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

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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
  } = useCreatePrompt()

  useEffect(() => {
    if (!prompt) return
    setPageTitle(prompt.title)
    setShareConfig({
      title: prompt.title,
      resourceType: 'prompt',
      resourceId: prompt.id,
    })
  }, [prompt, setPageTitle, setShareConfig])

  const ensureProfile = (): boolean => {
    if (!hasLenser) {
      setShowProfileModal(true)
      return false
    }
    return true
  }

  const isOwner = !!(lenser && prompt && prompt.author.id === lenser.id)

  const handleCreateClick = () => {
    if (ensureProfile()) openCreateModal()
  }

  const handleDeleteClick = (targetId: string) => {
    setDeleteTargetId(targetId)
    setIsDeleteModalOpen(true)
  }

  const handleEditClick = (targetId?: string) => {
    if (!ensureProfile()) return

    const editId = targetId || prompt?.id
    if (editId && lenser) {
      promptsService.getPromptDetail(editId, lenser.id).then((detail) => {
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
  }

  const pageActions = useMemo(() => {
    if (isOwner && prompt?.id) {
      return [
        {
          label: 'Edit Prompt',
          icon: <Pencil size={16} />,
          onClick: () => handleEditClick(prompt.id),
        },
        {
          label: 'Delete Prompt',
          icon: <Trash2 size={16} />,
          onClick: () => handleDeleteClick(prompt.id),
          variant: 'danger' as const,
        },
      ]
    }
    return []
  }, [isOwner, prompt])

  useEffect(() => {
    setPageActions(pageActions)
  }, [pageActions, setPageActions])

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
    try {
      await actions.savePrompt()
    } finally {
      setIsSaving(false)
    }
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
        queryClient.invalidateQueries({ queryKey: ['prompt-composite', prompt.id] })
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
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-16 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-64 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
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
          onClick={() => navigate('/len/p')}
          className="text-primary-700 dark:text-primary-400 hover:underline"
        >
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
            <PromptBodyViewer content={prompt.content} onCopy={handleCopy} />
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
    </div>
  )
}
