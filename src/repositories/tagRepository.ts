
import { TagUsage, TagActivityEventDTO, TagRecord } from '../types/tags.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';
import { TagNamingService } from '../services/tagNamingService';

export interface TagRepositoryPort {
  getAllTagsWithCounts(): Promise<TagUsage[]>;
  getTagBySlug(slug: string): Promise<TagUsage | null>;
  recordActivity(event: TagActivityEventDTO): Promise<void>;
  recordBatchActivity(events: TagActivityEventDTO[]): Promise<void>;
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
        activityCache[t.id] = Math.floor(Math.random() * 10);
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

    const uniqueNames = new Set(names);

    for (const rawName of uniqueNames) {
      const { name, slug, isValid } = TagNamingService.normalize(rawName);
      
      if (!isValid) continue;

      let existing = allTags.find(t => t.slug === slug);
      
      if (!existing) {
        existing = {
          id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: name,
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
      
      const count = threadCount + promptCount;
      
      return {
        ...tag,
        count: count,
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
    return this.recordBatchActivity([event]);
  }

  async recordBatchActivity(events: TagActivityEventDTO[]): Promise<void> {
    // Mock async
    setTimeout(() => {
        const activityCache = JSON.parse(storage.getItem(this.ACTIVITY_KEY) || '{}');
        
        events.forEach(event => {
            const currentScore = activityCache[event.tag_id] || 0;
            let boost = 1;
            if (event.activity_type === 'created') boost = 10;
            if (event.activity_type === 'reacted') boost = 2;
            activityCache[event.tag_id] = currentScore + boost;
        });

        storage.setItem(this.ACTIVITY_KEY, JSON.stringify(activityCache));
    }, 10);
  }
}

export class SupabaseTagRepository implements TagRepositoryPort {
  
  async upsertTags(names: string[]): Promise<TagRecord[]> {
    if (names.length === 0) return [];

    const inputs = names
      .map(n => TagNamingService.normalize(n))
      .filter(t => t.isValid)
      .map(t => ({
        slug: t.slug,
        name: t.name
      }));

    if (inputs.length === 0) return [];

    const uniqueInputs = Array.from(new Map(inputs.map(item => [item.slug, item])).values());

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
    let trendingMap = new Map<string, any>();

    try {
        const { data: trendingData } = await supabase
          .from('tag_trending_summary')
          .select('*');

        if (trendingData) {
            trendingData.forEach((row: any) => {
                trendingMap.set(row.tag_id, row);
            });
        }
    } catch (e) {
        console.warn("Failed to fetch tag trending summary", e);
    }

    let data: any[] = [];
    
    try {
        const { data: fullData, error } = await supabase
          .from('tags')
          .select(`
            *,
            thread_tags(count),
            prompt_template_tags(count)
          `);
        
        if (error) throw error;
        data = fullData;
    } catch (err) {
        const { data: simpleData, error } = await supabase.from('tags').select('*');
        if (error && error.code !== '42803' && error.code !== 'PGRST116') throw error;
        data = simpleData || [];
    }

    return data.map((tag: any) => {
      const threadCount = tag.thread_tags?.[0]?.count || 0;
      const promptCount = tag.prompt_template_tags?.[0]?.count || 0;
      
      const trendingRow = trendingMap.get(tag.id);
      const trendUsage = trendingRow?.created_count || 0;
      const totalCount = Math.max(threadCount + promptCount, trendUsage);

      return {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        created_at: tag.created_at,
        count: totalCount,
        trendingScore: trendingRow?.score || 0
      };
    }).filter((t: TagUsage) => t.count > 0 || t.trendingScore > 0);
  }

  async getTagBySlug(slug: string): Promise<TagUsage | null> {
    const { slug: normalizedSlug } = TagNamingService.normalize(slug);
    
    const { data: tagData, error } = await supabase.from('tags').select('*').eq('slug', normalizedSlug).single();
    if (error || !tagData) return null;

    let threadCount = 0;
    let promptCount = 0;

    try {
        const [threadRes, promptRes] = await Promise.all([
            supabase.from('thread_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tagData.id),
            supabase.from('prompt_template_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tagData.id)
        ]);
        threadCount = threadRes.count || 0;
        promptCount = promptRes.count || 0;
    } catch (e) {
        console.warn("Failed to fetch tag counts", e);
    }

    let trendingScore = 0;
    try {
        const { data: trendData } = await supabase.from('tag_trending_summary').select('score').eq('tag_id', tagData.id);
        if (trendData) {
            trendingScore = trendData.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
        }
    } catch (e) {
        console.warn("Failed to fetch trending score", e);
    }

    return {
        ...tagData,
        count: threadCount + promptCount,
        trendingScore
    };
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
