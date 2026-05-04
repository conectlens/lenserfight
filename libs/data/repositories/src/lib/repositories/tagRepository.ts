import { TagUsage, TagActivityEventDTO, TagDTO } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

export type TagDTOExtended = TagDTO & { total_usage?: number; trend_score_7d?: number; created_at?: string }

export interface TagRepositoryPort {
  getAllTagsWithCounts(limit?: number): Promise<TagUsage[]>
  findBySlug(slug: string): Promise<TagDTOExtended | null>
  findById(id: string): Promise<TagDTOExtended | null>
  createTag(name: string, slug: string): Promise<TagDTO>
  searchTags(query: string, lang?: string, limit?: number): Promise<TagUsage[]>
  recordActivity(event: TagActivityEventDTO): Promise<void>
  recordBatchActivity(events: TagActivityEventDTO[]): Promise<void>
}
export class SupabaseTagRepository implements TagRepositoryPort {
  private handleError(error: any) {
    if (!error) return

    if (error.code === '42501' || error?.message?.includes('permission denied')) {
      throw new Error("This tag is private or you don't have permission to access it.")
    }

    throw error
  }

  /**
   * FIND TAG BY SLUG
   * Uses REST API on secure public view
   */
  async findBySlug(slug: string): Promise<(TagDTO & { total_usage?: number; trend_score_7d?: number; created_at?: string }) | null> {
    const { data, error } = await supabase
      .from('vw_tags_public_stats')
      .select('id, name, slug, visibility, total_usage, trend_score_7d, created_at')
      .eq('slug', slug)
      .maybeSingle()

    if (error) this.handleError(error)

    return data as (TagDTO & { total_usage?: number; trend_score_7d?: number; created_at?: string }) | null
  }

  /**
   * FIND TAG BY ID
   */
  async findById(id: string): Promise<(TagDTO & { total_usage?: number; trend_score_7d?: number; created_at?: string }) | null> {
    const { data, error } = await supabase
      .from('vw_tags_public_stats')
      .select('id, name, slug, visibility, total_usage, trend_score_7d, created_at')
      .eq('id', id)
      .maybeSingle()

    if (error) this.handleError(error)

    return data as (TagDTO & { total_usage?: number; trend_score_7d?: number; created_at?: string }) | null
  }

  /**
   * CREATE TAG — uses fn_create_tag SECURITY DEFINER RPC for atomic creation.
   * Direct INSERT into content.tag_translations is blocked by RLS for non-service roles;
   * the RPC bypasses this by running with elevated privileges server-side.
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
        .select('preferences(language)')
        .eq('user_id', user.id)
        .maybeSingle()
      const lang = (profile?.preferences as { language?: string } | null)?.language
      if (lang) {
        languageCode = lang
      }
    }

    // 2. Atomic tag + translation creation via SECURITY DEFINER RPC
    const { data, error } = await supabase
      .rpc('fn_create_tag', { p_name: name, p_slug: slug, p_language_code: languageCode })
      .single()

    if (error) this.handleError(error)
    if (!data) throw new Error('Failed to retrieve newly created tag.')

    return data as TagDTO
  }

  /**
   * GET TOP TAGS WITH COUNTS
   * Uses fn_tags_get_cloud RPC to return only the top N trending tags,
   * preventing unbounded full-table scans on vw_tags_public_stats.
   */
  async getAllTagsWithCounts(limit = 10): Promise<TagUsage[]> {
    const { data, error } = await supabase.rpc('fn_tags_get_cloud', { p_limit: limit })

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
   * SEARCH TAGS BY NAME/SLUG
   * Uses fn_tags_search RPC. Results sorted by: language match → exact match → popularity.
   */
  async searchTags(query: string, lang = 'en', limit = 5): Promise<TagUsage[]> {
    const { data, error } = await supabase.rpc('fn_tags_search', {
      p_query: query,
      p_lang: lang,
      p_limit: limit,
    })

    if (error) this.handleError(error)

    return (data ?? []).map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      visibility: tag.visibility ?? 'public',
      created_at: new Date().toISOString(),
      count: Number(tag.total_usage ?? 0),
      trendingScore: 0,
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
