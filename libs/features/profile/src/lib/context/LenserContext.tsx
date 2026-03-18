import React, { createContext, useContext, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { lenserService, waitingListService } from '@lenserfight/data/repositories'
import { useAuth, LENSER_CACHE_KEY, WAITINGLIST_CACHE_KEY } from '@lenserfight/features/auth'
import { Lenser, CreateLenserDTO } from '@lenserfight/types'
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
  isInWaitingList: boolean | null

  loadLenserProfile: (force?: boolean) => Promise<void>
  createLenserProfile: (data: CreateLenserDTO) => Promise<Lenser>
  updateLenserProfile: (data: Partial<Lenser>) => Promise<Lenser>
  toggleWaitingList: (kvkkApproved: boolean) => Promise<void>
}

const LenserContext = createContext<LenserContextType | undefined>(undefined)

export const LenserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const cachedProfile = readCache<Lenser>(LENSER_CACHE_KEY)
  const cachedWaitingList = readCache<boolean>(WAITINGLIST_CACHE_KEY)

  // Discard cached profile if it belongs to a different user or if data is null
  const profileInitialData =
    cachedProfile?.data && user?.id && cachedProfile.data.user_id === user.id
      ? cachedProfile.data
      : undefined
  const profileInitialDataUpdatedAt = profileInitialData ? cachedProfile?.fetchedAt : undefined

  const {
    data: lenser = null,
    isLoading,
    error: queryError,
  } = useQuery<Lenser | null>({
    queryKey: queryKeys.lenser.authenticated(),
    queryFn: () => lenserService.getAuthenticatedLenser(),
    enabled: isAuthenticated && !!user,
    staleTime: 1000 * 60 * 5,
    initialData: profileInitialData,
    initialDataUpdatedAt: profileInitialDataUpdatedAt,
  })

  const { data: isInWaitingList = null } = useQuery<boolean | null>({
    queryKey: queryKeys.waitingList.status(),
    queryFn: async () => {
      const result = await waitingListService.getIsInWaitingList()
      return result ?? null
    },
    enabled: isAuthenticated && !!user,
    staleTime: 1000 * 60 * 5,
    initialData: cachedWaitingList?.data ?? undefined,
    initialDataUpdatedAt: cachedWaitingList?.fetchedAt,
  })

  useEffect(() => {
    if (lenser) writeCache(LENSER_CACHE_KEY, lenser)
  }, [lenser])

  useEffect(() => {
    if (isInWaitingList !== null && isInWaitingList !== undefined) {
      writeCache(WAITINGLIST_CACHE_KEY, isInWaitingList)
    }
  }, [isInWaitingList])

  // Invalid JWT errors (user deleted in DB) are handled centrally in AuthContext.initAuth.
  // LenserContext only surfaces the error string for UI consumers.
  const error = queryError ? (queryError as Error).message || 'Failed to load profile' : null

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

  const toggleWaitingList = async (kvkkApproved: boolean): Promise<void> => {
    await waitingListService.toggleWaitingList(kvkkApproved)
    queryClient.setQueryData(queryKeys.waitingList.status(), true)
    if (lenser) {
      queryClient.setQueryData(queryKeys.lenser.authenticated(), {
        ...lenser,
        is_in_waiting_list: true,
      })
    }
  }

  return (
    <LenserContext.Provider
      value={{
        lenser: lenser ?? null,
        hasLenser: !!lenser,
        isLoading,
        error,
        isInWaitingList: isInWaitingList ?? null,
        loadLenserProfile,
        createLenserProfile,
        updateLenserProfile,
        toggleWaitingList,
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
