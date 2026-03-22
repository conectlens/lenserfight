import { useState, useCallback } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { lensesService } from '@lenserfight/data/repositories'
import { CreateLensDTO, LensParam, VisibilityEnum } from '@lenserfight/types'
import { extractParams } from '@lenserfight/utils/text'
import { useAuthenticatedLenser } from './useAuthenticatedLenser'

export const useCreateLens = () => {
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
  const [params, setParams] = useState<LensParam[]>([])

  const syncParamsFromContent = useCallback((rawContent: string) => {
    const extracted = extractParams(rawContent)
    setParams((prev) => {
      const prevMap = new Map(prev.map((p) => [p.name, p]))
      return extracted.map((ep) => prevMap.get(ep.name) ?? ep)
    })
  }, [])

  const openModal = (initialData?: any) => {
    if (initialData) {
      setEditId(initialData.id)
      setTitle(initialData.title)
      setContent(initialData.content || '')
      setTags(initialData.tags?.map((t: any) => t.name) || [])
      setVisibility(initialData.visibility || 'public')
      setParams(initialData.params ?? [])
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
    setParams([])
    setError(null)
  }

  const submit = async (onSuccess?: (id: string) => void) => {
    if (!lenser) {
      setError('You must have a Lenser profile to create a lens.')
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

    const dto: CreateLensDTO = {
      title: trimmedTitle,
      content: trimmedContent,
      tagIds: tags,
      visibility,
      description: autoDescription,
      params,
    }

    try {
      let resultId: string

      if (editId) {
        const updated = await lensesService.updateLens(editId, dto)
        resultId = updated.id
      } else {
        const created = await lensesService.createLens(dto)
        resultId = created.id
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.lenses.feed() })
      if (lenser?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.lenses.personal(lenser.id) })
      }
      if (editId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.lenses.detail(editId) })
      }

      if (onSuccess) onSuccess(resultId)
      closeModal()
    } catch (err: any) {
      setError(err.message || 'Failed to save lens.')
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
      params,
      setParams,
      syncParamsFromContent,
    },
    isSubmitting,
    error,
    submit,
    isEditMode: !!editId,
  }
}
