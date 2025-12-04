
import { 
  PromptTemplateRecord, 
  CreatePromptDTO
} from '../types/prompts.types';
import { TagRecord } from '../types/threads.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

// --- Port (Interface) ---
export interface PromptsRepositoryPort {
  getAll(offset?: number, limit?: number): Promise<PromptTemplateRecord[]>;
  search(query: string, offset?: number, limit?: number): Promise<PromptTemplateRecord[]>;
  filterByTag(tagSlug: string | null, offset?: number, limit?: number): Promise<PromptTemplateRecord[]>;
  sort(order: "newest" | "popular", offset?: number, limit?: number): Promise<PromptTemplateRecord[]>;
  getTopPrompts(limit: number): Promise<PromptTemplateRecord[]>;
  getById(id: string): Promise<PromptTemplateRecord | null>;
  getTags(templateId: string): Promise<TagRecord[]>;
  createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord>;
  updatePrompt(id: string, input: Partial<CreatePromptDTO>): Promise<PromptTemplateRecord>;
  deletePrompt(id: string): Promise<void>;
}

// --- Mock Implementation ---
export class MockPromptsRepository implements PromptsRepositoryPort {
  private PROMPTS_KEY = 'mock_prompts_db';
  private PROMPT_TAGS_KEY = 'mock_prompt_tags';
  private TAGS_KEY = 'mock_tags';
  
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
              reaction_totals: { like: 10, saved: 5, copy: 145 },
              save_count: 5,
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

  private isPublic(p: PromptTemplateRecord): boolean {
    return p.visibility === 'public';
  }

  private paginate(data: PromptTemplateRecord[], offset = 0, limit = 10): PromptTemplateRecord[] {
      return data.slice(offset, offset + limit);
  }

  private getUsageCount(p: PromptTemplateRecord): number {
      return p.reaction_totals?.copy || 0;
  }

  async getAll(offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const all = this.getPrompts().filter(p => this.isPublic(p));
    return this.paginate(all, offset, limit);
  }

  async search(query: string, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const lowerQ = query.toLowerCase();
    const filtered = this.getPrompts().filter(p => 
      this.isPublic(p) && (
      p.title.toLowerCase().includes(lowerQ) || 
      (p.description && p.description.toLowerCase().includes(lowerQ)))
    );
    return this.paginate(filtered, offset, limit);
  }

  async filterByTag(tagSlug: string | null, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const visiblePrompts = this.getPrompts().filter(p => this.isPublic(p));
    if (!tagSlug) return this.paginate(visiblePrompts, offset, limit);

    const allTags = JSON.parse(storage.getItem(this.TAGS_KEY) || '[]');
    const tag = allTags.find((t: any) => t.slug === tagSlug);
    if (!tag) return [];

    const junctionData = this.getPromptTagsData();
    const promptIds = junctionData.filter(j => j.tag_id === tag.id).map(j => j.template_id);

    return this.paginate(visiblePrompts.filter(p => promptIds.includes(p.id)), offset, limit);
  }

  async sort(order: "newest" | "popular", offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const sorted = this.getPrompts().filter(p => this.isPublic(p));
    if (order === 'newest') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      sorted.sort((a, b) => this.getUsageCount(b) - this.getUsageCount(a));
    }
    return this.paginate(sorted, offset, limit);
  }

  async getTopPrompts(limit: number): Promise<PromptTemplateRecord[]> {
      await new Promise(resolve => setTimeout(resolve, 300));
      return this.getPrompts()
          .filter(p => p.visibility === 'public')
          .sort((a, b) => this.getUsageCount(b) - this.getUsageCount(a))
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

  async createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newPrompt: PromptTemplateRecord = {
      id: `prompt-${Date.now()}`,
      lenser_id: input.lenserId,
      title: input.title,
      description: input.description,
      content: input.content,
      visibility: input.visibility,
      reaction_totals: { copy: 0, like: 0, saved: 0 },
      save_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const prompts = this.getPrompts();
    prompts.unshift(newPrompt);
    storage.setItem(this.PROMPTS_KEY, JSON.stringify(prompts));

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
        updated_at: new Date().toISOString()
    };
    
    prompts[index] = updated as PromptTemplateRecord;
    storage.setItem(this.PROMPTS_KEY, JSON.stringify(prompts));

    if (input.tagIds) {
        let junctionData = this.getPromptTagsData();
        // Mocking RLS strictness: we replace all tags by deleting old and inserting new
        junctionData = junctionData.filter(j => j.template_id !== id);
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
  async getAll(offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    const builder = supabase.from('prompt_templates').select('*')
        .eq('visibility', 'public')
        .range(offset, offset + limit - 1);
    const { data, error } = await builder;
    if (error) throw error;
    return data as PromptTemplateRecord[];
  }

  async search(query: string, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase.from('prompt_templates')
        .select('*')
        .eq('visibility', 'public')
        .ilike('title', `%${query}%`)
        .range(offset, offset + limit - 1);
    if (error) throw error;
    return data as PromptTemplateRecord[];
  }

  async filterByTag(tagSlug: string | null, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    if (!tagSlug) return this.getAll(offset, limit);
    
    const { data, error } = await supabase
        .from('prompt_templates')
        .select('*, prompt_template_tags!inner(tag_id, tags!inner(slug))')
        .eq('visibility', 'public')
        .eq('prompt_template_tags.tags.slug', tagSlug)
        .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as PromptTemplateRecord[];
  }

  async sort(order: "newest" | "popular", offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    const builder = supabase.from('prompt_templates').select('*').eq('visibility', 'public');
    if (order === 'newest') builder.order('created_at', { ascending: false });
    else {
        // Popularity via copy count stored in reaction_totals JSONB
        builder.order('reaction_totals->>copy', { ascending: false });
    }
    
    const { data, error } = await builder.range(offset, offset + limit - 1);
    if (error) throw error;
    return data as PromptTemplateRecord[];
  }

  async getTopPrompts(limit: number): Promise<PromptTemplateRecord[]> {
      const { data, error } = await supabase.from('prompt_templates').select('*')
        .eq('visibility', 'public')
        .order('reaction_totals->>copy', { ascending: false })
        .limit(limit);
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

  async createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord> {
    // Note: User ID inferred from Auth context by RLS/Triggers in many setups, 
    // but explicit lenser_id (profile id) is often required if user != lenser 1:1 in DB logic.
    // Assuming backend validates lenser_id belongs to auth.uid().
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
            // user_agent: handled by backend/client defaults if needed
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
          // Strictly delete then insert. Update is not allowed on junction tables via RLS.
          // RLS ensures only the owner can delete/insert.
          await supabase.from('prompt_template_tags').delete().eq('template_id', id);
          
          if (input.tagIds.length > 0) {
              const junctionInserts = input.tagIds.map(tagId => ({
                template_id: id,
                tag_id: tagId
              }));
              await supabase.from('prompt_template_tags').insert(junctionInserts);
          }
      }

      return data as PromptTemplateRecord;
  }

  async deletePrompt(id: string): Promise<void> {
      const { error } = await supabase.from('prompt_templates').delete().eq('id', id);
      if (error) throw error;
  }
}
