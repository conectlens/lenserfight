import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { apiKeysService, walletApiClient } from '@lenserfight/data/repositories'
import { UserApiKey, FundingSource, WalletBalance } from '@lenserfight/types'
import { useAuth } from '@lenserfight/features/auth'

export const useFundingSource = (selectedProviderKey: string) => {
  const { isAuthenticated } = useAuth()
  const [fundingSource, setFundingSource] = useState<FundingSource>('platform_credit')
  const [selectedKeyRefId, setSelectedKeyRefId] = useState<string | null>(null)

  const { data: allKeys = [] } = useQuery<UserApiKey[]>({
    queryKey: queryKeys.apiKeys.myKeys(),
    queryFn: () => apiKeysService.getMyKeys(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  })

  const { data: walletBalance } = useQuery<WalletBalance>({
    queryKey: queryKeys.wallet.balance,
    queryFn: () => walletApiClient.getBalance(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  })

  // All user BYOK keys — not filtered by provider or active status
  const availableKeys = useMemo(() => allKeys, [allKeys])

  const canUseBYOK = availableKeys.length > 0

  // Reset key selection when provider changes or BYOK becomes unavailable
  useEffect(() => {
    setSelectedKeyRefId(null)
    if (!canUseBYOK && fundingSource === 'user_byok_cloud') {
      setFundingSource('platform_credit')
    }
  }, [selectedProviderKey, canUseBYOK])

  // Auto-select first key when switching to BYOK
  useEffect(() => {
    if (fundingSource === 'user_byok_cloud' && !selectedKeyRefId && availableKeys.length > 0) {
      setSelectedKeyRefId(availableKeys[0].id)
    }
  }, [fundingSource, selectedKeyRefId, availableKeys])

  const isReady =
    fundingSource === 'platform_credit'
      ? (walletBalance?.balance ?? 0) > 0
      : !!selectedKeyRefId

  return {
    fundingSource,
    setFundingSource,
    selectedKeyRefId,
    setSelectedKeyRefId,
    availableKeys,
    walletBalance,
    canUseBYOK,
    isReady,
  }
}
