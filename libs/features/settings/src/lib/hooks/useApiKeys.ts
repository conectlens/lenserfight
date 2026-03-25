import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { apiKeysService, preferencesService } from '@lenserfight/data/repositories'
import { LenserPreferences, UserApiKey, CreateApiKeyDTO, ByokProvider } from '@lenserfight/types'
import { useAuth } from '@lenserfight/features/auth'

export const useApiKeys = () => {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  const {
    data: keys = [],
    isLoading,
    error,
  } = useQuery<UserApiKey[]>({
    queryKey: queryKeys.apiKeys.myKeys(),
    queryFn: () => apiKeysService.getMyKeys(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  })

  const { data: preferences } = useQuery<LenserPreferences | null>({
    queryKey: ['preferences'],
    queryFn: () => preferencesService.getPreferences(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  })

  const storeMutation = useMutation({
    mutationFn: (dto: CreateApiKeyDTO) => apiKeysService.storeKey(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.myKeys() })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => apiKeysService.revokeKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.myKeys() })
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
    },
  })

  const selectKeyMutation = useMutation({
    mutationFn: (keyId: string | null) =>
      preferencesService.updatePreferences({ selected_api_key_id: keyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
    },
  })

  const getKeysForProvider = (provider: ByokProvider): UserApiKey[] => {
    return keys.filter((k) => k.providerKey === provider && k.isActive)
  }

  return {
    keys,
    isLoading,
    error,
    selectedKeyId: preferences?.selected_api_key_id ?? null,
    storeKey: storeMutation.mutate,
    isStoring: storeMutation.isPending,
    storeError: storeMutation.error,
    revokeKey: revokeMutation.mutate,
    isRevoking: revokeMutation.isPending,
    selectKey: selectKeyMutation.mutate,
    isSelecting: selectKeyMutation.isPending,
    getKeysForProvider,
  }
}
