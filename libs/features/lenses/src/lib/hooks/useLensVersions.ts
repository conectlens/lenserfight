import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { lensesService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { CreateLensVersionDTO, LensVersion } from '@lenserfight/types'
import { useToast } from '@lenserfight/shared/error'

const VERSIONS_PAGE_SIZE = 20

export const useLensVersions = (lensId: string, options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient()
  const { toastError } = useToast()

  const {
    data: versions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.lensVersions.list(lensId),
    queryFn: () => lensesService.getVersions(lensId),
    enabled: (options?.enabled !== false) && !!lensId,
    staleTime: 30_000,
  })

  const { mutateAsync: createVersion, isPending: isCreating } = useMutation({
    mutationFn: (input: CreateLensVersionDTO) => lensesService.createVersion(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lensVersions.list(lensId) })
    },
    onError: (err) => toastError(err),
  })

  const { mutateAsync: publishVersion, isPending: isPublishing } = useMutation({
    mutationFn: (versionId: string) => lensesService.publishVersion(versionId),
    onSuccess: (_data, versionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lensVersions.list(lensId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.lensVersions.detail(versionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.lensVersions.latestPublished(lensId) })
    },
    onError: (err) => toastError(err),
  })

  return {
    versions,
    isLoading,
    error,
    createVersion,
    isCreating,
    publishVersion,
    isPublishing,
  }
}

export const useLensVersionDetail = (versionId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.lensVersions.detail(versionId ?? ''),
    queryFn: () => lensesService.getVersionById(versionId!),
    enabled: !!versionId,
    staleTime: 60_000,
  })
}

export const useLatestPublishedVersion = (lensId: string) => {
  return useQuery({
    queryKey: queryKeys.lensVersions.latestPublished(lensId),
    queryFn: () => lensesService.getLatestPublishedVersion(lensId),
    enabled: !!lensId,
    staleTime: 60_000,
  })
}

/**
 * Paginated version list — does NOT fetch templateBody (no fn_render_version_body per row).
 * Use for list UIs (compact picker, history panel). Use useLensVersionDetail for full content.
 */
export const useLensVersionsPaginated = (lensId: string, options?: { enabled?: boolean }) => {
  const [offset, setOffset] = useState(0)
  const [pages, setPages] = useState<LensVersion[][]>([])
  const observerRef = useRef<IntersectionObserver | null>(null)

  const enabled = options?.enabled !== false && !!lensId

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.lensVersions.listPaginated(lensId, offset),
    queryFn: () => lensesService.getVersionsPaginated(lensId, VERSIONS_PAGE_SIZE, offset),
    enabled,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!data) return
    setPages((prev) => {
      const pageIndex = offset / VERSIONS_PAGE_SIZE
      const next = [...prev]
      next[pageIndex] = data
      return next
    })
  }, [data, offset])

  // Reset pages when lensId changes or hook is re-enabled
  useEffect(() => {
    setOffset(0)
    setPages([])
  }, [lensId])

  const versions = useMemo(() => pages.flat(), [pages])
  const hasMore = (data?.length ?? 0) >= VERSIONS_PAGE_SIZE

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) setOffset((o) => o + VERSIONS_PAGE_SIZE)
  }, [hasMore, isFetching])

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node || !hasMore) return
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isFetching) loadMore()
      })
      observerRef.current.observe(node)
    },
    [hasMore, isFetching, loadMore],
  )

  return {
    versions,
    isLoading: isLoading && pages.length === 0,
    isFetchingMore: isFetching && pages.length > 0,
    hasMore,
    loadMore,
    sentinelRef,
  }
}
