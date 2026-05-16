
import { queryKeys } from '@lenserfight/data/cache'
import { lenserService } from '@lenserfight/data/repositories'
import { useAuth, LENSER_CACHE_KEY } from '@lenserfight/features/auth'
import { Lenser, CreateLenserDTO } from '@lenserfight/types'
import { buildAuthReturnUrl } from '@lenserfight/utils/dom'
import { WEB_BASE_URL } from '@lenserfight/utils/env'
import { storage } from '@lenserfight/utils/storage'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import React, { createContext, useContext, useEffect, useCallback } from 'react'

import {
  clearActiveProfileCaches,
  clearAllWorkspaceCaches,
  getStoredActiveWorkspaceId,
} from '../activeProfileCache'

interface CachedEntry<T> {
  fetchedAt: number
  data: T
}

function readCache<T>(key: string): CachedEntry<T> | null {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as CachedEntry<T>
  } catch {
    return null
  }
}

function writeCache<T>(key: string, data: T): void {
  storage.setItem(key, JSON.stringify({ fetchedAt: Date.now(), data }))
}

interface LenserContextType {
  lenser: Lenser | null
  hasLenser: boolean
  isLoading: boolean
  error: string | null

  isReady: boolean
  redirectToOnboarding: (delayMs?: number) => void

  loadLenserProfile: (force?: boolean) => Promise<void>
  createLenserProfile: (data: CreateLenserDTO) => Promise<Lenser>
  updateLenserProfile: (data: Partial<Lenser>) => Promise<Lenser>
}

const LenserContext = createContext<LenserContextType | undefined>(undefined)

export const LenserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const queryClient = useQueryClient()

  const cachedProfile = readCache<Lenser>(LENSER_CACHE_KEY)
  const storedWorkspaceId = getStoredActiveWorkspaceId()

  // Accept the cached profile when:
  // 1. It belongs directly to this auth user (human profile: user_id matches), OR
  // 2. It is an owned AI workspace that the user explicitly switched to
  //    (AI profiles have user_id=null; we validate via the stored active workspace key)
  const profileInitialData =
    cachedProfile?.data && user?.id && (
      cachedProfile.data.user_id === user.id ||
      (storedWorkspaceId != null && cachedProfile.data.id === storedWorkspaceId)
    )
      ? cachedProfile.data
      : undefined
  const profileInitialDataUpdatedAt = profileInitialData ? cachedProfile?.fetchedAt : undefined

  const queryEnabled = isAuthenticated && !!user

  const {
    data: lenser = null,
    isLoading: queryIsLoading,
    error: queryError,
  } = useQuery<Lenser | null>({
    queryKey: queryKeys.lenser.authenticated(),
    queryFn: () => lenserService.getActiveLenser(),
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 5,
    initialData: profileInitialData,
    initialDataUpdatedAt: profileInitialDataUpdatedAt,
  })

  // Disabled queries (anon users) remain in React Query's 'pending' status.
  // Normalize isLoading to false so isReady resolves immediately after auth settles.
  // Also hold isLoading while auth itself is still booting to prevent "Be Lenser" flash.
  const isLoading = authLoading || (queryEnabled ? queryIsLoading : false)

  useEffect(() => {
    if (lenser) writeCache(LENSER_CACHE_KEY, lenser)
  }, [lenser])

  useEffect(() => {
    if (cachedProfile?.data && user?.id && cachedProfile.data.user_id && cachedProfile.data.user_id !== user.id) {
      // Different user logged in — wipe all workspace caches including the snapshot
      // so stale workspace selection from the previous user doesn't bleed through.
      clearAllWorkspaceCaches()
    }
  }, [cachedProfile?.data, user?.id])

  // Invalid JWT errors (user deleted in DB) are handled centrally in AuthContext.initAuth.
  // LenserContext only surfaces the error string for UI consumers.
  const error = queryError ? (queryError as Error).message || 'Failed to load profile' : null

  const isReady = !authLoading && !isLoading

  const redirectToOnboarding = useCallback((delayMs = 0) => {
    const returnUrl = encodeURIComponent(buildAuthReturnUrl(window.location.href))
    const target = `${WEB_BASE_URL}/onboarding?return_url=${returnUrl}`
    if (delayMs > 0) setTimeout(() => window.location.replace(target), delayMs)
    else window.location.replace(target)
  }, [])

  const loadLenserProfile = async (force = false): Promise<void> => {
    if (force) {
      clearActiveProfileCaches()
      await queryClient.refetchQueries({ queryKey: queryKeys.lenser.authenticated() })
    }
  }

  const createLenserProfile = async (data: CreateLenserDTO): Promise<Lenser> => {
    const profile = await lenserService.createLenserProfile(data)
    queryClient.setQueryData(queryKeys.lenser.authenticated(), profile)
    await queryClient.invalidateQueries({ queryKey: queryKeys.waitingList.status() })
    return profile
  }

  const updateLenserProfile = async (data: Partial<Lenser>): Promise<Lenser> => {
    const updated = await lenserService.updateLenserProfile(data)
    queryClient.setQueryData(queryKeys.lenser.authenticated(), updated)
    return updated
  }

  return (
    <LenserContext.Provider
      value={{
        // `lenser` is the active workspace profile, not always the human owner profile.
        lenser: lenser ?? null,
        hasLenser: !!lenser,
        isLoading,
        error,
        isReady,
        redirectToOnboarding,
        loadLenserProfile,
        createLenserProfile,
        updateLenserProfile,
      }}
    >
      {children}
    </LenserContext.Provider>
  )
}

export const useLenser = () => {
  const ctx = useContext(LenserContext)
  if (!ctx) throw new Error('useLenser must be used within LenserProvider')
  return ctx
}

export const useLenserOptional = () => useContext(LenserContext)
