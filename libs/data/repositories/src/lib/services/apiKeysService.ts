import { SupabaseApiKeysRepository } from '../repositories/apiKeysRepository'
import { UserApiKey, ByokProvider, CreateApiKeyDTO } from '@lenserfight/types'

const ALLOWED_PROVIDERS: ByokProvider[] = ['openai', 'anthropic', 'google', 'mistral']

const apiKeysRepo = new SupabaseApiKeysRepository()

export const apiKeysService = {
  getMyKeys: async (): Promise<UserApiKey[]> => {
    return apiKeysRepo.getMyKeys()
  },

  storeKey: async (dto: CreateApiKeyDTO): Promise<string> => {
    if (!ALLOWED_PROVIDERS.includes(dto.provider)) {
      throw new Error(`Unsupported provider: ${dto.provider}`)
    }
    if (!dto.rawKey || dto.rawKey.trim().length < 8) {
      throw new Error('API key must be at least 8 characters')
    }
    return apiKeysRepo.storeKey(dto)
  },

  revokeKey: async (keyId: string): Promise<void> => {
    if (!keyId) throw new Error('Key ID is required')
    return apiKeysRepo.revokeKey(keyId)
  },

  getActiveKeysForProvider: async (provider: ByokProvider): Promise<UserApiKey[]> => {
    const keys = await apiKeysRepo.getMyKeys()
    return keys.filter((k) => k.providerKey === provider && k.isActive)
  },
}
