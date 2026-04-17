import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useMemo, useState } from 'react'

import { useAuth } from '@lenserfight/features/auth'
import { analyticsService } from '@lenserfight/infra/analytics'
import { lensesService } from '@lenserfight/data/repositories'
import { tagService } from '@lenserfight/data/repositories'
import {
  LensDetailViewModel,
  LensViewModel,
} from '@lenserfight/types'
import { useAuthenticatedLenser } from './useAuthenticatedLenser'

interface UseLensDetailControllerOptions {
  includeRelated?: boolean
}

export const useLensDetailController = (
  lensId?: string,
  options: UseLensDetailControllerOptions = {}
) => {
  const { includeRelated = true } = options
  const { lenser, isLoading: isLenserLoading } = useAuthenticatedLenser()
  const { user, isLoading: isAuthLoading } = useAuth()
  const queryClient = useQueryClient()
  const loggedLensViews = useRef(new Set<string>())
  const [loadSecondaryLists, setLoadSecondaryLists] = useState(false)

  const {
    data: lens,
    isLoading: isLoadingLens,
    error: lensError,
  } = useQuery<LensDetailViewModel | null, Error>({
    queryKey: ['lens-core', lensId],
    queryFn: async () => {
      if (!lensId) {
        return null
      }

      const lensDetail = await lensesService.getLensDetail(lensId, lenser?.id)
      if (!lensDetail) throw new Error('404')
      return lensDetail
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
    if (!lens || !includeRelated) return
    // Keep detail on critical path and defer related collections.
    const id = window.setTimeout(() => setLoadSecondaryLists(true), 0)
    return () => window.clearTimeout(id)
  }, [lens, includeRelated])

  const { data: relatedLenses = [] } = useQuery<LensViewModel[]>({
    queryKey: ['lens-related', lensId],
    queryFn: () => lensesService.getRelatedLenses(lensId!),
    enabled: !!lensId && !!lens && includeRelated && loadSecondaryLists,
    staleTime: 1000 * 60 * 5,
  })

  const { data: authorLensesRaw = [] } = useQuery<LensViewModel[]>({
    queryKey: ['lens-author-list', lensId, lens?.author?.handle, lenser?.id],
    queryFn: () => lensesService.getAuthorLenses(lens!.author.handle, 0, 10, lenser?.id),
    enabled: !!lensId && !!lens?.author?.handle && includeRelated && loadSecondaryLists,
    staleTime: 1000 * 60 * 5,
  })

  const authorLenses = useMemo(
    () => authorLensesRaw.filter((p) => p.id !== lensId).slice(0, 5),
    [authorLensesRaw, lensId]
  )

  useEffect(() => {
    if (!lens || !lensId) return

    if (loggedLensViews.current.has(lensId)) return
    loggedLensViews.current.add(lensId)

    analyticsService.trackView('lens', lensId, {
      userId: user?.id,
      lenserId: lenser?.id,
    })

    const tagIds = lens.tags.map((t) => t.id)
    if (tagIds.length > 0) {
      tagService.recordBatchView(tagIds, 'lens', lensId, lenser?.id)
    }
  }, [lens, lensId, lenser?.id, user?.id])

  // Actions
  const updateLocalLens = (
    updater: (prev: LensDetailViewModel) => LensDetailViewModel
  ) => {
    queryClient.setQueryData<LensDetailViewModel | null>(['lens-core', lensId], (old) => {
      if (!old) return old
      return updater(old)
    })
  }

  const copyLens = async () => {
    if (!lens || !lenser) return
    await lensesService.toggleReaction(lens.id, lenser.id, 'copy')
    updateLocalLens((prev) => ({
      ...prev,
      reactionCounts: {
        ...prev.reactionCounts,
        copy: prev.reactionCounts.copy + 1,
      },
    }))
  }

  const saveLens = async (): Promise<boolean> => {
    if (!lens || !lenser) return false

    const res = await lensesService.toggleReaction(lens.id, lenser.id, 'saved')

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

    return res?.added ?? !lens.isSaved
  }

  return {
    lens: lens || null,
    relatedLenses,
    authorLenses,
    isLoading: isLoadingLens || isLenserLoading,
    error: lensError ? lensError.message : null,
    actions: {
      copyLens,
      saveLens,
    },
  }
}
