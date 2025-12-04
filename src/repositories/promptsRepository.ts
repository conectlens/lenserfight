
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
  // Keeping simplified mock implementation for compatibility
  private PROMPTS_KEY = 'mock_prompts_db';
  getAll = async () => [];
  search = async () => [];
  filterByTag = async () => [];
  sort = async () => [];
  getTopPrompts = async () => [];
  getById = async () => null;
  getTags = async () => [];
  createPrompt = async (i: any) => i;
  updatePrompt = async (i: any) => i;
  deletePrompt = async () => {};
}

// --- Supabase Implementation ---
export class SupabasePromptsRepository implements PromptsRepositoryPort {
  
  // Optimized Selection: Fetches Prompt + Author + Tags + (Totals via JSONB)
  private get promptSelect() {
    return `
      *,
      author:lensers!lenser_id (
        id, display_name, handle, avatar_url
      ),
      prompt_template_tags (
        tag:tags (
          id, name, slug
        )
      )
    `;
  }

  async getAll(offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase
        .from('prompt_templates')
        .select(this.promptSelect)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
        
    if (error) throw error;
    return data as any;
  }

  async search(query: string, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase
        .from('prompt_templates')
        .select(this.promptSelect)
        .eq('visibility', 'public')
        .ilike('title', `%${query}%`)
        .range(offset, offset + limit - 1);
    if (error) throw error;
    return data as any;
  }

  async filterByTag(tagSlug: string | null, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    if (!tagSlug) return this.getAll(offset, limit);
    
    // Filtering by deep relation
    const { data, error } = await supabase
        .from('prompt_templates')
        .select(`${this.promptSelect}, prompt_template_tags!inner(tag:tags!inner(slug))`)
        .eq('visibility', 'public')
        .eq('prompt_template_tags.tags.slug', tagSlug)
        .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as any;
  }

  async sort(order: "newest" | "popular", offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    let builder = supabase.from('prompt_templates').select(this.promptSelect).eq('visibility', 'public');
    
    if (order === 'newest') builder = builder.order('created_at', { ascending: false });
    else builder = builder.order('reaction_totals->>copy', { ascending: false });
    
    const { data, error } = await builder.range(offset, offset + limit - 1);
    if (error) throw error;
    return data as any;
  }

  async getTopPrompts(limit: number): Promise<PromptTemplateRecord[]> {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select(this.promptSelect)
        .eq('visibility', 'public')
        .order('reaction_totals->>copy', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as any;
  }

  async getById(id: string): Promise<PromptTemplateRecord | null> {
    const { data, error } = await supabase
        .from('prompt_templates')
        .select(this.promptSelect)
        .eq('id', id)
        .single();
    if (error) throw error;
    return data as any;
  }

  async getTags(templateId: string): Promise<TagRecord[]> {
    const { data, error } = await supabase.from('prompt_template_tags').select('tags(*)').eq('template_id', templateId);
    if (error) throw error;
    // @ts-ignore
    return data.map(d => d.tags);
  }

  async createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord> {
    const { data: prompt, error } = await supabase.from('prompt_templates')
        .insert({ 
            lenser_id: input.lenserId, 
            title: input.title, 
            description: input.description, 
            content: input.content, 
            visibility: input.visibility,
            reaction_totals: {} 
        })
        .select().single();
    if (error) throw error;

    if (input.tagIds && input.tagIds.length > 0) {
        const junctionInserts = input.tagIds.map(tagId => ({
            template_id: prompt.id,
            tag_id: tagId
        }));
        await supabase.from('prompt_template_tags').insert(junctionInserts);
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
