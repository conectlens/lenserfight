import { useState, useEffect } from 'react'

import { SupabaseLenserRepository } from '../repositories/lenserRepository'
import { Lenser, LenserCompactProfile } from '../types/lenser.types'
import { storage } from '../utils/storage'

const lenserRepo = new SupabaseLenserRepository()
const TTL_MS = 1000 * 60 // 1 minute

interface CachedCompact {
  fetchedAt: number
  profile: Lenser
  handle: string
}

export const useSidebarProfile = (handle?: string) => {
  const [profile, setProfile] = useState<LenserCompactProfile | null>(() => {
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

      // Stale or missing cache → fetch fresh data
      if (!cached) setIsLoading(true)

      try {
        const fresh = await lenserRepo.getAuthenticatedLenser()
        if (mounted && fresh) {
          const entry: CachedCompact = {
            fetchedAt: Date.now(),
            profile: fresh,
            handle,
          }

          setProfile(fresh)
          storage.setItem(cacheKey, JSON.stringify(entry))
        }
      } catch (err) {
        console.warn('Failed to refresh compact profile', err)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [handle])

  return { profile, isLoading }
}
