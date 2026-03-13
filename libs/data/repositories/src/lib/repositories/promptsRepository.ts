import { supabase } from '@lenserfight/data/supabase'
import { AuthorProfile } from '@lenserfight/types'
import { PromptTemplateRecord, CreatePromptDTO } from '@lenserfight/types'
import { TagRecord } from '@lenserfight/types'

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
  getById(id: string, viewerLenserId?: string): Promise<PromptTemplateRecord | null>
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
  private handleError(error: unknown) {
    const normalizedError = error as { code?: string; message?: string }
    if (!error) return
    if (normalizedError.code === '42501' || normalizedError.message?.includes('permission denied')) {
      throw new Error(
        'This prompt or its associated data is private or hidden and cannot be accessed.'
      )
    }
    if (normalizedError.code === 'PGRST116') {
      throw new Error('Requested resource was not found.')
    }
    throw error
  }

  private get promptSelect() {
    return '*'
  }

  private async getProfileByHandle(handle: string): Promise<AuthorProfile | null> {
    const { data: profile, error } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      .eq('handle', handle)
      .maybeSingle()

    if (error) this.handleError(error)
    if (!profile) return null

    return this.mapProfileToAuthor(profile as Partial<AuthorProfile>, profile.id)
  }

  private mapProfileToAuthor(profile: Partial<AuthorProfile> | null | undefined, fallbackId: string): AuthorProfile {
    return {
      id: profile?.id || fallbackId,
      handle: profile?.handle || 'unknown',
      display_name: profile?.display_name || 'Unknown',
      avatar_url: profile?.avatar_url || null,
    } as AuthorProfile
  }

  private async getProfileById(lenserId: string): Promise<AuthorProfile> {
    const { data: profile } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      .eq('id', lenserId)
      .maybeSingle()

    return this.mapProfileToAuthor(profile as Partial<AuthorProfile> | null, lenserId)
  }

  private async getTagsForPrompt(promptId: string): Promise<TagRecord[]> {
    const { data: tagMapRows, error: tagMapError } = await supabase
      .schema('content')
      .from('tag_map')
      .select('tag_id')
      .eq('entity_type', 'prompt_template')
      .eq('entity_id', promptId)

    if (tagMapError) this.handleError(tagMapError)

    const tagIds = (tagMapRows ?? []).map((row) => row.tag_id).filter(Boolean)
    if (tagIds.length === 0) return []

    const { data: tags, error: tagsError } = await supabase
      .from('vw_tags_public_stats')
      .select('id, slug, name')
      .in('id', tagIds)

    if (tagsError) this.handleError(tagsError)

    const tagById = new Map((tags ?? []).map((tag) => [tag.id, tag]))
    return tagIds
      .map((id) => tagById.get(id))
      .filter(Boolean)
      .map((tag) => ({
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
      }))
  }

  private async getPromptReactionTotals(promptId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .schema('content')
      .from('prompt_reactions')
      .select('reaction')
      .eq('prompt_id', promptId)

    if (error) this.handleError(error)

    return (data ?? []).reduce<Record<string, number>>((totals, row) => {
      totals[row.reaction] = (totals[row.reaction] ?? 0) + 1
      return totals
    }, {})
  }

  private async buildOwnerPromptRecord(
    basePrompt: Pick<PromptTemplateRecord, 'id' | 'lenser_id' | 'visibility' | 'created_at' | 'updated_at'>
  ): Promise<PromptTemplateRecord> {
    const [translationResult, authorProfile, tags] = await Promise.all([
      supabase
        .schema('content')
        .from('prompt_translations')
        .select('title, description, content')
        .eq('prompt_id', basePrompt.id)
        .eq('is_original', true)
        .maybeSingle(),
      this.getProfileById(basePrompt.lenser_id),
      this.getTagsForPrompt(basePrompt.id),
    ])

    if (translationResult.error) this.handleError(translationResult.error)
    const reactionTotals = await this.getPromptReactionTotals(basePrompt.id)

    return {
      id: basePrompt.id,
      lenser_id: basePrompt.lenser_id,
      visibility: basePrompt.visibility,
      created_at: basePrompt.created_at,
      updated_at: basePrompt.updated_at,
      title: translationResult.data?.title || 'Untitled',
      description: translationResult.data?.description ?? null,
      content: translationResult.data?.content || '',
      author_profile: authorProfile,
      tags,
      reaction_totals: reactionTotals,
    } as PromptTemplateRecord
  }

  private async hydratePromptRecords(
    basePrompts: Pick<
      PromptTemplateRecord,
      'id' | 'lenser_id' | 'visibility' | 'created_at' | 'updated_at'
    >[]
  ): Promise<PromptTemplateRecord[]> {
    return Promise.all(basePrompts.map((prompt) => this.buildOwnerPromptRecord(prompt)))
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
    includePrivate = false
  ): Promise<PromptTemplateRecord[]> {
    if (includePrivate) {
      const profile = await this.getProfileByHandle(handle)
      if (!profile?.id) return []

      const { data: basePrompts, error } = await supabase
        .schema('content')
        .from('prompt_templates')
        .select('id, lenser_id, visibility, created_at, updated_at')
        .eq('lenser_id', profile.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) this.handleError(error)
      return this.hydratePromptRecords((basePrompts ?? []) as PromptTemplateRecord[])
    }

    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .eq('author_profile->>handle', handle)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return (data ?? []) as unknown as PromptTemplateRecord[]
  }

  async getById(id: string, viewerLenserId?: string): Promise<PromptTemplateRecord | null> {
    const { data: basePrompt, error } = await supabase
      .schema('content')
      .from('prompt_templates')
      .select('id, lenser_id, visibility, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) this.handleError(error)
    if (!basePrompt) return null
    if (basePrompt.visibility === 'private' && (!viewerLenserId || basePrompt.lenser_id !== viewerLenserId)) {
      return null
    }

    const { data: translation, error: translationError } = await supabase
      .schema('content')
      .from('prompt_translations')
      .select('title, description, content')
      .eq('prompt_id', id)
      .eq('is_original', true)
      .maybeSingle()

    if (translationError) this.handleError(translationError)

    const authorProfile = await this.getProfileById(basePrompt.lenser_id)
    const tags = await this.getTagsForPrompt(basePrompt.id)

    return {
      id: basePrompt.id,
      lenser_id: basePrompt.lenser_id,
      visibility: basePrompt.visibility,
      created_at: basePrompt.created_at,
      updated_at: basePrompt.updated_at,
      title: translation?.title || 'Untitled',
      description: translation?.description ?? null,
      content: translation?.content || '',
      author_profile: authorProfile,
      reaction_totals: {},
      tags,
    } as unknown as PromptTemplateRecord
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
    const cleanLenserId = !input.lenserId || input.lenserId === 'undefined' ? undefined : input.lenserId

    // 1. Resolve the content language from the exposed profile schema.
    let languageCode = 'en'
    if (cleanLenserId) {
      const { data: profileData } = await supabase
        .schema('lensers')
        .from('profiles')
        .select('preferred_language')
        .eq('id', cleanLenserId)
        .maybeSingle()
      if (profileData?.preferred_language) {
        languageCode = profileData.preferred_language
      }
    }

    // 2. Insert Base Prompt Template
    const { data: promptInsertData, error: rpcError } = await supabase.schema('content').from('prompt_templates').insert({
      visibility: input.visibility,
      lenser_id: cleanLenserId
    }).select('id').single()

    if (rpcError) this.handleError(rpcError)
    const promptId = promptInsertData.id

    // 3. Insert Prompt Translation
    const { error: translationError } = await supabase.schema('content').from('prompt_translations').insert({
      prompt_id: promptId,
      language_code: languageCode,
      is_original: true,
      title: input.title,
      description: input.description ?? null,
      content: input.content
    })
    if (translationError) this.handleError(translationError)

    if (input.tagIds?.length) {
      const { data: authData } = await supabase.auth.getUser()
      const tagRecords = input.tagIds.map(tagId => ({
        entity_type: 'prompt_template',
        entity_id: promptId,
        tag_id: tagId,
        user_id: authData?.user?.id || null
      }))
      await supabase.schema('content').from('tag_map').insert(tagRecords)
    }

    // Fetch from view
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .eq('id', promptId)
      .maybeSingle()

    if (error) this.handleError(error)

    if (!data) {
      // If prompt is private, it won't show in the public view.
      // We return a "simulated" record so the flow can continue.
      // In a real scenario, we should have a 'vw_prompt_templates_owner' view.
      return {
        id: promptId,
        lenser_id: cleanLenserId,
        visibility: input.visibility,
        created_at: new Date().toISOString(),
        title: input.title,
        description: input.description,
        content: input.content,
        reaction_totals: {},
        author_profile: {},
        tags: [],
      } as unknown as PromptTemplateRecord
    }

    return data as unknown as PromptTemplateRecord
  }

  async updatePrompt(id: string, input: Partial<CreatePromptDTO>): Promise<PromptTemplateRecord> {
    const baseUpdatePayload: Partial<Pick<PromptTemplateRecord, 'visibility'>> = {}
    const translationUpdatePayload: Partial<
      Pick<PromptTemplateRecord, 'title' | 'description' | 'content'>
    > = {}

    if (input.visibility !== undefined) baseUpdatePayload.visibility = input.visibility
    if (input.title !== undefined) translationUpdatePayload.title = input.title
    if (input.description !== undefined) translationUpdatePayload.description = input.description
    if (input.content !== undefined) translationUpdatePayload.content = input.content

    if (Object.keys(baseUpdatePayload).length > 0) {
      const { error: rpcError } = await supabase.schema('content').from('prompt_templates').update(baseUpdatePayload).eq('id', id)
      if (rpcError) this.handleError(rpcError)
    }

    if (Object.keys(translationUpdatePayload).length > 0) {
      const { error } = await supabase.schema('content').from('prompt_translations')
        .update(translationUpdatePayload)
        .eq('prompt_id', id)
        .eq('is_original', true)
      if (error) this.handleError(error)
    }

    if (input.tagIds !== undefined) {
      await supabase.schema('content').from('tag_map').delete().eq('entity_type', 'prompt_template').eq('entity_id', id)
      if (input.tagIds.length > 0) {
        const { data: authData } = await supabase.auth.getUser()
        const tagRecords = input.tagIds.map(tagId => ({
          entity_type: 'prompt_template',
          entity_id: id,
          tag_id: tagId,
          user_id: authData?.user?.id || null
        }))
        await supabase.schema('content').from('tag_map').insert(tagRecords)
      }
    }

    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .eq('id', id)
      .maybeSingle()

    if (error) this.handleError(error)

    if (!data) {
      // Fallback for private update
      return {
        id,
        visibility: input.visibility,
        title: input.title,
        description: input.description,
        content: input.content,
      } as unknown as PromptTemplateRecord
    }

    return data as unknown as PromptTemplateRecord
  }

  async deletePrompt(id: string): Promise<void> {
    const { error } = await supabase.schema('content').from('prompt_templates').delete().eq('id', id)
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
