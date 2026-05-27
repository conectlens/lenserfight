import { lenserService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth/native'
import type { CreateLenserDTO, Lenser } from '@lenserfight/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import React, { createContext, useCallback, useContext } from 'react'

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
const authenticatedLenserKey = ['mobile', 'lenser', 'authenticated'] as const

export const LenserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const queryClient = useQueryClient()

  const {
    data: lenser = null,
    isLoading: profileLoading,
    error,
  } = useQuery<Lenser | null>({
    queryKey: authenticatedLenserKey,
    queryFn: () => lenserService.getAuthenticatedLenser(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  })

  const loadLenserProfile = useCallback(
    async (force = false) => {
      if (force) {
        await queryClient.invalidateQueries({ queryKey: authenticatedLenserKey })
      }
      await queryClient.refetchQueries({ queryKey: authenticatedLenserKey })
    },
    [queryClient]
  )

  const createLenserProfile = useCallback(
    async (data: CreateLenserDTO) => {
      const profile = await lenserService.createLenserProfile(data)
      queryClient.setQueryData(authenticatedLenserKey, profile)
      return profile
    },
    [queryClient]
  )

  const updateLenserProfile = useCallback(
    async (data: Partial<Lenser>) => {
      const profile = await lenserService.updateLenserProfile(data)
      queryClient.setQueryData(authenticatedLenserKey, profile)
      return profile
    },
    [queryClient]
  )

  const isLoading = authLoading || (isAuthenticated ? profileLoading : false)

  return (
    <LenserContext.Provider
      value={{
        lenser,
        hasLenser: !!lenser,
        isLoading,
        error: error instanceof Error ? error.message : null,
        isReady: !isLoading,
        redirectToOnboarding: () => undefined,
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
  const context = useContext(LenserContext)
  if (!context) throw new Error('useLenser must be used within LenserProvider')
  return context
}

export const useLenserOptional = () => useContext(LenserContext)
