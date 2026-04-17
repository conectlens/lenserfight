import { useState, useEffect } from 'react'
import { Lenser } from '@lenserfight/types'
import { storage } from '@lenserfight/utils/storage'
import { useQueryClient } from '@tanstack/react-query'

const TTL_MS = 1000 * 60 // 1 minute

interface CachedCompact {
  fetchedAt: number
  profile: Lenser
  handle: string
}

export const useSidebarProfile = (handle?: string) => {
  const queryClient = useQueryClient()
  const [profile, setProfile] = useState<Lenser | null>(() => {
    if (!handle) return null

    try {
      const raw = storage.getItem(`sidebar_profile_${handle}`)
      if (!raw) return null

      const parsed = JSON.parse(raw) as CachedCompact

      // handle mismatch → discard cache
      if (!parsed || parsed.handle !== handle) return null

      return parsed.profile
    } catch {
      return null
    }
  })

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!handle) {
      setProfile(null)
      return
    }

    let mounted = true

    const load = async () => {
      const cacheKey = `sidebar_profile_${handle}`
      const cachedRaw = storage.getItem(cacheKey)

      let cached: CachedCompact | null = null

      if (cachedRaw) {
        try {
          cached = JSON.parse(cachedRaw)
        } catch {
          cached = null
        }
      }

      // If cache exists → determine freshness
      if (cached && cached.handle === handle) {
        const age = Date.now() - cached.fetchedAt
        const isFresh = age < TTL_MS

        // Use cached immediately
        setProfile(cached.profile)

        // If fresh → stop here (no DB call)
        if (isFresh) return
      }

      // Fallback to already-bootstrapped LenserContext query cache instead of issuing
      // a second profile request from the sidebar mount path.
      const cachedLenser = queryClient.getQueryData<Lenser | null>(['lenser', 'authenticated'])
      if (cachedLenser && mounted) {
        const entry: CachedCompact = {
          fetchedAt: Date.now(),
          profile: cachedLenser,
          handle,
        }
        setProfile(cachedLenser)
        storage.setItem(cacheKey, JSON.stringify(entry))
      }
      if (mounted) setIsLoading(false)
    }

    load()

    return () => {
      mounted = false
    }
  }, [handle, queryClient])

  return { profile, isLoading }
}
