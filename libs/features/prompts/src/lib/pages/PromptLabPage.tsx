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
import { ReportReasonEnum, REPORT_REASONS } from '@lenserfight/types'
import { CreateLenserProfileModal } from '@lenserfight/features/onboarding'

import { CreatePromptModal } from '../components/CreatePromptModal'
import { PromptBodyViewer } from '../components/PromptBodyViewer'
import { PromptDetailHeader } from '../components/PromptDetailHeader'
import { LabExecutionPanel } from '../components/LabExecutionPanel'
import { LabExecutionTimeline } from '../components/LabExecutionTimeline'
import { LabArtifactViewer } from '../components/LabArtifactViewer'
import { useAuthenticatedLenser } from '../hooks/useAuthenticatedLenser'
import { useCreatePrompt } from '../hooks/useCreatePrompt'
import { usePromptDetailController } from '../hooks/usePromptDetailController'
import { useLabController } from '../hooks/useLabController'
import { useForkPrompt } from '../hooks/useForkPrompt'

export const PromptLabPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { lenser, hasLenser } = useAuthenticatedLenser()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const { setShareConfig } = useShareContext()
  const { setPageActions, setPageTitle } = useUI()
  const queryClient = useQueryClient()

  const { prompt, isLoading, error, actions } = usePromptDetailController(id)

  const lab = useLabController(id ?? '', !!isAuthenticated)
  const { forkPrompt, isForking } = useForkPrompt(prompt ?? null)

  const reportContent = useReportContent()

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<
    'spam' | 'harassment' | 'misinformation' | 'off_topic' | 'other'
  >('spam')

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
    if (!isOwner && prompt?.id && hasLenser) {
      return [
        {
          label: 'Report Prompt',
          icon: <Flag size={16} />,
          onClick: () => setIsReportOpen(true),
          variant: 'danger' as const,
        },
      ]
    }
    return []
  }, [isOwner, prompt, hasLenser])

  useEffect(() => {
    setPageActions(pageActions)
  }, [pageActions, setPageActions])

  const handleCopy = async () => {
    if (!prompt || !ensureProfile() || !lenser) return
    try {
      await navigator.clipboard.writeText(prompt.content)
      await actions.copyPrompt()
    } catch {}
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
    <div className="flex flex-col gap-6">
      <SEOHead type="prompt" data={prompt} />

      {/* Header */}
      <PromptDetailHeader
        prompt={prompt}
        onSave={handleSave}
        onEdit={() => handleEditClick(prompt.id)}
        canEdit={isOwner}
        isSaved={prompt.isSaved}
        isSaving={isSaving}
        saveCount={prompt.reactionCounts.saved}
      />

      {/* Prompt body + Execution panel row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <PromptBodyViewer
            content={prompt.content}
            onCopy={handleCopy}
            onFork={() => forkPrompt()}
            isForking={isForking}
          />
        </div>
        <div className="lg:col-span-5">
          <LabExecutionPanel
            promptId={prompt.id}
            promptContent={prompt.content}
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
            params={prompt.params}
          />
        </div>
      </div>

      {/* Output + History row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        {/* Artifact viewer — left 7 cols */}
        <div className="lg:col-span-7 border-t pt-6 border-gray-100 dark:border-gray-800 lg:border-t-0 lg:pt-0">
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
          />
        </div>

        {/* Execution timeline — right 5 cols */}
        <div className="lg:col-span-5 border-t pt-6 border-gray-100 dark:border-gray-800 lg:border-t-0 lg:pt-0">
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
            onSelectRun={lab.setSelectedRunId}
            onToggleComparison={lab.toggleComparison}
            onLoadMore={lab.loadMoreHistory}
          />
        </div>
      </div>

      {/* Modals */}
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

      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Report Prompt</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Why are you reporting this prompt?
            </p>
            <select
              value={reportReason}
              onChange={(e) =>
                setReportReason(
                  e.target.value as 'spam' | 'harassment' | 'misinformation' | 'off_topic' | 'other'
                )
              }
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
                  reportContent.mutate({
                    targetType: 'prompt_template',
                    targetId: prompt.id,
                    reason: reportReason,
                  })
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
