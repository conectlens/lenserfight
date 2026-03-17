import { useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { promptsService } from '@lenserfight/data/repositories'
import { CreatePromptDTO, VisibilityEnum } from '@lenserfight/types'
import { useAuthenticatedLenser } from './useAuthenticatedLenser'

export const useCreatePrompt = () => {
  const { lenser } = useAuthenticatedLenser()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [visibility, setVisibility] = useState<VisibilityEnum>('private')

  const openModal = (initialData?: any) => {
    if (initialData) {
      setEditId(initialData.id)
      setTitle(initialData.title)
      setContent(initialData.content || '') // In real app, might need to fetch full content if list item is partial
      setTags(initialData.tags?.map((t: any) => t.name) || [])
      setVisibility(initialData.visibility || 'public')
    } else {
      resetForm()
    }
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setEditId(null)
    setTitle('')
    setContent('')
    setTags([])
    setVisibility('private')
    setError(null)
  }

  const submit = async (onSuccess?: (id: string) => void) => {
    if (!lenser) {
      setError('You must have a Lenser profile to create a prompt.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    const autoDescription =
      trimmedContent.length > 0
        ? trimmedContent.substring(0, 100) + (trimmedContent.length > 100 ? '...' : '')
        : null

    const dto: Partial<CreatePromptDTO> = {
      title: trimmedTitle,
      content: trimmedContent,
      tagIds: tags,
      visibility,
      description: autoDescription,
    }

    try {
      let resultId: string

      if (editId) {
        const updated = await promptsService.updatePrompt(editId, dto)
        resultId = updated.id
      } else {
        // @ts-ignore - full DTO required for create
        const created = await promptsService.createPrompt(dto as CreatePromptDTO)
        resultId = created.id
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.feed() })
      if (lenser?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.prompts.personal(lenser.id) })
      }
      if (editId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.prompts.detail(editId) })
      }

      if (onSuccess) onSuccess(resultId)
      closeModal()
    } catch (err: any) {
      setError(err.message || 'Failed to save prompt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    isOpen,
    openModal,
    closeModal,
    form: {
      title,
      setTitle,
      content,
      setContent,
      tags,
      setTags,
      visibility,
      setVisibility,
    },
    isSubmitting,
    error,
    submit,
    isEditMode: !!editId,
  }
}
