import {
  AIGeneration,
  CreateGenerationDTO,
  MediaLibraryItem,
  GenerationFilterOptions,
  AIModel,
} from '../types/generation.types'
import { storage } from '../utils/storage'
import { supabase } from '../utils/supabase'

const MOCK_AI_MODELS: AIModel[] = [
  {
    id: '9039013c-9394-4b47-9721-396459345228',
    slug: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'OpenAI flagship model',
    capabilities: ['text_generation', 'image_generation'],
    temperature: 0.7,
    max_tokens: 128000,
    is_public: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '1839013c-9394-4b47-9721-396459345229',
    slug: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Anthropic most intelligent model',
    capabilities: ['text_generation'],
    temperature: 0.7,
    max_tokens: 200000,
    is_public: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '2839013c-9394-4b47-9721-396459345220',
    slug: 'midjourney-v6',
    name: 'Midjourney v6',
    provider: 'midjourney',
    description: 'High fidelity image generation',
    capabilities: ['image_generation'],
    temperature: 1,
    max_tokens: 0,
    is_public: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '3839013c-9394-4b47-9721-396459345221',
    slug: 'gemini-1-5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    description: 'Google multimodal model',
    capabilities: ['text_generation', 'image_generation'],
    temperature: 0.7,
    max_tokens: 1000000,
    is_public: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '4839013c-9394-4b47-9721-396459345222',
    slug: 'dall-e-3',
    name: 'DALL·E 3',
    provider: 'openai',
    description: 'OpenAI image generation',
    capabilities: ['image_generation'],
    temperature: 1,
    max_tokens: 0,
    is_public: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '5839013c-9394-4b47-9721-396459345223',
    slug: 'stable-diffusion-3',
    name: 'Stable Diffusion 3',
    provider: 'stability',
    description: 'Stability AI image model',
    capabilities: ['image_generation'],
    temperature: 1,
    max_tokens: 0,
    is_public: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '6839013c-9394-4b47-9721-396459345224',
    slug: 'sora',
    name: 'Sora',
    provider: 'openai',
    description: 'Text to video model',
    capabilities: ['video_generation'],
    temperature: 1,
    max_tokens: 0,
    is_public: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '7839013c-9394-4b47-9721-396459345225',
    slug: 'runway-gen-2',
    name: 'Runway Gen-2',
    provider: 'other',
    description: 'Video generation model',
    capabilities: ['video_generation'],
    temperature: 1,
    max_tokens: 0,
    is_public: true,
    created_at: new Date().toISOString(),
  },
]

export interface GenerationRepositoryPort {
  getGenerationsForPrompt(
    promptId: string,
    lenserId: string,
    options?: GenerationFilterOptions
  ): Promise<AIGeneration[]>
  createGeneration(data: CreateGenerationDTO): Promise<void>
  deleteGeneration(id: string): Promise<void>
  getAIModels(): Promise<AIModel[]>
}

export class MockGenerationRepository implements GenerationRepositoryPort {
  private GENERATIONS_KEY = 'mock_ai_generations'
  private MEDIA_KEY = 'mock_media_library'

  constructor() {
    this.seed()
  }

  private seed() {
    // Seed logic if needed
  }

  private getGenerations(): AIGeneration[] {
    return JSON.parse(storage.getItem(this.GENERATIONS_KEY) || '[]')
  }

  private getMedia(): MediaLibraryItem[] {
    return JSON.parse(storage.getItem(this.MEDIA_KEY) || '[]')
  }

  async getGenerationsForPrompt(
    promptId: string,
    lenserId: string,
    options: GenerationFilterOptions = {}
  ): Promise<AIGeneration[]> {
    await new Promise((resolve) => setTimeout(resolve, 600))

    const allGens = this.getGenerations()
    const allMedia = this.getMedia()

    const { limit = 20, offset = 0, mediaKind = 'all', aiModelSlug = 'all' } = options

    // Filter by prompt
    const filtered = allGens.filter((g) => g.prompt_template_id === promptId)

    // Join media
    let joined = filtered.map((g) => ({
      ...g,
      media: allMedia.find((m) => m.id === g.media_id),
    }))

    // Apply Filters
    if (mediaKind !== 'all') {
      joined = joined.filter((g) => g.media?.media_kind === mediaKind)
    }

    if (aiModelSlug !== 'all') {
      joined = joined.filter((g) => g.ai_model_slug === aiModelSlug)
    }

    // Sort by Date Desc
    joined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Paginate
    return joined.slice(offset, offset + limit)
  }

  async createGeneration(dto: CreateGenerationDTO): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 800))

    // 1. Create Media
    const mediaId = `media-${Date.now()}`
    const newMedia: MediaLibraryItem = {
      id: mediaId,
      lenser_id: dto.lenser_id,
      created_at: new Date().toISOString(),
      ...dto.media,
    }
    const allMedia = this.getMedia()
    allMedia.push(newMedia)
    storage.setItem(this.MEDIA_KEY, JSON.stringify(allMedia))

    // 2. Create Generation
    const newGen: AIGeneration = {
      id: `gen-${Date.now()}`,
      lenser_id: dto.lenser_id,
      ai_model_slug: dto.ai_model_slug,
      prompt_template_id: dto.prompt_template_id,
      media_id: mediaId,
      media: newMedia,
      input_text: dto.input_text,
      output_type: dto.media.media_kind,
      visibility: dto.visibility || 'private',
      created_at: new Date().toISOString(),
      original_chat_url: dto.original_chat_url,
    }

    const allGens = this.getGenerations()
    allGens.push(newGen)
    storage.setItem(this.GENERATIONS_KEY, JSON.stringify(allGens))
  }

  async deleteGeneration(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 400))
    let allGens = this.getGenerations()
    const gen = allGens.find((g) => g.id === id)

    if (gen) {
      // Cascade delete media in mock
      let allMedia = this.getMedia()
      allMedia = allMedia.filter((m) => m.id !== gen.media_id)
      storage.setItem(this.MEDIA_KEY, JSON.stringify(allMedia))
    }

    allGens = allGens.filter((g) => g.id !== id)
    storage.setItem(this.GENERATIONS_KEY, JSON.stringify(allGens))
  }

  async getAIModels(): Promise<AIModel[]> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return MOCK_AI_MODELS
  }
}

export class SupabaseGenerationRepository implements GenerationRepositoryPort {
  async getGenerationsForPrompt(
    promptId: string,
    lenserId: string,
    options: GenerationFilterOptions = {}
  ): Promise<AIGeneration[]> {
    const {
      limit = 20,
      offset = 0,
      mediaKind = 'all',
      aiModelSlug = 'all',
    } = options

    const { data, error } = await supabase.rpc(
      'fn_ai_get_generations_for_prompt',
      {
        p_prompt_template_id: promptId,
        p_lenser_id: lenserId,
        p_limit: limit,
        p_offset: offset,
        p_media_kind: mediaKind === 'all' ? null : mediaKind,
        p_ai_model_slug: aiModelSlug === 'all' ? null : aiModelSlug,
      }
    )

    if (error) {
      console.error('getGenerationsForPrompt failed:', error)
      throw error
    }

    // RPC already returns the correct shape
    // No joins, no arrays, no post-processing
    return (data ?? []) as AIGeneration[]
  }

  async createGeneration(dto: CreateGenerationDTO): Promise<void> {
    const { error } = await supabase.rpc('fn_ai_create_generation', {
      p_ai_model_slug: dto.ai_model_slug,
      p_prompt_template_id: dto.prompt_template_id,
      p_media: dto.media,
      p_input_text: dto.input_text ?? null,
      p_visibility: dto.visibility ?? 'private',
      p_original_chat_url: dto.original_chat_url ?? null,
    })

    if (error) {
      console.error('Generation failed:', error)
      throw error
    }
  }

  async deleteGeneration(id: string): Promise<void> {
    const { error } = await supabase.from('ai_generations').delete().eq('id', id)
    if (error) throw error
  }

  async getAIModels(): Promise<AIModel[]> {
    const { data, error } = await supabase.from('vw_ai_models_public').select('*')

    if (error) {
      console.warn('Failed to fetch ai_models, returning empty list.', error)
      return []
    }
    return data as AIModel[]
  }
}
