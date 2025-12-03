
import { TagUsage, TagActivityEventDTO, TagRecord } from '../types/tags.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface TagRepositoryPort {
  getAllTagsWithCounts(): Promise<TagUsage[]>;
  getTagBySlug(slug: string): Promise<TagUsage | null>;
  recordActivity(event: TagActivityEventDTO): Promise<void>;
  upsertTags(names: string[]): Promise<TagRecord[]>;
}

export class MockTagRepository implements TagRepositoryPort {
  private TAGS_KEY = 'mock_tags';
  private ACTIVITY_KEY = 'mock_tag_activity';
  
  // Helper to access other repos' junction tables directly for dynamic counting
  private THREAD_TAGS_KEY = 'mock_thread_tags'; 
  private PROMPT_TAGS_KEY = 'mock_prompt_tags';

  constructor() {
    this.seed();
  }

  private seed() {
    if (!storage.getItem(this.TAGS_KEY)) {
      const initialTags = [
        { name: 'UI/UX', count: 156, trending: 85 },
        { name: 'Productivity', count: 120, trending: 60 },
        { name: 'AI', count: 98, trending: 95 },
        { name: 'Design Systems', count: 87, trending: 40 },
        { name: 'Marketing', count: 76, trending: 30 },
        { name: 'React', count: 65, trending: 55 },
        { name: 'Midjourney', count: 140, trending: 90 },
        { name: 'ChatGPT', count: 110, trending: 88 }
      ];
      
      const records: TagRecord[] = initialTags.map((t, i) => ({
        id: `tag-${i}`,
        name: t.name,
        slug: t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: `Discussions and prompts related to ${t.name}.`,
        created_at: new Date().toISOString()
      }));
      
      // We store simple records, counts are calculated dynamically or via activity cache
      storage.setItem(this.TAGS_KEY, JSON.stringify(records));
      
      // Initialize activity cache for trending scores
      const activityCache: Record<string, number> = {};
      initialTags.forEach((t, i) => {
        activityCache[`tag-${i}`] = t.trending;
      });
      storage.setItem(this.ACTIVITY_KEY, JSON.stringify(activityCache));
    }
  }

  private getTags(): TagRecord[] {
    return JSON.parse(storage.getItem(this.TAGS_KEY) || '[]');
  }

  private saveTags(tags: TagRecord[]) {
    storage.setItem(this.TAGS_KEY, JSON.stringify(tags));
  }

  async upsertTags(names: string[]): Promise<TagRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const allTags = this.getTags();
    const result: TagRecord[] = [];
    let changed = false;

    names.forEach(name => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      let existing = allTags.find(t => t.slug === slug);
      
      if (!existing) {
        existing = {
          id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: name.trim(),
          slug,
          created_at: new Date().toISOString()
        };
        allTags.push(existing);
        changed = true;
      }
      result.push(existing);
    });

    if (changed) {
      this.saveTags(allTags);
    }
    return result;
  }

  async getAllTagsWithCounts(): Promise<TagUsage[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const tags = this.getTags();
    const activityCache = JSON.parse(storage.getItem(this.ACTIVITY_KEY) || '{}');

    // Calculate usage counts from junction tables
    const threadTags = JSON.parse(storage.getItem(this.THREAD_TAGS_KEY) || '[]');
    const promptTags = JSON.parse(storage.getItem(this.PROMPT_TAGS_KEY) || '[]');

    return tags.map(tag => {
      const threadCount = threadTags.filter((tt: any) => tt.tag_id === tag.id).length;
      const promptCount = promptTags.filter((pt: any) => pt.tag_id === tag.id).length;
      
      return {
        ...tag,
        count: threadCount + promptCount,
        trendingScore: activityCache[tag.id] || 0
      };
    }).filter(t => t.count > 0 || t.trendingScore > 0);
  }

  async getTagBySlug(slug: string): Promise<TagUsage | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const tags = await this.getAllTagsWithCounts();
    return tags.find(t => t.slug === slug) || null;
  }

  async recordActivity(event: TagActivityEventDTO): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const activityCache = JSON.parse(storage.getItem(this.ACTIVITY_KEY) || '{}');
    
    const currentScore = activityCache[event.tag_id] || 0;
    // Simple scoring logic for mock
    let boost = 1;
    if (event.activity_type === 'created') boost = 10;
    if (event.activity_type === 'reacted') boost = 2;
    
    activityCache[event.tag_id] = currentScore + boost;
    storage.setItem(this.ACTIVITY_KEY, JSON.stringify(activityCache));
    
    console.log(`[Mock] Tag ${event.tag_id} trending score increased by ${boost}`);
  }
}

export class SupabaseTagRepository implements TagRepositoryPort {
  
  async upsertTags(names: string[]): Promise<TagRecord[]> {
    if (names.length === 0) return [];

    const inputs = names.map(name => ({
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: name.trim()
    }));

    // 1. Upsert tags (Supabase upsert based on slug/name unique constraint)
    const { data, error } = await supabase
      .from('tags')
      .upsert(inputs, { onConflict: 'slug' })
      .select();

    if (error) throw error;
    return data as TagRecord[];
  }

  async getAllTagsWithCounts(): Promise<TagUsage[]> {
    // Try to get from view
    const { data: trendingData, error: trendingError } = await supabase
      .from('tag_trending_summary')
      .select('*');

    if (!trendingError && trendingData) {
      const map = new Map<string, TagUsage>();
      
      trendingData.forEach((row: any) => {
        const existing = map.get(row.tag_id) || {
          id: row.tag_id,
          slug: row.slug,
          name: row.name,
          created_at: new Date().toISOString(),
          count: 0,
          trendingScore: 0
        };

        const usage = (row.created_count || 0);
        existing.count += usage;
        existing.trendingScore += (row.score || 0);
        
        map.set(row.tag_id, existing);
      });

      return Array.from(map.values());
    }

    // Fallback
    const { data, error } = await supabase
      .from('tags')
      .select(`
        *,
        thread_tags(count),
        prompt_template_tags(count)
      `);

    if (error) throw error;

    return data.map((tag: any) => {
      const threadCount = tag.thread_tags?.[0]?.count || 0;
      const promptCount = tag.prompt_template_tags?.[0]?.count || 0;
      return {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        created_at: tag.created_at,
        count: threadCount + promptCount,
        trendingScore: 0
      };
    }).filter((t: TagUsage) => t.count > 0);
  }

  async getTagBySlug(slug: string): Promise<TagUsage | null> {
    const { data: tagData, error } = await supabase.from('tags').select('*').eq('slug', slug).single();
    if (error || !tagData) return null;

    const [threadRes, promptRes] = await Promise.all([
        supabase.from('thread_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tagData.id),
        supabase.from('prompt_template_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tagData.id)
    ]);

    let trendingScore = 0;
    const { data: trendData } = await supabase.from('tag_trending_summary').select('score').eq('tag_id', tagData.id);
    if (trendData) {
        trendingScore = trendData.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
    }

    return {
        ...tagData,
        count: (threadRes.count || 0) + (promptRes.count || 0),
        trendingScore
    };
  }

  async recordActivity(event: TagActivityEventDTO): Promise<void> {
    try {
        await supabase.from('tag_activity_events').insert({
            tag_id: event.tag_id,
            entity_type: event.entity_type,
            entity_id: event.entity_id,
            activity_type: event.activity_type,
            actor_id: event.actor_id 
        });
    } catch (e) {
        console.warn("Failed to record tag activity", e);
    }
  }
}
