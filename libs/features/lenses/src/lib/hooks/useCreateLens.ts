import { useState, useCallback } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { lensesService } from '@lenserfight/data/repositories'
import { CreateLensDTO, CreateVersionParamInput, VisibilityEnum } from '@lenserfight/types'
import { extractParams } from '@lenserfight/utils/text'
import { useAuthenticatedLenser } from './useAuthenticatedLenser'
import { useTools } from './useTools'

export const useCreateLens = () => {
  const { lenser } = useAuthenticatedLenser()
  const queryClient = useQueryClient()

  const [isOpen, setIsOpen] = useState(false)
  const { textToolId } = useTools(undefined, isOpen)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [visibility, setVisibility] = useState<VisibilityEnum>('private')
  const [versionParams, setVersionParams] = useState<CreateVersionParamInput[]>([])

  /**
   * Sync detected [[label]] tokens from content into versionParams.
   * Preserves toolId for labels already present; new labels default to the
   * system 'text' tool. No-ops if tools haven't loaded yet (textToolId
   * undefined) — the debounce in CreateLensModal will retry on next change.
   */
  const syncParamsFromContent = useCallback((rawContent: string) => {
    if (!textToolId) return
    const extracted = extractParams(rawContent)
    setVersionParams((prev) => {
      const prevMap = new Map(prev.map((p) => [p.label, p]))
      return extracted.map((ep) => {
        const existing = prevMap.get(ep.name)
        return existing ?? { label: ep.name, toolId: textToolId }
      })
    })
  }, [textToolId])

  const resetForm = useCallback(() => {
    setEditId(null)
    setTitle('')
    setContent('')
    setTags([])
    setVisibility('private')
    setVersionParams([])
    setError(null)
  }, [])

  const openModal = useCallback((initialData?: {
    id?: string
    title?: string
    content?: string
    tags?: any[]
    visibility?: VisibilityEnum
    versionParams?: CreateVersionParamInput[]
  }) => {
    if (initialData) {
      setEditId(initialData.id ?? null)
      setTitle(initialData.title ?? '')
      setContent(initialData.content ?? '')
      setTags(initialData.tags?.map((t: any) => t.name ?? t) ?? [])
      setVisibility(initialData.visibility ?? 'private')
      setVersionParams(initialData.versionParams ?? [])
    } else {
      resetForm()
    }
    setIsOpen(true)
  }, [resetForm])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    resetForm()
  }, [resetForm])

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

    // Ensure all params have a toolId; drop any that still have none
    const resolvedParams: CreateVersionParamInput[] = versionParams
      .filter((p) => p.toolId || textToolId)
      .map((p) => ({
        label: p.label,
        toolId: p.toolId || textToolId || '',
      }))

    const dto: CreateLensDTO = {
      title: trimmedTitle,
      content: trimmedContent,
      tagIds: tags,
      visibility,
      description: autoDescription,
      params: resolvedParams,
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
      versionParams,
      setVersionParams,
      syncParamsFromContent,
    },
    isSubmitting,
    error,
    submit,
    isEditMode: !!editId,
  }
}
