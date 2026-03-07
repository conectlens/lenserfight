import React, { createContext, useContext } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '../lib/queryKeys'
import { lenserService } from '../services/lenserService'
import { waitingListService } from '../services/waitingListService'
import { Lenser, CreateLenserDTO } from '../types/lenser.types'

import { useAuth } from './AuthContext'

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

  const {
    data: lenser = null,
    isLoading,
    error: queryError,
  } = useQuery<Lenser | null>({
    queryKey: queryKeys.lenser.authenticated(),
    queryFn: () => lenserService.getAuthenticatedLenser(),
    enabled: isAuthenticated && !!user,
    staleTime: 1000 * 60 * 5,
  })

  const { data: isInWaitingList = null } = useQuery<boolean | null>({
    queryKey: queryKeys.waitingList.status(),
    queryFn: async () => {
      const result = await waitingListService.getIsInWaitingList()
      return result ?? null
    },
    enabled: isAuthenticated && !!user,
    staleTime: 1000 * 60 * 5,
  })

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
