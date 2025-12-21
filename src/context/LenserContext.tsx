import React, { createContext, useContext, useState, useEffect } from 'react'

import { lenserService } from '../services/lenserService'
import { waitingListService } from '../services/waitingListService'
import { Lenser, CreateLenserDTO } from '../types/lenser.types'
import { storage } from '../utils/storage'

import { useAuth } from './AuthContext'

const CACHE_BASE_KEY = 'lenser_profile_cache_v1'
const CACHE_TTL_MS = 1000 * 60 * 5

interface LenserCacheEntry {
  userId: string
  profile: Lenser
  fetchedAt: number
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

const getCacheKey = (userId: string) => `${CACHE_BASE_KEY}_${userId}`

const readCachedProfile = (userId: string): LenserCacheEntry | null => {
  try {
    const raw = storage.getItem(getCacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as LenserCacheEntry
    if (!parsed || parsed.userId !== userId || !parsed.profile?.id) return null
    return parsed
  } catch {
    return null
  }
}

const writeCachedProfile = (userId: string, profile: Lenser) => {
  try {
    storage.setItem(
      getCacheKey(userId),
      JSON.stringify({
        userId,
        profile: { ...profile, user_id: userId },
        fetchedAt: Date.now(),
      })
    )
  } catch { }
}

const clearCache = (userId?: string | null) => {
  if (!userId) return
  storage.removeItem(getCacheKey(userId))
}

export const LenserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth()

  const [lenser, setLenser] = useState<Lenser | null>(null)
  const [isInWaitingList, setIsInWaitingList] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLenserProfile = async (force = false): Promise<void> => {
    if (!user || !isAuthenticated) return
    const userId = user.id

    if (!force && lenser) return

    const cached = readCachedProfile(userId)
    if (!force && cached) {
      setLenser({ ...cached.profile, user_id: userId })
      if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) return
    }

    setIsLoading(true)
    setError(null)

    try {
      const profile = await lenserService.getAuthenticatedLenser()
      if (profile) {
        const safeProfile = { ...profile, user_id: userId }
        setLenser(safeProfile)
        writeCachedProfile(userId, safeProfile)
      } else {
        setLenser(null)
        clearCache(userId)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshWaitingListStatus = async () => {
    if (!isAuthenticated || !user) return
    try {
      const value = await waitingListService.getIsInWaitingList()
      setIsInWaitingList(value)
    } catch {
      setIsInWaitingList(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      const cached = readCachedProfile(user.id)
      if (cached) setLenser({ ...cached.profile, user_id: user.id })
      loadLenserProfile()
      refreshWaitingListStatus()
    } else {
      clearCache(user?.id)
      setLenser(null)
      setIsInWaitingList(null)
      setIsLoading(false)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id])

  const createLenserProfile = async (data: CreateLenserDTO): Promise<Lenser> => {
    if (!user) throw new Error('User not authenticated')
    setIsLoading(true)

    try {
      const profile = await lenserService.createLenserProfile(data)
      setLenser(profile)
      writeCachedProfile(user.id, profile)
      await refreshWaitingListStatus()
      return profile
    } finally {
      setIsLoading(false)
    }
  }

  const updateLenserProfile = async (data: Partial<Lenser>): Promise<Lenser> => {
    if (!user || !lenser) throw new Error('Invalid state')

    const updated = await lenserService.updateLenserProfile(data)
    const safe = { ...updated, user_id: user.id }
    setLenser(safe)
    writeCachedProfile(user.id, safe)
    return safe
  }

  const toggleWaitingList = async (kvkkApproved: boolean) => {
    await waitingListService.toggleWaitingList(kvkkApproved)
    setIsInWaitingList(true)

    if (lenser && user) {
      const updated = { ...lenser, is_in_waiting_list: true }
      setLenser(updated)
      writeCachedProfile(user.id, updated)
    }
  }

  return (
    <LenserContext.Provider
      value={{
        lenser,
        hasLenser: !!lenser,
        isLoading,
        error,
        isInWaitingList,
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
