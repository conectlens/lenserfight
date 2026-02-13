import { AuthorProfile } from '../types/lenser.types'
import { PromptTemplateRecord, CreatePromptDTO } from '../types/prompts.types'
import { TagRecord } from '../types/threads.types'

import { supabase } from '../utils/supabase'

// --- Port (Interface) ---
export interface PromptsRepositoryPort {
  getAll(offset?: number, limit?: number): Promise<PromptTemplateRecord[]>
  search(query: string, offset?: number, limit?: number): Promise<PromptTemplateRecord[]>
  filterByTag(
    tagSlug: string | null,
    offset?: number,
    limit?: number
  ): Promise<PromptTemplateRecord[]>
  sort(
    order: 'newest' | 'popular',
    offset?: number,
    limit?: number
  ): Promise<PromptTemplateRecord[]>
  getTopPrompts(limit: number): Promise<PromptTemplateRecord[]>
  getByLenser(
    handle: string,
    offset?: number,
    limit?: number,
    includePrivate?: boolean
  ): Promise<PromptTemplateRecord[]>
  getById(id: string): Promise<PromptTemplateRecord | null>
  getTags(templateId: string): Promise<TagRecord[]>
  createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord>
  updatePrompt(id: string, input: Partial<CreatePromptDTO>): Promise<PromptTemplateRecord>
  deletePrompt(id: string): Promise<void>
  updateReactionTotals(id: string, totals: Record<string, number>): Promise<void>
}

// Fallback data for Mock Mode


// --- Mock Implementation ---

// --- Supabase Implementation ---
// --- Supabase Implementation ---
export class SupabasePromptsRepository implements PromptsRepositoryPort {
  private handleError(error: any) {
    if (!error) return
    if (error.code === '42501' || error.message?.includes('permission denied')) {
      throw new Error(
        'This prompt or its associated data is private or hidden and cannot be accessed.'
      )
    }
    throw error
  }

  private get promptSelect() {
    return '*'
  }

  // -----------------------------------------------------
  // READ OPERATIONS (Views only, never touching base tables)
  // -----------------------------------------------------

  async getAll(offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return data as unknown as PromptTemplateRecord[]
  }

  async search(query: string, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .ilike('title', `%${query}%`)
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return data as unknown as PromptTemplateRecord[]
  }

  async filterByTag(
    tagSlug: string | null,
    offset = 0,
    limit = 10
  ): Promise<PromptTemplateRecord[]> {
    if (!tagSlug) return this.getAll(offset, limit)

    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .contains('tags', JSON.stringify([{ slug: tagSlug }]))
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return data as unknown as PromptTemplateRecord[]
  }

  async sort(order: 'newest' | 'popular', offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    let builder = supabase.from('vw_prompt_templates_public').select(this.promptSelect)

    if (order === 'newest') {
      builder = builder.order('created_at', { ascending: false })
    } else {
      builder = builder.order('reaction_totals->>copy', { ascending: false })
    }

    const { data, error } = await builder.range(offset, offset + limit - 1)
    if (error) this.handleError(error)
    return data as unknown as PromptTemplateRecord[]
  }

  async getTopPrompts(limit: number): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .order('reaction_totals->>copy', { ascending: false })
      .limit(limit)

    if (error) this.handleError(error)
    return data as unknown as PromptTemplateRecord[]
  }

  async getByLenser(
    handle: string,
    offset = 0,
    limit = 10,
    includePrivate = false // ignored unless you build private-author view
  ): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .eq('author_profile->>handle', handle)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return data as unknown as PromptTemplateRecord[]
  }

  async getById(id: string): Promise<PromptTemplateRecord | null> {
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      this.handleError(error)
    }
    return data as unknown as PromptTemplateRecord
  }

  async getTags(templateId: string): Promise<TagRecord[]> {
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select('tags')
      .eq('id', templateId)
      .single()

    if (error) return []
    return (data?.tags as TagRecord[]) || []
  }

  // -----------------------------------------------------
  // WRITE OPERATIONS (RPC-only, secure, RLS-safe)
  // -----------------------------------------------------

  async createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord> {
    const { data: promptId, error: rpcError } = await supabase.rpc(
      'fn_content_create_prompt_template',
      {
        p_title: input.title,
        p_description: input.description ?? null,
        p_content: input.content,
        p_visibility: input.visibility,
        p_tag_ids: input.tagIds?.length ? input.tagIds : null,
      }
    )

    if (rpcError) this.handleError(rpcError)

    // Fetch from view
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .eq('id', promptId)
      .single()

    if (error) this.handleError(error)
    return data as unknown as PromptTemplateRecord
  }

  async updatePrompt(id: string, input: Partial<CreatePromptDTO>): Promise<PromptTemplateRecord> {
    const { error: rpcError } = await supabase.rpc('fn_content_update_prompt', {
      p_id: id,
      p_title: input.title ?? null,
      p_description: input.description ?? null,
      p_content: input.content ?? null,
      p_visibility: input.visibility ?? null,
      p_tag_ids: input.tagIds !== undefined ? input.tagIds : null,
    })

    if (rpcError) this.handleError(rpcError)

    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .eq('id', id)
      .single()

    if (error) this.handleError(error)
    return data as unknown as PromptTemplateRecord
  }

  async deletePrompt(id: string): Promise<void> {
    const { error } = await supabase.rpc('fn_content_delete_prompt', {
      p_id: id,
    })
    if (error) this.handleError(error)
  }

  async updateReactionTotals(id: string, totals: Record<string, number>): Promise<void> {
    const { error } = await supabase.rpc('fn_content_update_prompt_reaction_totals', {
      p_id: id,
      p_totals: totals,
    })
    if (error) console.error('Failed to sync totals', error)
  }
}
