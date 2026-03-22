import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { apiKeysService, walletApiClient } from '@lenserfight/data/repositories'
import { UserApiKey, FundingSource, WalletBalance, ByokProvider } from '@lenserfight/types'
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

  // Filter keys by the currently selected provider
  const availableKeys = useMemo(() => {
    if (!selectedProviderKey) return []
    const providerMap: Record<string, ByokProvider> = {
      openai: 'openai',
      anthropic: 'anthropic',
      google: 'google',
      mistral: 'mistral',
    }
    const mapped = providerMap[selectedProviderKey]
    if (!mapped) return []
    return allKeys.filter((k) => k.provider === mapped && k.isActive)
  }, [allKeys, selectedProviderKey])

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
