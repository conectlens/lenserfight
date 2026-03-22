import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useMemo } from 'react'

import { useAuth } from '@lenserfight/features/auth'
import { analyticsService } from '@lenserfight/infra/analytics'
import { promptsService } from '@lenserfight/data/repositories'
import { tagService } from '@lenserfight/data/repositories'
import {
  PromptTemplateDetailViewModel,
  PromptTemplateViewModel,
} from '@lenserfight/types'
import { useAuthenticatedLenser } from './useAuthenticatedLenser'

interface PromptDetailData {
  prompt: PromptTemplateDetailViewModel | null
  relatedPrompts: PromptTemplateViewModel[]
  authorPrompts: PromptTemplateViewModel[]
}

export const usePromptDetailController = (promptId?: string) => {
  const { lenser } = useAuthenticatedLenser()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const loggedPromptViews = useRef(new Set<string>())

  const promptCompositeKey = useMemo(
    () => ['prompt-composite', promptId, { viewerId: lenser?.id }],
    [promptId, lenser?.id]
  )

  const { data, isLoading, error } = useQuery<PromptDetailData, Error>({
    queryKey: promptCompositeKey,
    queryFn: async () => {
      if (!promptId) {
        return { prompt: null, relatedPrompts: [], authorPrompts: [] }
      }

      const prompt = await promptsService.getPromptDetail(promptId, lenser?.id)
      if (!prompt) throw new Error('404')

      const [related, authorP] = await Promise.all([
        promptsService.getRelatedPrompts(promptId),
        promptsService.getAuthorPrompts(prompt.author.handle, 0, 10, lenser?.id),
      ])

      return {
        prompt,
        relatedPrompts: related,
        authorPrompts: authorP.filter((p) => p.id !== promptId).slice(0, 5),
      }
    },
    enabled: !!promptId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error) => {
      if (error.message === '401' || error.message === '404') return false
      return failureCount < 2
    },
  })

  useEffect(() => {
    if (!data?.prompt || !promptId) return

    if (loggedPromptViews.current.has(promptId)) return
    loggedPromptViews.current.add(promptId)

    analyticsService.trackView('prompt', promptId, {
      userId: user?.id,
      lenserId: lenser?.id,
    })

    const tagIds = data.prompt.tags.map((t) => t.id)
    if (tagIds.length > 0) {
      tagService.recordBatchView(tagIds, 'prompt', promptId, lenser?.id)
    }
  }, [data?.prompt, promptId, lenser?.id, user?.id])

  // Actions
  const updateLocalPrompt = (
    updater: (prev: PromptTemplateDetailViewModel) => PromptTemplateDetailViewModel
  ) => {
    queryClient.setQueryData<PromptDetailData>(promptCompositeKey, (old) => {
      if (!old || !old.prompt) return old
      return { ...old, prompt: updater(old.prompt) }
    })
  }

  const copyPrompt = async () => {
    if (!data?.prompt || !lenser) return
    await promptsService.toggleReaction(data.prompt.id, lenser.id, 'copy')
    updateLocalPrompt((prev) => ({
      ...prev,
      reactionCounts: {
        ...prev.reactionCounts,
        copy: prev.reactionCounts.copy + 1,
      },
    }))
  }

  const savePrompt = async (): Promise<boolean> => {
    if (!data?.prompt || !lenser) return false

    const res = await promptsService.toggleReaction(data.prompt.id, lenser.id, 'saved')

    updateLocalPrompt((prev) => {
      const wasSaved = !!prev.isSaved
      const nowSaved = !wasSaved
      const prevCount = prev.reactionCounts?.saved ?? 0

      return {
        ...prev,
        isSaved: nowSaved,
        reactionCounts: {
          ...prev.reactionCounts,
          saved: nowSaved
            ? prevCount + 1 // save ekleniyorsa +1
            : Math.max(0, prevCount - 1), // kaldırılıyorsa -1
        },
      }
    })

    return res?.added ?? !data.prompt.isSaved
  }

  return {
    prompt: data?.prompt || null,
    relatedPrompts: data?.relatedPrompts || [],
    authorPrompts: data?.authorPrompts || [],
    isLoading,
    error: error ? error.message : null,
    actions: {
      copyPrompt,
      savePrompt,
    },
  }
}
