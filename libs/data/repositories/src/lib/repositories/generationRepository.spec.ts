import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, chainMethods } = vi.hoisted(() => {
  const chainMethods: Record<string, ReturnType<typeof vi.fn>> = {
    delete: vi.fn(),
    eq: vi.fn(),
  }
  Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
  chainMethods.eq.mockResolvedValue({ data: null, error: null })
  return {
    mockRpc: vi.fn(),
    mockFrom: vi.fn().mockReturnValue(chainMethods),
    chainMethods,
  }
})

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}))

import { SupabaseGenerationRepository } from './generationRepository'

const LENS_ID = 'lens-uuid-1'
const LENSER_ID = 'lenser-uuid-1'
const MODEL_ID = 'model-uuid-1'

describe('SupabaseGenerationRepository', () => {
  let repo: SupabaseGenerationRepository

  beforeEach(() => {
    repo = new SupabaseGenerationRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(chainMethods)
    Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
    chainMethods.eq.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // getGenerationsForPrompt
  // ---------------------------------------------------------------------------
  describe('getGenerationsForPrompt', () => {
    it('calls fn_ai_get_generations_for_prompt with all params', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getGenerationsForPrompt(LENS_ID, LENSER_ID, {
        limit: 10,
        offset: 5,
        mediaKind: 'image',
        aiModelSlug: 'gpt-4',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_ai_get_generations_for_prompt', {
        p_lens_id: LENS_ID,
        p_lenser_id: LENSER_ID,
        p_limit: 10,
        p_offset: 5,
        p_media_kind: 'image',
        p_ai_model_slug: 'gpt-4',
      })
    })

    it('uses default options and maps mediaKind="all" to null', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getGenerationsForPrompt(LENS_ID, LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_ai_get_generations_for_prompt', expect.objectContaining({
        p_media_kind: null,
        p_ai_model_slug: null,
        p_limit: 20,
        p_offset: 0,
      }))
    })

    it('returns generations from RPC', async () => {
      const gen = { id: 'gen-1', lens_id: LENS_ID, lenser_id: LENSER_ID }
      mockRpc.mockResolvedValue({ data: [gen], error: null })
      const result = await repo.getGenerationsForPrompt(LENS_ID, LENSER_ID)
      expect(result).toHaveLength(1)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getGenerationsForPrompt(LENS_ID, LENSER_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('gen error') })
      await expect(repo.getGenerationsForPrompt(LENS_ID, LENSER_ID)).rejects.toThrow('gen error')
    })
  })

  // ---------------------------------------------------------------------------
  // createGeneration
  // ---------------------------------------------------------------------------
  describe('createGeneration', () => {
    it('calls fn_ai_create_generation with all dto fields', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await repo.createGeneration({
        ai_model_slug: 'gpt-4',
        lens_id: LENS_ID,
        media: { type: 'text' } as any,
        input_text: 'prompt text',
        visibility: 'public',
        original_chat_url: 'https://chat.openai.com/share/xyz',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_ai_create_generation', {
        p_ai_model_slug: 'gpt-4',
        p_lens_id: LENS_ID,
        p_media: { type: 'text' },
        p_input_text: 'prompt text',
        p_visibility: 'public',
        p_original_chat_url: 'https://chat.openai.com/share/xyz',
      })
    })

    it('uses defaults for optional fields', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await repo.createGeneration({ ai_model_slug: 'gpt-4', lens_id: LENS_ID, media: {} as any })
      expect(mockRpc).toHaveBeenCalledWith('fn_ai_create_generation', expect.objectContaining({
        p_input_text: null,
        p_visibility: 'private',
        p_original_chat_url: null,
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('create error') })
      await expect(repo.createGeneration({ ai_model_slug: 'gpt-4', lens_id: LENS_ID, media: {} as any })).rejects.toThrow('create error')
    })
  })

  // ---------------------------------------------------------------------------
  // deleteGeneration
  // ---------------------------------------------------------------------------
  describe('deleteGeneration', () => {
    it('calls from("ai_generations").delete().eq("id", id)', async () => {
      chainMethods.eq.mockResolvedValue({ data: null, error: null })
      await repo.deleteGeneration('gen-1')
      expect(mockFrom).toHaveBeenCalledWith('ai_generations')
      expect(chainMethods.delete).toHaveBeenCalled()
      expect(chainMethods.eq).toHaveBeenCalledWith('id', 'gen-1')
    })

    it('rethrows errors', async () => {
      chainMethods.eq.mockResolvedValue({ data: null, error: new Error('delete error') })
      await expect(repo.deleteGeneration('gen-1')).rejects.toThrow('delete error')
    })
  })

  // ---------------------------------------------------------------------------
  // getActiveProviders
  // ---------------------------------------------------------------------------
  describe('getActiveProviders', () => {
    it('calls fn_ai_catalog_providers and maps to AIProvider shape', async () => {
      const row = { id: 'p-1', key: 'openai', display_name: 'OpenAI', base_url: null, docs_url: null, support_level: 'full', logo_slug: null, metadata: {}, is_active: true }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.getActiveProviders()
      expect(mockRpc).toHaveBeenCalledWith('fn_ai_catalog_providers')
      expect(result[0].key).toBe('openai')
      expect(result[0].support_level).toBe('full')
    })

    it('returns empty array on error (silently swallowed)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('catalog error') })
      expect(await repo.getActiveProviders()).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getModelsByProvider
  // ---------------------------------------------------------------------------
  describe('getModelsByProvider', () => {
    it('calls fn_ai_catalog_models with providerKey', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getModelsByProvider('openai')
      expect(mockRpc).toHaveBeenCalledWith('fn_ai_catalog_models', {
        p_provider_key: 'openai',
        p_support_level: null,
        p_capability: null,
        p_modality: null,
      })
    })

    it('maps rows to AIProviderModel shape', async () => {
      const row = { id: MODEL_ID, name: 'GPT-4', key: 'gpt-4', provider_key: 'openai', input_modalities: ['text'], output_modalities: ['text'], context_window_tokens: 8192, support_level: 'full', status: 'active', capabilities: [], supports_streaming: true, developer_summary: 'Dev', user_summary: 'User' }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.getModelsByProvider('openai')
      expect(result[0].key).toBe('gpt-4')
      expect(result[0].supportsStreaming).toBe(true)
    })

    it('returns empty array on error (silently swallowed)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('models error') })
      expect(await repo.getModelsByProvider('openai')).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getAIModels
  // ---------------------------------------------------------------------------
  describe('getAIModels', () => {
    it('calls fn_ai_catalog_models with all nulls (no filter)', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getAIModels()
      expect(mockRpc).toHaveBeenCalledWith('fn_ai_catalog_models', {
        p_provider_key: null,
        p_support_level: null,
        p_capability: null,
        p_modality: null,
      })
    })

    it('returns empty array on error (silently swallowed)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('catalog error') })
      expect(await repo.getAIModels()).toEqual([])
    })

    it('maps rows to AIModel shape', async () => {
      const row = { id: MODEL_ID, key: 'gpt-4', name: 'GPT-4', provider_key: 'openai', provider_id: 'p-1', provider_name: 'OpenAI', docs_url: null, support_level: 'full', status: 'active', capabilities: [], context_window_tokens: 8192, supports_tools: true, supports_json_schema: true, supports_vision: false, supports_streaming: true, use_cases: [], developer_summary: '', user_summary: '', metadata: {}, input_modalities: ['text'], output_modalities: ['text'], is_active: true, description: 'GPT-4' }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.getAIModels()
      expect(result[0].key).toBe('gpt-4')
      expect(result[0].is_active).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // getModelById
  // ---------------------------------------------------------------------------
  describe('getModelById', () => {
    it('calls fn_get_ai_model with model id then fn_get_ai_provider', async () => {
      const modelRow = { id: MODEL_ID, key: 'gpt-4', name: 'GPT-4', provider_id: 'p-1', description: 'GPT', capabilities: [], temperature: 0, max_tokens: 4096, is_active: true, input_modalities: ['text'], output_modalities: ['text'], created_at: '2026-01-01' }
      const providerRow = { key: 'openai', display_name: 'OpenAI' }
      mockRpc
        .mockResolvedValueOnce({ data: [modelRow], error: null })
        .mockResolvedValueOnce({ data: [providerRow], error: null })
      const result = await repo.getModelById(MODEL_ID)
      expect(mockRpc.mock.calls[0][0]).toBe('fn_get_ai_model')
      expect(mockRpc.mock.calls[1][0]).toBe('fn_get_ai_provider')
      expect(result?.key).toBe('gpt-4')
      expect(result?.provider).toBe('openai')
    })

    it('returns null when model not found', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getModelById(MODEL_ID)).toBeNull()
    })

    it('returns null on error (silently swallowed)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('model error') })
      expect(await repo.getModelById(MODEL_ID)).toBeNull()
    })
  })
})
