import {
  AIGeneration,
  CreateGenerationDTO,
  MediaLibraryItem,
  GenerationFilterOptions,
  AIModel,
} from '../types/generation.types'

import { supabase } from '../core/supabase/client'



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
