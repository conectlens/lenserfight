
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
  private LENSERS_KEY = 'mock_lenser_';

  private getPrompts(): PromptTemplateRecord[] {
    return JSON.parse(storage.getItem(this.PROMPTS_KEY) || '[]');
  }

  private savePrompts(prompts: PromptTemplateRecord[]) {
    storage.setItem(this.PROMPTS_KEY, JSON.stringify(prompts));
  }

  private getAllTags(): TagRecord[] {
    return JSON.parse(storage.getItem(this.TAGS_KEY) || '[]');
  }

  private getPromptTagsRelation(): { template_id: string, tag_id: string }[] {
    return JSON.parse(storage.getItem(this.PROMPT_TAGS_KEY) || '[]');
  }

  private savePromptTagsRelation(rels: { template_id: string, tag_id: string }[]) {
    storage.setItem(this.PROMPT_TAGS_KEY, JSON.stringify(rels));
  }

  private enrich(p: PromptTemplateRecord) {
    const lenserJson = storage.getItem(this.LENSERS_KEY + p.lenser_id);
    let author: any = lenserJson ? JSON.parse(lenserJson) : { display_name: 'Unknown', handle: 'unknown' };

    const allTags = this.getAllTags();
    const rels = this.getPromptTagsRelation();
    const myTagIds = rels.filter(r => r.template_id === p.id).map(r => r.tag_id);
    const myTags = allTags.filter(tag => myTagIds.includes(tag.id));

    return {
      ...p,
      author: {
        id: author.id || p.lenser_id,
        display_name: author.display_name,
        handle: author.handle,
        avatar_url: author.avatar_url
      },
      prompt_template_tags: myTags.map(tag => ({ tag }))
    };
  }

  getAll = async (offset = 0, limit = 10) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const prompts = this.getPrompts().filter(p => p.visibility === 'public');
    prompts.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return prompts.slice(offset, offset + limit).map(p => this.enrich(p));
  };

  search = async (query: string, offset = 0, limit = 10) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const q = query.toLowerCase();
    const prompts = this.getPrompts()
        .filter(p => p.visibility === 'public' && (p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)));
    return prompts.slice(offset, offset + limit).map(p => this.enrich(p));
  };

  filterByTag = async (tagSlug: string | null, offset = 0, limit = 10) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (!tagSlug) return this.getAll(offset, limit);

    const allTags = this.getAllTags();
    const targetTag = allTags.find(t => t.slug === tagSlug);
    if (!targetTag) return [];

    const rels = this.getPromptTagsRelation();
    const ids = rels.filter(r => r.tag_id === targetTag.id).map(r => r.template_id);
    const prompts = this.getPrompts().filter(p => ids.includes(p.id) && p.visibility === 'public');
    
    return prompts.slice(offset, offset + limit).map(p => this.enrich(p));
  };

  sort = async (order: "newest" | "popular", offset = 0, limit = 10) => {
    const prompts = this.getPrompts().filter(p => p.visibility === 'public');
    if (order === 'newest') {
        prompts.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
        // Mock popular
        prompts.sort((a,b) => (b.reaction_totals?.copy || 0) - (a.reaction_totals?.copy || 0));
    }
    return prompts.slice(offset, offset + limit).map(p => this.enrich(p));
  };

  getTopPrompts = async (limit: number) => {
      const prompts = this.getPrompts().filter(p => p.visibility === 'public');
      prompts.sort((a,b) => (b.reaction_totals?.copy || 0) - (a.reaction_totals?.copy || 0));
      return prompts.slice(0, limit).map(p => this.enrich(p));
  };

  getById = async (id: string) => {
    const p = this.getPrompts().find(i => i.id === id);
    return p ? this.enrich(p) : null;
  };

  getTags = async (templateId: string) => {
    const rels = this.getPromptTagsRelation();
    const allTags = this.getAllTags();
    const ids = rels.filter(r => r.template_id === templateId).map(r => r.tag_id);
    return allTags.filter(t => ids.includes(t.id));
  };

  createPrompt = async (input: CreatePromptDTO) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const prompts = this.getPrompts();
    const newPrompt: PromptTemplateRecord = {
        id: `prompt-${Date.now()}`,
        lenser_id: input.lenserId,
        title: input.title,
        description: input.description,
        content: input.content,
        visibility: input.visibility,
        reaction_totals: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    prompts.unshift(newPrompt);
    this.savePrompts(prompts);

    if (input.tagIds && input.tagIds.length > 0) {
        const rels = this.getPromptTagsRelation();
        input.tagIds.forEach(tagId => {
            rels.push({ template_id: newPrompt.id, tag_id: tagId });
        });
        this.savePromptTagsRelation(rels);
    }
    return newPrompt;
  };

  updatePrompt = async (id: string, input: Partial<CreatePromptDTO>) => {
      const prompts = this.getPrompts();
      const idx = prompts.findIndex(p => p.id === id);
      if (idx === -1) throw new Error("Not found");
      const updated = { ...prompts[idx], ...input, updated_at: new Date().toISOString() };
      prompts[idx] = updated as any;
      this.savePrompts(prompts);
      return updated as any;
  };

  deletePrompt = async (id: string) => {
      const prompts = this.getPrompts().filter(p => p.id !== id);
      this.savePrompts(prompts);
  };
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

    if (error) {
        // Gracefully handle Supabase error 42803 (aggregate functions in view)
        if (error.code === '42803') {
            console.warn("SupabasePromptsRepository: 42803 error on tag filter, returning empty.", error);
            return [];
        }
        throw error;
    }
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
