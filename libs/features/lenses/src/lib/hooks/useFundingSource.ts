import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { apiKeysService, walletApiClient } from '@lenserfight/data/repositories'
import { UserApiKey, FundingSource, WalletBalance } from '@lenserfight/types'
import { useAuth } from '@lenserfight/features/auth'
import { useLocalKeyStore } from './useLocalKeyStore'
import type { LocalKeyMeta } from '@lenserfight/types'

const LS_FUNDING_KEY = 'lf-workflow-funding-source'

export const useFundingSource = (
  selectedProviderKey: string,
  outputModality: string = 'text',
) => {
  const { isAuthenticated } = useAuth()
  const [fundingSource, setFundingSourceState] = useState<FundingSource>(() => {
    if (typeof window === 'undefined') return 'platform_credit'
    const stored = localStorage.getItem(LS_FUNDING_KEY) as FundingSource | null
    return stored ?? 'platform_credit'
  })
  const [selectedKeyRefId, setSelectedKeyRefId] = useState<string | null>(null)
  const [selectedLocalKeyId, setSelectedLocalKeyId] = useState<string | null>(null)

  const setFundingSource = (source: FundingSource) => {
    if (typeof window !== 'undefined') localStorage.setItem(LS_FUNDING_KEY, source)
    setFundingSourceState(source)
  }

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

  const {
    localKeys,
    isLoading: isLoadingLocalKeys,
    addKey: addLocalKey,
    removeKey: removeLocalKey,
    updateKey: updateLocalKey,
    resolveKey: resolveLocalKey,
  } = useLocalKeyStore()

  // All user cloud BYOK keys
  const availableKeys = useMemo(() => allKeys, [allKeys])

  const canUseBYOK = true

  // Reset key selections when provider changes (non-BYOK mode) or BYOK becomes unavailable
  useEffect(() => {
    // In BYOK modes the provider is driven by the selected key — don't reset the key here
    // as that would create a circular loop: key→provider→reset key→re-select key→provider…
    if (fundingSource !== 'user_byok_cloud' && fundingSource !== 'user_byok_local') {
      setSelectedKeyRefId(null)
      setSelectedLocalKeyId(null)
    }
  }, [selectedProviderKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first key when switching to cloud BYOK
  useEffect(() => {
    if (fundingSource === 'user_byok_cloud' && !selectedKeyRefId && availableKeys.length > 0) {
      setSelectedKeyRefId(availableKeys[0].id)
    }
  }, [fundingSource, selectedKeyRefId, availableKeys])

  // Auto-select first local key when switching to local BYOK
  useEffect(() => {
    if (fundingSource === 'user_byok_local' && !selectedLocalKeyId && localKeys.length > 0) {
      setSelectedLocalKeyId(localKeys[0].id)
    }
  }, [fundingSource, selectedLocalKeyId, localKeys])

  const isReady: boolean = (() => {
    if (fundingSource === 'platform_credit') return (walletBalance?.balance ?? 0) > 0
    if (fundingSource === 'user_byok_cloud') return !!selectedKeyRefId
    if (fundingSource === 'user_byok_local') return !!selectedLocalKeyId
    return false
  })()

  // AN: video/audio modality warning — platform credit costs significantly more
  // for media generation than for text. Surface this in the UI before dispatch.
  const isMediaModality = outputModality === 'video' || outputModality === 'audio'
  const modalityWarning: string | null = (() => {
    if (!isMediaModality) return null
    if (fundingSource !== 'platform_credit') return null
    return `${outputModality === 'video' ? 'Video' : 'Audio'} generation uses platform credits (charged per second of output).`
  })()

  return {
    fundingSource,
    setFundingSource,
    selectedKeyRefId,
    setSelectedKeyRefId,
    selectedLocalKeyId,
    setSelectedLocalKeyId,
    availableKeys,
    localKeys,
    isLoadingLocalKeys,
    addLocalKey,
    removeLocalKey,
    updateLocalKey,
    resolveLocalKey,
    walletBalance,
    canUseBYOK,
    isReady,
    isMediaModality,
    modalityWarning,
  }
}

export type { LocalKeyMeta }
