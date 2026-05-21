import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProfileAIPreferenceResolver, PREFERENCE_FALLBACK } from './profile-ai-preference.resolver'
import type { SupabaseClient } from '@supabase/supabase-js'

function makeClient(rpcReturn: { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn().mockResolvedValue(rpcReturn),
  } as unknown as SupabaseClient
}

describe('ProfileAIPreferenceResolver', () => {
  describe('resolve()', () => {
    it('returns fallback when RPC returns null data', async () => {
      const client = makeClient({ data: null, error: null })
      const resolver = new ProfileAIPreferenceResolver(client)
      const result = await resolver.resolve('user-123')
      expect(result).toEqual(PREFERENCE_FALLBACK)
    })

    it('returns fallback when RPC returns an error', async () => {
      const client = makeClient({ data: null, error: new Error('DB error') })
      const resolver = new ProfileAIPreferenceResolver(client)
      const result = await resolver.resolve('user-123')
      expect(result).toEqual(PREFERENCE_FALLBACK)
    })

    it('maps full preference row correctly', async () => {
      const client = makeClient({
        data: {
          default_ai_funding_source: 'user_byok_cloud',
          ai_provider_key: 'anthropic',
          ai_model_key: 'claude-3-haiku-20240307',
          selected_api_key_id: 'key-uuid-abc',
          default_ai_local_key_id: null,
        },
        error: null,
      })
      const resolver = new ProfileAIPreferenceResolver(client)
      const result = await resolver.resolve('user-123')
      expect(result).toEqual({
        fundingSource: 'user_byok_cloud',
        modelId: 'claude-3-haiku-20240307',
        providerId: 'anthropic',
        selectedKeyRefId: 'key-uuid-abc',
        localKeyId: null,
      })
    })

    it('maps local BYOK funding source with local key id', async () => {
      const client = makeClient({
        data: {
          default_ai_funding_source: 'user_byok_local',
          ai_provider_key: 'openai',
          ai_model_key: 'gpt-4o-mini',
          selected_api_key_id: null,
          default_ai_local_key_id: 'local-key-id-xyz',
        },
        error: null,
      })
      const resolver = new ProfileAIPreferenceResolver(client)
      const result = await resolver.resolve('user-123')
      expect(result.fundingSource).toBe('user_byok_local')
      expect(result.localKeyId).toBe('local-key-id-xyz')
      expect(result.selectedKeyRefId).toBeNull()
    })

    it('falls back to platform_credit for unknown funding_source value', async () => {
      const client = makeClient({
        data: { default_ai_funding_source: 'unknown_value', ai_provider_key: 'openai', ai_model_key: null, selected_api_key_id: null, default_ai_local_key_id: null },
        error: null,
      })
      const resolver = new ProfileAIPreferenceResolver(client)
      const result = await resolver.resolve('user-123')
      expect(result.fundingSource).toBe(PREFERENCE_FALLBACK.fundingSource)
    })

    it('uses fallback modelId and providerId when DB columns are null', async () => {
      const client = makeClient({
        data: { default_ai_funding_source: null, ai_provider_key: null, ai_model_key: null, selected_api_key_id: null, default_ai_local_key_id: null },
        error: null,
      })
      const resolver = new ProfileAIPreferenceResolver(client)
      const result = await resolver.resolve('user-123')
      expect(result.modelId).toBe(PREFERENCE_FALLBACK.modelId)
      expect(result.providerId).toBe(PREFERENCE_FALLBACK.providerId)
    })

    it('never throws — returns fallback even on unexpected exception', async () => {
      const client = {
        rpc: vi.fn().mockRejectedValue(new Error('network failure')),
      } as unknown as SupabaseClient
      const resolver = new ProfileAIPreferenceResolver(client)
      const result = await resolver.resolve('user-123')
      expect(result).toEqual(PREFERENCE_FALLBACK)
    })
  })
})
