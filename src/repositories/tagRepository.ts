import { TagUsage, TagActivityEventDTO, TagDTO } from '../types/tags.types'
import { supabase } from '../utils/supabase'

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
   * Uses RPC fn_content_tags_get_by_slug
   */
  async findBySlug(slug: string): Promise<TagDTO | null> {
    const { data, error } = await supabase.rpc('fn_content_tags_get_by_slug', {
      p_slug: slug,
    })

    if (error) {
      if (error.code === 'PGRST116') return null
      this.handleError(error)
    }

    return data as TagDTO
  }

  /**
   * CREATE TAG — uses fn_content_tags_create
   */
  async createTag(name: string, slug: string): Promise<TagDTO> {
    const { data: tagId, error } = await supabase.rpc('fn_content_tags_create', {
      p_name: name,
      p_slug: slug,
    })

    if (error) this.handleError(error)

    const { data: tag, error: fetchError } = await supabase
      .from('vw_content_tags_public')
      .select('*')
      .eq('id', tagId)
      .single()

    if (fetchError) this.handleError(fetchError)

    return tag as TagDTO
  }

  /**
   * GET ALL TAGS WITH COUNTS
   */
  async getAllTagsWithCounts(): Promise<TagUsage[]> {
    const { data, error } = await supabase.from('vw_content_tags_public').select('*')

    if (error) this.handleError(error)

    return (data ?? []).map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description ?? '',
      visibility: tag.visibility ?? 'public',
      created_at: tag.created_at,
      count: tag.usage_count ?? 0,
      trendingScore: tag.trending_score ?? 0,
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
      const { error } = await supabase.from('tag_activity_events').insert(events)

      if (error) {
        console.warn('Failed to record tag activity', error)
      }
    } catch (e) {
      console.warn('Failed to record tag activity', e)
    }
  }
}
