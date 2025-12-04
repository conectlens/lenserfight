
import { 
  PromptTemplateRecord, 
  CreatePromptDTO
} from '../types/prompts.types';
import { TagRecord } from '../types/threads.types';
import { AuthorProfile } from '../types/lenser.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

// --- Port (Interface) ---
export interface PromptsRepositoryPort {
  getAll(offset?: number, limit?: number): Promise<PromptTemplateRecord[]>;
  search(query: string, offset?: number, limit?: number): Promise<PromptTemplateRecord[]>;
  filterByTag(tagSlug: string | null, offset?: number, limit?: number): Promise<PromptTemplateRecord[]>;
  sort(order: "newest" | "popular", offset?: number, limit?: number): Promise<PromptTemplateRecord[]>;
  getTopPrompts(limit: number): Promise<PromptTemplateRecord[]>;
  getByAuthor(lenserId: string, offset?: number, limit?: number, includePrivate?: boolean): Promise<PromptTemplateRecord[]>;
  getById(id: string): Promise<PromptTemplateRecord | null>;
  getTags(templateId: string): Promise<TagRecord[]>;
  createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord>;
  updatePrompt(id: string, input: Partial<CreatePromptDTO>): Promise<PromptTemplateRecord>;
  deletePrompt(id: string): Promise<void>;
}

// Fallback data for Mock Mode
const MOCK_PROFILES: Record<string, AuthorProfile> = {
    'lenser-1': { id: 'lenser-1', handle: 'cassian.lens', display_name: 'Cassian', avatar_url: 'https://ui-avatars.com/api/?name=Cassian&background=111&color=fff' },
    'lenser-2': { id: 'lenser-2', handle: 'samantha_bee', display_name: 'Samantha Bee', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80' },
    'lenser-3': { id: 'lenser-3', handle: 'dev_lane', display_name: 'Devon Lane', avatar_url: 'https://ui-avatars.com/api/?name=Devon&background=random' },
    'lenser-4': { id: 'lenser-4', handle: 'courtney_h', display_name: 'Courtney Henry', avatar_url: 'https://ui-avatars.com/api/?name=Courtney&background=random' }
};

// --- Mock Implementation ---
export class MockPromptsRepository implements PromptsRepositoryPort {
  private PROMPTS_KEY = 'mock_prompts_db';
  private PROMPT_TAGS_KEY = 'mock_prompt_tags';
  private TAGS_KEY = 'mock_tags';
  private INDEX_KEY = 'mock_lensers_index';

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

  private getAuthorProfile(lenserId: string): AuthorProfile {
    if (MOCK_PROFILES[lenserId]) return MOCK_PROFILES[lenserId];

    const indexJson = storage.getItem(this.INDEX_KEY);
    const index = indexJson ? JSON.parse(indexJson) : [];
    const author = index.find((l: any) => l.id === lenserId);
    if (author) {
        return {
            id: author.id,
            handle: author.handle,
            display_name: author.display_name,
            avatar_url: author.avatar_url
        };
    }
    return { id: lenserId, handle: 'unknown', display_name: 'Unknown' };
  }

  private enrichPrompt(p: PromptTemplateRecord): PromptTemplateRecord {
      if (!p.author_profile || p.author_profile.handle === 'unknown') {
          return { ...p, author_profile: this.getAuthorProfile(p.lenser_id) };
      }
      return p;
  }

  private attachTags(p: PromptTemplateRecord) {
    const enriched = this.enrichPrompt(p);
    const allTags = this.getAllTags();
    const rels = this.getPromptTagsRelation();
    const myTagIds = rels.filter(r => r.template_id === enriched.id).map(r => r.tag_id);
    const myTags = allTags.filter(tag => myTagIds.includes(tag.id));

    return {
      ...enriched,
      prompt_template_tags: myTags.map(tag => ({ tag }))
    };
  }

  getAll = async (offset = 0, limit = 10) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const prompts = this.getPrompts().filter(p => p.visibility === 'public');
    prompts.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return prompts.slice(offset, offset + limit).map(p => this.attachTags(p));
  };

  search = async (query: string, offset = 0, limit = 10) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const q = query.toLowerCase();
    const prompts = this.getPrompts()
        .filter(p => p.visibility === 'public' && (p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)));
    return prompts.slice(offset, offset + limit).map(p => this.attachTags(p));
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
    
    return prompts.slice(offset, offset + limit).map(p => this.attachTags(p));
  };

  sort = async (order: "newest" | "popular", offset = 0, limit = 10) => {
    const prompts = this.getPrompts().filter(p => p.visibility === 'public');
    if (order === 'newest') {
        prompts.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
        prompts.sort((a,b) => (b.reaction_totals?.copy || 0) - (a.reaction_totals?.copy || 0));
    }
    return prompts.slice(offset, offset + limit).map(p => this.attachTags(p));
  };

  getTopPrompts = async (limit: number) => {
      const prompts = this.getPrompts().filter(p => p.visibility === 'public');
      prompts.sort((a,b) => (b.reaction_totals?.copy || 0) - (a.reaction_totals?.copy || 0));
      return prompts.slice(0, limit).map(p => this.attachTags(p));
  };

  getByAuthor = async (lenserId: string, offset = 0, limit = 10, includePrivate = false) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    let prompts = this.getPrompts().filter(p => p.lenser_id === lenserId);
    if (!includePrivate) {
        prompts = prompts.filter(p => p.visibility === 'public');
    }
    prompts.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return prompts.slice(offset, offset + limit).map(p => this.attachTags(p));
  };

  getById = async (id: string) => {
    const p = this.getPrompts().find(i => i.id === id);
    return p ? this.attachTags(p) : null;
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
    const authorProfile = this.getAuthorProfile(input.lenserId);

    const newPrompt: PromptTemplateRecord = {
        id: `prompt-${Date.now()}`,
        lenser_id: input.lenserId,
        author_profile: authorProfile,
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
    return this.attachTags(newPrompt);
  };

  updatePrompt = async (id: string, input: Partial<CreatePromptDTO>) => {
      const prompts = this.getPrompts();
      const idx = prompts.findIndex(p => p.id === id);
      if (idx === -1) throw new Error("Not found");
      const updated = { ...prompts[idx], ...input, updated_at: new Date().toISOString() };
      // @ts-ignore
      prompts[idx] = updated;
      this.savePrompts(prompts);
      return this.attachTags(updated as any);
  };

  deletePrompt = async (id: string) => {
      const prompts = this.getPrompts().filter(p => p.id !== id);
      this.savePrompts(prompts);
  };
}

// --- Supabase Implementation ---
export class SupabasePromptsRepository implements PromptsRepositoryPort {
  
  // Clean select without joins to 'lensers'
  private get promptSelect() {
    return `
      *,
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
    
    // Step 1: Get Tag ID
    const { data: tag } = await supabase.from('tags').select('id').eq('slug', tagSlug).single();
    if (!tag) return [];

    // Step 2: Get Template IDs from Junction
    const { data: junctionData } = await supabase
        .from('prompt_template_tags')
        .select('template_id')
        .eq('tag_id', tag.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (!junctionData || junctionData.length === 0) return [];
    const templateIds = junctionData.map(r => r.template_id);

    // Step 3: Fetch Full Details
    const { data, error } = await supabase
        .from('prompt_templates')
        .select(this.promptSelect)
        .in('id', templateIds)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

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

  async getByAuthor(lenserId: string, offset = 0, limit = 10, includePrivate = false): Promise<PromptTemplateRecord[]> {
    let query = supabase
        .from('prompt_templates')
        .select(this.promptSelect)
        .eq('lenser_id', lenserId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (!includePrivate) {
        query = query.eq('visibility', 'public');
    }

    const { data, error } = await query;
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
