import React, { createContext, useContext, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@lenserfight/data/cache'
import { lenserService } from '@lenserfight/data/repositories'
import { useAuth, LENSER_CACHE_KEY } from '@lenserfight/features/auth'
import { Lenser, CreateLenserDTO } from '@lenserfight/types'
import { buildAuthReturnUrl } from '@lenserfight/utils/dom'
import { storage } from '@lenserfight/utils/storage'

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

  // Discard cached profile if it belongs to a different user or if data is null
  const profileInitialData =
    cachedProfile?.data && user?.id && cachedProfile.data.user_id === user.id
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
    queryFn: () => lenserService.getAuthenticatedLenser(),
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

  // Invalid JWT errors (user deleted in DB) are handled centrally in AuthContext.initAuth.
  // LenserContext only surfaces the error string for UI consumers.
  const error = queryError ? (queryError as Error).message || 'Failed to load profile' : null

  const isReady = !authLoading && !isLoading

  const redirectToOnboarding = useCallback((delayMs = 0) => {
    const authAppUrl = import.meta.env.VITE_AUTH_BASE_URL ?? 'https://auth.lenserfight.com'
    const returnUrl = encodeURIComponent(buildAuthReturnUrl(window.location.href))
    const target = `${authAppUrl}/onboarding?return_url=${returnUrl}`
    if (delayMs > 0) setTimeout(() => window.location.replace(target), delayMs)
    else window.location.replace(target)
  }, [])

  const loadLenserProfile = async (force = false): Promise<void> => {
    if (force) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.lenser.authenticated() })
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
