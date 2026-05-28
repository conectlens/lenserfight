import { useQuery } from '@tanstack/react-query'
import { mediaService } from '@lenserfight/data/repositories'
import type { MediaObject, UnifiedMediaType } from '@lenserfight/types'
import { useState, useMemo } from 'react'

import { useAuthenticatedLenser } from './useAuthenticatedLenser'

export type MediaTypeFilter = UnifiedMediaType | 'all'

export const useMediaGallery = () => {
  const { lenser } = useAuthenticatedLenser()
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: allMedia = [], isLoading } = useQuery<MediaObject[]>({
    queryKey: ['media', 'gallery', lenser?.id],
    queryFn: () => mediaService.getByOwner(lenser!.id),
    enabled: !!lenser?.id,
    staleTime: 30_000,
  })

  const filtered = useMemo(() => {
    let result = allMedia
    if (typeFilter !== 'all') {
      result = result.filter((m) => m.mediaType === typeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.mimeType?.toLowerCase().includes(q),
      )
    }
    return result
  }, [allMedia, typeFilter, searchQuery])

  return {
    media: filtered,
    allMedia,
    isLoading,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
  }
}
