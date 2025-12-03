
import { 
  PromptTemplateRecord, 
  PromptTemplateUsageRecord,
  CreatePromptDTO
} from '../types/prompts.types';
import { TagRecord } from '../types/threads.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

// --- Port (Interface) ---
export interface PromptsRepositoryPort {
  getAll(currentLenserId?: string, offset?: number, limit?: number): Promise<PromptTemplateRecord[]>;
  search(query: string, currentLenserId?: string, offset?: number, limit?: number): Promise<PromptTemplateRecord[]>;
  filterByTag(tagSlug: string | null, currentLenserId?: string, offset?: number, limit?: number): Promise<PromptTemplateRecord[]>;
  sort(order: "newest" | "popular", currentLenserId?: string, offset?: number, limit?: number): Promise<PromptTemplateRecord[]>;
  getTopPrompts(limit: number): Promise<PromptTemplateRecord[]>;
  getById(id: string): Promise<PromptTemplateRecord | null>;
  getTags(templateId: string): Promise<TagRecord[]>;
  getUsage(templateId: string): Promise<PromptTemplateUsageRecord[]>;
  createUsageEvent(templateId: string, action: string, lenserId: string): Promise<void>;
  createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord>;
  updatePrompt(id: string, input: Partial<CreatePromptDTO>): Promise<PromptTemplateRecord>;
  deletePrompt(id: string): Promise<void>;
}

// --- Mock Implementation ---
export class MockPromptsRepository implements PromptsRepositoryPort {
  private PROMPTS_KEY = 'mock_prompts_db';
  private PROMPT_TAGS_KEY = 'mock_prompt_tags';
  private TAGS_KEY = 'mock_tags';
  private USAGE_KEY = 'mock_prompt_usage_db';
  
  constructor() {
      this.seed();
  }

  private seed() {
      if (!storage.getItem(this.PROMPTS_KEY)) {
        const initialPrompts = [
            {
              id: 'prompt-1',
              lenser_id: 'lenser-1',
              title: 'The Art of Storytelling in Product Design',
              description: 'A framework for weaving compelling narratives into product experiences.',
              content: "Introduction...",
              visibility: 'public',
              usage_count: 145,
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
              updated_at: new Date().toISOString()
            }
        ];
        storage.setItem(this.PROMPTS_KEY, JSON.stringify(initialPrompts));
      }
  }

  private getPrompts(): PromptTemplateRecord[] {
      return JSON.parse(storage.getItem(this.PROMPTS_KEY) || '[]');
  }

  private getPromptTagsData(): { template_id: string, tag_id: string }[] {
      return JSON.parse(storage.getItem(this.PROMPT_TAGS_KEY) || '[]');
  }

  // Helper to check visibility including private ownership
  private isVisible(p: PromptTemplateRecord, currentLenserId?: string): boolean {
    return p.visibility === 'public' || (!!currentLenserId && p.lenser_id === currentLenserId);
  }

  private paginate(data: PromptTemplateRecord[], offset = 0, limit = 10): PromptTemplateRecord[] {
      return data.slice(offset, offset + limit);
  }

  async getAll(currentLenserId?: string, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const all = this.getPrompts().filter(p => this.isVisible(p, currentLenserId));
    return this.paginate(all, offset, limit);
  }

  async search(query: string, currentLenserId?: string, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const lowerQ = query.toLowerCase();
    const filtered = this.getPrompts().filter(p => 
      this.isVisible(p, currentLenserId) && (
      p.title.toLowerCase().includes(lowerQ) || 
      (p.description && p.description.toLowerCase().includes(lowerQ)))
    );
    return this.paginate(filtered, offset, limit);
  }

  async filterByTag(tagSlug: string | null, currentLenserId?: string, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const visiblePrompts = this.getPrompts().filter(p => this.isVisible(p, currentLenserId));
    if (!tagSlug) return this.paginate(visiblePrompts, offset, limit);

    const allTags = JSON.parse(storage.getItem(this.TAGS_KEY) || '[]');
    const tag = allTags.find((t: any) => t.slug === tagSlug);
    if (!tag) return [];

    const junctionData = this.getPromptTagsData();
    const promptIds = junctionData.filter(j => j.tag_id === tag.id).map(j => j.template_id);

    return this.paginate(visiblePrompts.filter(p => promptIds.includes(p.id)), offset, limit);
  }

  async sort(order: "newest" | "popular", currentLenserId?: string, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const sorted = this.getPrompts().filter(p => this.isVisible(p, currentLenserId));
    if (order === 'newest') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      sorted.sort((a, b) => b.usage_count - a.usage_count);
    }
    return this.paginate(sorted, offset, limit);
  }

  async getTopPrompts(limit: number): Promise<PromptTemplateRecord[]> {
      await new Promise(resolve => setTimeout(resolve, 300));
      return this.getPrompts()
          .filter(p => p.visibility === 'public')
          .sort((a, b) => b.usage_count - a.usage_count)
          .slice(0, limit);
  }

  async getById(id: string): Promise<PromptTemplateRecord | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.getPrompts().find(p => p.id === id) || null;
  }

  async getTags(templateId: string): Promise<TagRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const junctionData = this.getPromptTagsData();
    const tagIds = junctionData.filter(j => j.template_id === templateId).map(j => j.tag_id);
    
    const allTags = JSON.parse(storage.getItem(this.TAGS_KEY) || '[]');
    return allTags.filter((t: any) => tagIds.includes(t.id));
  }

  async getUsage(templateId: string): Promise<PromptTemplateUsageRecord[]> {
    const usages = JSON.parse(storage.getItem(this.USAGE_KEY) || '[]');
    return usages.filter((u: any) => u.template_id === templateId);
  }

  async createUsageEvent(templateId: string, action: string, lenserId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const usages = JSON.parse(storage.getItem(this.USAGE_KEY) || '[]');
    usages.push({
      id: `use-${Date.now()}`,
      template_id: templateId,
      lenser_id: lenserId,
      action,
      created_at: new Date().toISOString()
    });
    storage.setItem(this.USAGE_KEY, JSON.stringify(usages));

    // Update count on prompt record
    const prompts = this.getPrompts();
    const prompt = prompts.find(p => p.id === templateId);
    if (prompt) {
      prompt.usage_count += 1;
      storage.setItem(this.PROMPTS_KEY, JSON.stringify(prompts));
    }
  }

  async createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newPrompt: PromptTemplateRecord = {
      id: `prompt-${Date.now()}`,
      lenser_id: input.lenserId,
      title: input.title,
      description: input.description,
      content: input.content,
      visibility: input.visibility,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const prompts = this.getPrompts();
    prompts.unshift(newPrompt);
    storage.setItem(this.PROMPTS_KEY, JSON.stringify(prompts));

    // Store Tag Relations (tagIds are UUIDs now)
    if (input.tagIds && input.tagIds.length > 0) {
      const junctionData = this.getPromptTagsData();
      input.tagIds.forEach(tagId => {
          junctionData.push({ template_id: newPrompt.id, tag_id: tagId });
      });
      storage.setItem(this.PROMPT_TAGS_KEY, JSON.stringify(junctionData));
    }

    return newPrompt;
  }

  async updatePrompt(id: string, input: Partial<CreatePromptDTO>): Promise<PromptTemplateRecord> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const prompts = this.getPrompts();
    const index = prompts.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Prompt not found");

    const updated = {
        ...prompts[index],
        ...input,
        // Don't update usage_count or timestamps via basic update typically
        updated_at: new Date().toISOString()
    };
    
    prompts[index] = updated as PromptTemplateRecord;
    storage.setItem(this.PROMPTS_KEY, JSON.stringify(prompts));

    // Update tags if provided
    if (input.tagIds) {
        let junctionData = this.getPromptTagsData();
        // Remove old tags
        junctionData = junctionData.filter(j => j.template_id !== id);
        // Add new
        input.tagIds.forEach(tagId => {
            junctionData.push({ template_id: id, tag_id: tagId });
        });
        storage.setItem(this.PROMPT_TAGS_KEY, JSON.stringify(junctionData));
    }

    return updated as PromptTemplateRecord;
  }

  async deletePrompt(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const prompts = this.getPrompts();
    const filtered = prompts.filter(p => p.id !== id);
    storage.setItem(this.PROMPTS_KEY, JSON.stringify(filtered));
  }
}

// --- Supabase Implementation ---
export class SupabasePromptsRepository implements PromptsRepositoryPort {
  async getAll(currentLenserId?: string, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    const builder = supabase.from('prompt_templates').select('*').range(offset, offset + limit - 1);
    const { data, error } = await builder;
    if (error) throw error;
    return data as PromptTemplateRecord[];
  }

  async search(query: string, currentLenserId?: string, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase.from('prompt_templates')
        .select('*')
        .ilike('title', `%${query}%`)
        .range(offset, offset + limit - 1);
    if (error) throw error;
    return data as PromptTemplateRecord[];
  }

  async filterByTag(tagSlug: string | null, currentLenserId?: string, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    if (!tagSlug) return this.getAll(currentLenserId, offset, limit);
    
    const { data, error } = await supabase
        .from('prompt_templates')
        .select('*, prompt_template_tags!inner(tag_id, tags!inner(slug))')
        .eq('prompt_template_tags.tags.slug', tagSlug)
        .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as PromptTemplateRecord[];
  }

  async sort(order: "newest" | "popular", currentLenserId?: string, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    const builder = supabase.from('prompt_templates').select('*');
    if (order === 'newest') builder.order('created_at', { ascending: false });
    else builder.order('usage_count', { ascending: false });
    
    const { data, error } = await builder.range(offset, offset + limit - 1);
    if (error) throw error;
    return data as PromptTemplateRecord[];
  }

  async getTopPrompts(limit: number): Promise<PromptTemplateRecord[]> {
      const { data, error } = await supabase.from('prompt_templates').select('*').eq('visibility', 'public').order('usage_count', { ascending: false }).limit(limit);
      if (error) throw error;
      return data as PromptTemplateRecord[];
  }

  async getById(id: string): Promise<PromptTemplateRecord | null> {
    const { data, error } = await supabase.from('prompt_templates').select('*').eq('id', id).single();
    if (error) throw error;
    return data as PromptTemplateRecord;
  }

  async getTags(templateId: string): Promise<TagRecord[]> {
    const { data, error } = await supabase.from('prompt_template_tags').select('tags(*)').eq('template_id', templateId);
    if (error) throw error;
    // @ts-ignore
    return data.map(d => d.tags);
  }

  async getUsage(templateId: string): Promise<PromptTemplateUsageRecord[]> {
    const { data, error } = await supabase.from('prompt_template_usage').select('*').eq('template_id', templateId);
     if (error) throw error;
     return data as PromptTemplateUsageRecord[];
  }

  async createUsageEvent(templateId: string, action: string, lenserId: string): Promise<void> {
    const { error } = await supabase.from('prompt_template_usage').insert({ template_id: templateId, action, lenser_id: lenserId });
    if (error) throw error;
  }

  async createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord> {
    const { data: prompt, error } = await supabase.from('prompt_templates')
        .insert({ 
            lenser_id: input.lenserId, 
            title: input.title, 
            description: input.description, 
            content: input.content, 
            visibility: input.visibility 
        })
        .select().single();
    if (error) throw error;

    if (input.tagIds && input.tagIds.length > 0) {
        const junctionInserts = input.tagIds.map(tagId => ({
            template_id: prompt.id,
            tag_id: tagId
        }));
        const { error: tagError } = await supabase.from('prompt_template_tags').insert(junctionInserts);
        if (tagError) console.error("Failed to link tags", tagError);
    }

    return prompt as PromptTemplateRecord;
  }

  async updatePrompt(id: string, input: Partial<CreatePromptDTO>): Promise<PromptTemplateRecord> {
      const { data, error } = await supabase
        .from('prompt_templates')
        .update({
            title: input.title,
            description: input.description,
            content: input.content,
            visibility: input.visibility,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      if (input.tagIds) {
          // Delete old
          await supabase.from('prompt_template_tags').delete().eq('template_id', id);
          // Insert new
          const junctionInserts = input.tagIds.map(tagId => ({
            template_id: id,
            tag_id: tagId
          }));
          await supabase.from('prompt_template_tags').insert(junctionInserts);
      }

      return data as PromptTemplateRecord;
  }

  async deletePrompt(id: string): Promise<void> {
      const { error } = await supabase.from('prompt_templates').delete().eq('id', id);
      if (error) throw error;
  }
}
