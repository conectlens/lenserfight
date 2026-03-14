import { TagUsage, TagActivityEventDTO, TagDTO } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

export interface TagRepositoryPort {
  getAllTagsWithCounts(): Promise<TagUsage[]>
  findBySlug(slug: string): Promise<TagDTO | null>
  createTag(name: string, slug: string): Promise<TagDTO>
  recordActivity(event: TagActivityEventDTO): Promise<void>
  recordBatchActivity(events: TagActivityEventDTO[]): Promise<void>
}
export class SupabaseTagRepository implements TagRepositoryPort {
  private handleError(error: any) {
    if (!error) return

    if (error.code === '42501' || error?.message?.includes('permission denied')) {
      throw new Error("This tag is private or you don't have permission to access it.")
    }

    if (error.code === 'PGRST116') {
      return null
    }

    throw error
  }

  /**
   * FIND TAG BY SLUG
   * Uses REST API on secure public view
   */
  async findBySlug(slug: string): Promise<TagDTO | null> {
    const { data, error } = await supabase
      .from('vw_tags_public_stats')
      .select('id, name, slug, visibility')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      this.handleError(error)
    }

    return data as TagDTO
  }

  /**
   * CREATE TAG — uses REST API for multi-step creation
   * Security: Follows direct table access patterns with RLS enforcement.
   */
  async createTag(name: string, slug: string): Promise<TagDTO> {
    // 1. Resolve language code from current user profile
    const {
      data: { user },
    } = await supabase.auth.getUser()
    let languageCode = 'en'

    if (user) {
      const { data: profile } = await supabase
        .schema('lensers')
        .from('profiles')
        .select('preferred_language')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.preferred_language) {
        languageCode = profile.preferred_language
      }
    }

    // 2. Insert Base Tag
    const { data: tag, error: tagError } = await supabase
      .schema('content')
      .from('tags')
      .insert({ slug, visibility: 'public' })
      .select('id')
      .single()

    if (tagError) {
      if (tagError.code === '23505') {
        const existing = await this.findBySlug(slug)
        if (existing) return existing
      }
      this.handleError(tagError)
    }

    const tagId = tag.id

    // 3. Insert Tag Translation
    const { error: transError } = await supabase.schema('content').from('tag_translations').insert({
      tag_id: tagId,
      language_code: languageCode,
      name: name,
    })
    if (transError) {
      console.error('Failed to create tag translation', transError)
    }

    // 4. Return refreshed DTO from view
    const result = await this.findBySlug(slug)
    if (!result) throw new Error('Failed to retrieve newly created tag.')
    return result
  }

  /**
   * GET ALL TAGS WITH COUNTS
   */
  async getAllTagsWithCounts(): Promise<TagUsage[]> {
    const { data, error } = await supabase.from('vw_tags_public_stats').select('*')

    if (error) this.handleError(error)

    return (data ?? []).map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description ?? '',
      visibility: tag.visibility ?? 'public',
      created_at: tag.created_at,
      count: Number(tag.total_usage ?? 0),
      trendingScore: Number(tag.trend_score_7d ?? 0),
    })) as TagUsage[]
  }

  /**
   * RECORD A SINGLE TAG ACTIVITY EVENT
   */
  async recordActivity(event: TagActivityEventDTO): Promise<void> {
    await this.recordBatchActivity([event])
  }

  /**
   * RECORD MULTIPLE ACTIVITY EVENTS
   */
  async recordBatchActivity(events: TagActivityEventDTO[]): Promise<void> {
    if (!events.length) return

    try {
      // Use secure RPC instead of direct internal table access
      const { error } = await supabase.rpc('fn_tag_activity_log', {
        p_events: events,
      })

      if (error) {
        console.warn('Failed to record tag activity', error)
      }
    } catch (e) {
      console.warn('Failed to record tag activity', e)
    }
  }
}
