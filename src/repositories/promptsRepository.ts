
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
  getByLenser(handle: string, offset?: number, limit?: number, includePrivate?: boolean): Promise<PromptTemplateRecord[]>;
  getById(id: string): Promise<PromptTemplateRecord | null>;
  getTags(templateId: string): Promise<TagRecord[]>;
  createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord>;
  updatePrompt(id: string, input: Partial<CreatePromptDTO>): Promise<PromptTemplateRecord>;
  deletePrompt(id: string): Promise<void>;
  updateReactionTotals(id: string, totals: Record<string, number>): Promise<void>;
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

  getAll = async (offset = 0, limit = 10) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const prompts = this.getPrompts().filter(p => p.visibility === 'public');
    prompts.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return prompts.slice(offset, offset + limit);
  };

  search = async (query: string, offset = 0, limit = 10) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const q = query.toLowerCase();
    const prompts = this.getPrompts()
        .filter(p => p.visibility === 'public' && (p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)));
    return prompts.slice(offset, offset + limit);
  };

  filterByTag = async (tagSlug: string | null, offset = 0, limit = 10) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (!tagSlug) return this.getAll(offset, limit);

    // Read directly from denormalized tags column
    const prompts = this.getPrompts()
        .filter(p => p.visibility === 'public' && p.tags && p.tags.some(t => t.slug === tagSlug));
    
    return prompts.slice(offset, offset + limit);
  };

  sort = async (order: "newest" | "popular", offset = 0, limit = 10) => {
    const prompts = this.getPrompts().filter(p => p.visibility === 'public');
    if (order === 'newest') {
        prompts.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
        prompts.sort((a,b) => (b.reaction_totals?.copy || 0) - (a.reaction_totals?.copy || 0));
    }
    return prompts.slice(offset, offset + limit);
  };

  getTopPrompts = async (limit: number) => {
      const prompts = this.getPrompts().filter(p => p.visibility === 'public');
      prompts.sort((a,b) => (b.reaction_totals?.copy || 0) - (a.reaction_totals?.copy || 0));
      return prompts.slice(0, limit);
  };

  getByLenser = async (handle: string, offset = 0, limit = 10, includePrivate = false) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Filter by handle using the denormalized profile
    let prompts = this.getPrompts().filter(p => p.author_profile?.handle === handle);
    
    if (!includePrivate) {
        prompts = prompts.filter(p => p.visibility === 'public');
    }
    prompts.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return prompts.slice(offset, offset + limit);
  };

  getById = async (id: string) => {
    const p = this.getPrompts().find(i => i.id === id);
    return p || null;
  };

  getTags = async (templateId: string) => {
    const p = this.getPrompts().find(i => i.id === templateId);
    return p?.tags || [];
  };

  createPrompt = async (input: CreatePromptDTO) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const prompts = this.getPrompts();
    const allTags = this.getAllTags();
    
    // Denormalization
    const authorProfile = this.getAuthorProfile(input.lenserId);
    const resolvedTags = input.tagIds ? allTags.filter(t => input.tagIds.includes(t.id)) : [];

    const newPrompt: PromptTemplateRecord = {
        id: `prompt-${Date.now()}`,
        lenser_id: input.lenserId,
        author_profile: authorProfile,
        title: input.title,
        description: input.description,
        content: input.content,
        visibility: input.visibility,
        reaction_totals: {},
        tags: resolvedTags,
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
      
      const allTags = this.getAllTags();
      const newTags = input.tagIds ? allTags.filter(t => input.tagIds!.includes(t.id)) : prompts[idx].tags;

      const updated = { 
          ...prompts[idx], 
          ...input, 
          tags: newTags, // Update denormalized column
          updated_at: new Date().toISOString() 
      };
      
      // @ts-ignore
      prompts[idx] = updated;
      this.savePrompts(prompts);
      return updated as any;
  };

  deletePrompt = async (id: string) => {
      const prompts = this.getPrompts().filter(p => p.id !== id);
      this.savePrompts(prompts);
  };

  updateReactionTotals = async (id: string, totals: Record<string, number>) => {
      const prompts = this.getPrompts();
      const idx = prompts.findIndex(p => p.id === id);
      if (idx !== -1) {
          prompts[idx].reaction_totals = totals;
          this.savePrompts(prompts);
      }
  };
}

// --- Supabase Implementation ---
// --- Supabase Implementation ---
export class SupabasePromptsRepository implements PromptsRepositoryPort {
  
  private handleError(error: any) {
    if (!error) return;
    if (error.code === '42501' || error.message?.includes('permission denied')) {
      throw new Error("This prompt or its associated data is private or hidden and cannot be accessed.");
    }
    throw error;
  }

  private get promptSelect() {
    return '*';
  }

  // -----------------------------------------------------
  // READ OPERATIONS (Views only, never touching base tables)
  // -----------------------------------------------------

  async getAll(offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) this.handleError(error);
    return data as PromptTemplateRecord[];
  }

  async search(query: string, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .ilike('title', `%${query}%`)
      .range(offset, offset + limit - 1);

    if (error) this.handleError(error);
    return data as PromptTemplateRecord[];
  }

  async filterByTag(tagSlug: string | null, offset = 0, limit = 10): Promise<PromptTemplateRecord[]> {
    if (!tagSlug) return this.getAll(offset, limit);

    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .contains('tags', JSON.stringify([{ slug: tagSlug }]))
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) this.handleError(error);
    return data as PromptTemplateRecord[];
  }

  async sort(
    order: "newest" | "popular",
    offset = 0,
    limit = 10
  ): Promise<PromptTemplateRecord[]> {
    let builder = supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect);

    if (order === 'newest') {
      builder = builder.order('created_at', { ascending: false });
    } else {
      builder = builder.order('reaction_totals->>copy', { ascending: false });
    }

    const { data, error } = await builder.range(offset, offset + limit - 1);
    if (error) this.handleError(error);
    return data as PromptTemplateRecord[];
  }

  async getTopPrompts(limit: number): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .order('reaction_totals->>copy', { ascending: false })
      .limit(limit);

    if (error) this.handleError(error);
    return data as PromptTemplateRecord[];
  }

  async getByLenser(
    handle: string,
    offset = 0,
    limit = 10,
    includePrivate = false // ignored unless you build private-author view
  ): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .eq('author_profile->>handle', handle)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) this.handleError(error);
    return data as PromptTemplateRecord[];
  }

  async getById(id: string): Promise<PromptTemplateRecord | null> {
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      this.handleError(error);
    }
    return data as PromptTemplateRecord;
  }

  async getTags(templateId: string): Promise<TagRecord[]> {
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select('tags')
      .eq('id', templateId)
      .single();

    if (error) return [];
    return (data?.tags as TagRecord[]) || [];
  }

  // -----------------------------------------------------
  // WRITE OPERATIONS (RPC-only, secure, RLS-safe)
  // -----------------------------------------------------

  async createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord> {
    const { data: promptId, error: rpcError } = await supabase.rpc(
      'fn_content_create_prompt_template',
      {
        p_title: input.title,
        p_description: input.description ?? null,
        p_content: input.content,
        p_visibility: input.visibility,
        p_tag_ids: input.tagIds?.length ? input.tagIds : null
      }
    );

    if (rpcError) this.handleError(rpcError);

    // Fetch from view
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .eq('id', promptId)
      .single();

    if (error) this.handleError(error);
    return data as PromptTemplateRecord;
  }

  async updatePrompt(id: string, input: Partial<CreatePromptDTO>): Promise<PromptTemplateRecord> {
    const { error: rpcError } = await supabase.rpc(
      'fn_content_update_prompt',
      {
        p_id: id,
        p_title: input.title ?? null,
        p_description: input.description ?? null,
        p_content: input.content ?? null,
        p_visibility: input.visibility ?? null,
        p_tag_ids: input.tagIds !== undefined ? input.tagIds : null
      }
    );

    if (rpcError) this.handleError(rpcError);

    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.promptSelect)
      .eq('id', id)
      .single();

    if (error) this.handleError(error);
    return data as PromptTemplateRecord;
  }

  async deletePrompt(id: string): Promise<void> {
    const { error } = await supabase.rpc('fn_content_delete_prompt', {
      p_id: id
    });
    if (error) this.handleError(error);
  }

  async updateReactionTotals(id: string, totals: Record<string, number>): Promise<void> {
    const { error } = await supabase.rpc(
      'fn_content_update_prompt_reaction_totals',
      {
        p_id: id,
        p_totals: totals
      }
    );
    if (error) console.error("Failed to sync totals", error);
  }
}
