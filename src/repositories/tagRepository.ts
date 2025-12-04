
import { TagUsage, TagActivityEventDTO, TagRecord } from '../types/tags.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';
import { TagNamingService } from '../services/tagNamingService';

export interface TagRepositoryPort {
  getAllTagsWithCounts(): Promise<TagUsage[]>;
  getTagBySlug(slug: string): Promise<TagUsage | null>;
  recordActivity(event: TagActivityEventDTO): Promise<void>;
  upsertTags(names: string[]): Promise<TagRecord[]>;
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
      const initialTags = [
        'UI/UX', 'Productivity', 'AI', 'Design Systems', 'Marketing', 'React', 'Midjourney', 'ChatGPT'
      ];
      
      const records: TagRecord[] = initialTags.map((name, i) => {
        const { slug } = TagNamingService.normalize(name);
        return {
          id: `tag-${i}`,
          name: name,
          slug: slug,
          description: `Discussions and prompts related to ${name}.`,
          created_at: new Date().toISOString()
        };
      });
      
      storage.setItem(this.TAGS_KEY, JSON.stringify(records));
      
      const activityCache: Record<string, number> = {};
      records.forEach((t, i) => {
        activityCache[t.id] = Math.floor(Math.random() * 100);
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

    // Use Set for unique inputs
    const uniqueNames = new Set(names);

    for (const rawName of uniqueNames) {
      const { name, slug, isValid } = TagNamingService.normalize(rawName);
      
      if (!isValid) continue;

      let existing = allTags.find(t => t.slug === slug);
      
      if (!existing) {
        existing = {
          id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: name, // First creator defines display casing
          slug: slug,
          created_at: new Date().toISOString()
        };
        allTags.push(existing);
        changed = true;
      }
      result.push(existing);
    }

    if (changed) {
      this.saveTags(allTags);
    }
    return result;
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
        count: threadCount + promptCount,
        trendingScore: activityCache[tag.id] || 0
      };
    }).filter(t => t.count > 0 || t.trendingScore > 0);
  }

  async getTagBySlug(slug: string): Promise<TagUsage | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const normalizedSlug = TagNamingService.normalize(slug).slug;
    const tags = await this.getAllTagsWithCounts();
    return tags.find(t => t.slug === normalizedSlug) || null;
  }

  async recordActivity(event: TagActivityEventDTO): Promise<void> {
    // Fire and forget
    setTimeout(() => {
        const activityCache = JSON.parse(storage.getItem(this.ACTIVITY_KEY) || '{}');
        const currentScore = activityCache[event.tag_id] || 0;
        let boost = 1;
        if (event.activity_type === 'created') boost = 10;
        if (event.activity_type === 'reacted') boost = 2;
        
        activityCache[event.tag_id] = currentScore + boost;
        storage.setItem(this.ACTIVITY_KEY, JSON.stringify(activityCache));
    }, 10);
  }
}

export class SupabaseTagRepository implements TagRepositoryPort {
  
  async upsertTags(names: string[]): Promise<TagRecord[]> {
    if (names.length === 0) return [];

    // STRICT: Use TagNamingService for all processing
    const inputs = names
      .map(n => TagNamingService.normalize(n))
      .filter(t => t.isValid)
      .map(t => ({
        slug: t.slug,
        name: t.name
      }));

    if (inputs.length === 0) return [];

    // Deduplicate by slug
    const uniqueInputs = Array.from(new Map(inputs.map(item => [item.slug, item])).values());

    // Tags are globally readable and append-only. 
    // We use upsert with onConflict on 'slug'. 
    // If it exists, we return it. If not, we insert.
    // The RLS allows authenticated users to INSERT tags. UPDATE is generally blocked or restricted.
    const { data, error } = await supabase
      .from('tags')
      .upsert(uniqueInputs, { onConflict: 'slug', ignoreDuplicates: false }) 
      .select();

    if (error) {
        console.error("Tag upsert failed", error);
        throw error;
    }
    return data as TagRecord[];
  }

  async getAllTagsWithCounts(): Promise<TagUsage[]> {
    // Prefer trending summary view if available
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
          created_at: new Date().toISOString(), // View might not have created_at, dummy it or fetch
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
    const { slug: normalizedSlug } = TagNamingService.normalize(slug);
    
    const { data: tagData, error } = await supabase.from('tags').select('*').eq('slug', normalizedSlug).single();
    if (error || !tagData) return null;

    const [threadRes, promptRes] = await Promise.all([
        supabase.from('thread_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tagData.id),
        supabase.from('prompt_template_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tagData.id)
    ]);

    let trendingScore = 0;
    // Attempt to get score from materialized view or summary table
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
        // Activity logging failure should not break the app
        console.warn("Failed to record tag activity", e);
    }
  }
}
