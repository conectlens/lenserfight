import { useState } from 'react'
import { shareService } from '@lenserfight/data/repositories'
import { ShareResourceType } from '@lenserfight/types'

export const useShareLink = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [shortUrl, setShortUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateLink = async (
    resourceType: ShareResourceType,
    resourceId?: string,
    slug?: string,
    meta?: Record<string, any>
  ) => {
    setIsLoading(true)
    setError(null)
    setShortUrl(null)

    try {
      // Calls the idempotent service which handles 23505 via repo/edge function fallback
      const link = await shareService.createOrGetSharedLink({
        resourceType,
        resourceId,
        slug,
        meta,
      })

      const url = shareService.getShareUrl(link.short_id)
      setShortUrl(url)
      return url
    } catch (err: any) {
      setError(err.message || 'Failed to generate link')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setShortUrl(null)
    setError(null)
    setIsLoading(false)
  }

  return {
    generateLink,
    shortUrl,
    isLoading,
    error,
    reset,
  }
}
