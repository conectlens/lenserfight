
import { TagUsage, TagActivityEventDTO, TagDTO } from '../types/tags.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface TagRepositoryPort {
  getAllTagsWithCounts(): Promise<TagUsage[]>;
  findBySlug(slug: string): Promise<TagDTO | null>;
  createTag(name: string, slug: string): Promise<TagDTO>;
  recordActivity(event: TagActivityEventDTO): Promise<void>;
  recordBatchActivity(events: TagActivityEventDTO[]): Promise<void>;
}

export class MockTagRepository implements TagRepositoryPort {
  private TAGS_KEY = 'mock_tags';
  private ACTIVITY_KEY = 'mock_tag_activity';
  
  private THREAD_TAGS_KEY = 'mock_thread_tags'; 
  private PROMPT_TAGS_KEY = 'mock_prompt_tags';

  constructor() {
    this.seed();
  }

  private seed() {
    if (!storage.getItem(this.TAGS_KEY)) {
      const initialTags: TagDTO[] = [
        { id: 'tag-1', name: 'UI/UX', slug: 'ui-ux', visibility: 'public' },
        { id: 'tag-2', name: 'Productivity', slug: 'productivity', visibility: 'public' },
        { id: 'tag-3', name: 'AI', slug: 'ai', visibility: 'public' }
      ];
      storage.setItem(this.TAGS_KEY, JSON.stringify(initialTags));
    }
  }

  private getTags(): TagDTO[] {
    return JSON.parse(storage.getItem(this.TAGS_KEY) || '[]');
  }

  private saveTags(tags: TagDTO[]) {
    storage.setItem(this.TAGS_KEY, JSON.stringify(tags));
  }

  async findBySlug(slug: string): Promise<TagDTO | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const tags = this.getTags();
    return tags.find(t => t.slug === slug) || null;
  }

  async createTag(name: string, slug: string): Promise<TagDTO> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const tags = this.getTags();
    
    // Safety check, though domain service should handle this
    if (tags.some(t => t.slug === slug)) {
        throw new Error(`Tag with slug ${slug} already exists in Mock DB`);
    }

    const newTag: TagDTO = {
        id: `tag-${Date.now()}`,
        name,
        slug,
        visibility: 'public'
    };
    
    tags.push(newTag);
    this.saveTags(tags);
    return newTag;
  }

  async getAllTagsWithCounts(): Promise<TagUsage[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const tags = this.getTags();
    const activityCache = JSON.parse(storage.getItem(this.ACTIVITY_KEY) || '{}');

    const threadTags = JSON.parse(storage.getItem(this.THREAD_TAGS_KEY) || '[]');
    const promptTags = JSON.parse(storage.getItem(this.PROMPT_TAGS_KEY) || '[]');

    return tags.map(tag => {
      const threadCount = threadTags.filter((tt: any) => tt.tag_id === tag.id).length;
      const promptCount = promptTags.filter((pt: any) => pt.tag_id === tag.id).length;
      
      return {
        ...tag,
        description: '',
        created_at: new Date().toISOString(),
        count: threadCount + promptCount,
        trendingScore: activityCache[tag.id] || 0
      };
    }).filter(t => t.count > 0 || t.trendingScore > 0);
  }

  async recordActivity(event: TagActivityEventDTO): Promise<void> {
    return this.recordBatchActivity([event]);
  }

  async recordBatchActivity(events: TagActivityEventDTO[]): Promise<void> {
    setTimeout(() => {
        const activityCache = JSON.parse(storage.getItem(this.ACTIVITY_KEY) || '{}');
        events.forEach(event => {
            const currentScore = activityCache[event.tag_id] || 0;
            let boost = 1;
            if (event.activity_type === 'created') boost = 10;
            activityCache[event.tag_id] = currentScore + boost;
        });
        storage.setItem(this.ACTIVITY_KEY, JSON.stringify(activityCache));
    }, 10);
  }
}

export class SupabaseTagRepository implements TagRepositoryPort {
  
  async findBySlug(slug: string): Promise<TagDTO | null> {
    const { data, error } = await supabase
        .from('tags')
        .select('id, name, slug, visibility')
        .eq('slug', slug)
        .single();
    
    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return data as TagDTO;
  }

  async createTag(name: string, slug: string): Promise<TagDTO> {
    // We assume slug uniqueness is enforced by DB constraints
    // If it fails, it will throw, which is handled by the Service
    const { data, error } = await supabase
        .from('tags')
        .insert({ name, slug, visibility: 'public' })
        .select('id, name, slug, visibility')
        .single();

    if (error) throw error;
    return data as TagDTO;
  }

  async getAllTagsWithCounts(): Promise<TagUsage[]> {
    // Simplified fetch for demo purposes
    const { data, error } = await supabase
      .from('tags')
      .select('*, thread_tags(count), prompt_template_tags(count)')
      .eq('visibility', 'public');
        
    if (error) throw error;

    return data.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description,
      visibility: tag.visibility,
      created_at: tag.created_at,
      count: (tag.thread_tags?.[0]?.count || 0) + (tag.prompt_template_tags?.[0]?.count || 0),
      trendingScore: 0
    })).filter((t: any) => t.count > 0);
  }

  async recordActivity(event: TagActivityEventDTO): Promise<void> {
    await this.recordBatchActivity([event]);
  }

  async recordBatchActivity(events: TagActivityEventDTO[]): Promise<void> {
    if (events.length === 0) return;
    try {
        await supabase.from('tag_activity_events').insert(events);
    } catch (e) {
        console.warn("Failed to record tag activity", e);
    }
  }
}
