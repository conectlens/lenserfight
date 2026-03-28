import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useMemo } from 'react'

import { useAuth } from '@lenserfight/features/auth'
import { analyticsService } from '@lenserfight/infra/analytics'
import { lensesService } from '@lenserfight/data/repositories'
import { tagService } from '@lenserfight/data/repositories'
import {
  LensDetailViewModel,
  LensViewModel,
} from '@lenserfight/types'
import { useAuthenticatedLenser } from './useAuthenticatedLenser'

interface LensDetailData {
  lens: LensDetailViewModel | null
  relatedLenses: LensViewModel[]
  authorLenses: LensViewModel[]
}

export const useLensDetailController = (lensId?: string) => {
  const { lenser, isLoading: isLenserLoading } = useAuthenticatedLenser()
  const { user, isLoading: isAuthLoading } = useAuth()
  const queryClient = useQueryClient()
  const loggedLensViews = useRef(new Set<string>())

  const lensCompositeKey = useMemo(
    () => ['lens-composite', lensId, { viewerId: lenser?.id }],
    [lensId, lenser?.id]
  )

  const { data, isLoading, error } = useQuery<LensDetailData, Error>({
    queryKey: lensCompositeKey,
    queryFn: async () => {
      if (!lensId) {
        return { lens: null, relatedLenses: [], authorLenses: [] }
      }

      const lens = await lensesService.getLensDetail(lensId, lenser?.id)
      if (!lens) throw new Error('404')

      const [related, authorP] = await Promise.all([
        lensesService.getRelatedLenses(lensId),
        lensesService.getAuthorLenses(lens.author.handle, 0, 10, lenser?.id),
      ])

      return {
        lens,
        relatedLenses: related,
        authorLenses: authorP.filter((p) => p.id !== lensId).slice(0, 5),
      }
    },
    enabled: !!lensId && !isAuthLoading && !isLenserLoading,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error) => {
      if (error.message === '401' || error.message === '404') return false
      return failureCount < 2
    },
  })

  useEffect(() => {
    if (!data?.lens || !lensId) return

    if (loggedLensViews.current.has(lensId)) return
    loggedLensViews.current.add(lensId)

    analyticsService.trackView('lens', lensId, {
      userId: user?.id,
      lenserId: lenser?.id,
    })

    const tagIds = data.lens.tags.map((t) => t.id)
    if (tagIds.length > 0) {
      tagService.recordBatchView(tagIds, 'lens', lensId, lenser?.id)
    }
  }, [data?.lens, lensId, lenser?.id, user?.id])

  // Actions
  const updateLocalLens = (
    updater: (prev: LensDetailViewModel) => LensDetailViewModel
  ) => {
    queryClient.setQueryData<LensDetailData>(lensCompositeKey, (old) => {
      if (!old || !old.lens) return old
      return { ...old, lens: updater(old.lens) }
    })
  }

  const copyLens = async () => {
    if (!data?.lens || !lenser) return
    await lensesService.toggleReaction(data.lens.id, lenser.id, 'copy')
    updateLocalLens((prev) => ({
      ...prev,
      reactionCounts: {
        ...prev.reactionCounts,
        copy: prev.reactionCounts.copy + 1,
      },
    }))
  }

  const saveLens = async (): Promise<boolean> => {
    if (!data?.lens || !lenser) return false

    const res = await lensesService.toggleReaction(data.lens.id, lenser.id, 'saved')

    updateLocalLens((prev) => {
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

    return res?.added ?? !data.lens.isSaved
  }

  return {
    lens: data?.lens || null,
    relatedLenses: data?.relatedLenses || [],
    authorLenses: data?.authorLenses || [],
    isLoading: isLoading || isLenserLoading,
    error: error ? error.message : null,
    actions: {
      copyLens,
      saveLens,
    },
  }
}
