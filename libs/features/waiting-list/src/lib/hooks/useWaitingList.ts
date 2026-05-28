import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@lenserfight/data/cache'
import { waitingListService } from '@lenserfight/data/repositories'
import { useAuth, WAITINGLIST_CACHE_KEY } from '@lenserfight/features/auth'
import { useLenser } from '@lenserfight/features/profile'
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

export const useWaitingList = () => {
  const { user, isAuthenticated } = useAuth()
  const { lenser } = useLenser()
  const queryClient = useQueryClient()

  const cachedWaitingList = readCache<boolean>(WAITINGLIST_CACHE_KEY)

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
    if (isInWaitingList !== null && isInWaitingList !== undefined) {
      writeCache(WAITINGLIST_CACHE_KEY, isInWaitingList)
    }
  }, [isInWaitingList])

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

  return { isInWaitingList, toggleWaitingList }
}
