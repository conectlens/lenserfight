import { 
  PromptTemplateRecord, 
  PromptTemplateReactionRecord, 
  PromptTemplateUsageRecord,
  ReactionEnum,
  CreatePromptDTO
} from '../types/prompts.types';
import { TagRecord } from '../types/threads.types';
import { supabase } from '../utils/supabase';

// --- Port (Interface) ---
export interface PromptsRepositoryPort {
  getAll(): Promise<PromptTemplateRecord[]>;
  search(query: string): Promise<PromptTemplateRecord[]>;
  filterByTag(tagSlug: string | null): Promise<PromptTemplateRecord[]>;
  sort(order: "newest" | "popular"): Promise<PromptTemplateRecord[]>;
  getTopPrompts(limit: number): Promise<PromptTemplateRecord[]>;
  getById(id: string): Promise<PromptTemplateRecord | null>;
  getTags(templateId: string): Promise<TagRecord[]>;
  getReactions(templateId: string): Promise<PromptTemplateReactionRecord[]>;
  getUsage(templateId: string): Promise<PromptTemplateUsageRecord[]>;
  createUsageEvent(templateId: string, action: string, lenserId: string): Promise<void>;
  addReaction(templateId: string, lenserId: string, reaction: ReactionEnum): Promise<void>;
  removeReaction(templateId: string, lenserId: string, reaction: ReactionEnum): Promise<void>;
  createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord>;
}

// --- Mock Implementation ---
export class MockPromptsRepository implements PromptsRepositoryPort {
  
  // Mock Data Store
  private prompts: PromptTemplateRecord[] = [
    {
      id: 'prompt-1',
      lenser_id: 'lenser-1',
      title: 'The Art of Storytelling in Product Design',
      description: 'A framework for weaving compelling narratives into product experiences.',
      content: "Introduction:\nStart with the 'Why'. Define the core problem your product solves in emotional terms.\n\nThe Conflict:\nDescribe the user's current struggle. What is the villain in their story? (e.g., complexity, wasted time).\n\nThe Resolution:\nPresent your product as the magical tool that helps the hero (user) overcome the villain.\n\nCall to Action:\nInvite them to start their new journey.",
      visibility: 'public',
      usage_count: 145,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'prompt-2',
      lenser_id: 'lenser-2',
      title: 'UX Writing for Onboarding Flows',
      description: 'Create clear, concise, and encouraging text for new user onboarding.',
      content: "Step 1: Welcome\n[Warm Greeting] + [Value Prop]\n\nStep 2: Setup\n[Action Instruction] + [Benefit of Action]\n\nStep 3: Success\n[Celebration] + [Next Step]",
      visibility: 'public',
      usage_count: 89,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'prompt-3',
      lenser_id: 'lenser-1',
      title: 'Crafting a Compelling Brand Narrative',
      description: 'Define your brand voice, tone, and key messaging pillars.',
      content: "Brand Archetype: [Select Archetype]\n\nVoice Characteristics:\n1. [Trait 1]\n2. [Trait 2]\n\nTagline Options:\n- Option A\n- Option B",
      visibility: 'public',
      usage_count: 320,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'prompt-4',
      lenser_id: 'lenser-seneca',
      title: 'Generating Viral Marketing Hooks',
      description: 'Formulas for creating attention-grabbing headlines and social media hooks.',
      content: "The 'How To' Hook:\nHow to [Benefit] without [Pain Point].\n\nThe 'Secret' Hook:\nThe secret to [Desirable Outcome] that [Authority] doesn't want you to know.\n\nThe 'Listicle' Hook:\n7 ways to [Action] for [Result].",
      visibility: 'public',
      usage_count: 56,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'prompt-5',
      lenser_id: 'lenser-2',
      title: 'Product Descriptions that Convert',
      description: 'Write product descriptions that focus on benefits over features.',
      content: "Feature: [Feature Name]\nBenefit: [What it does for user]\nEmotional Payoff: [How it makes them feel]\n\nDraft:\n[Combine the above into a 2-sentence paragraph]",
      visibility: 'public',
      usage_count: 210,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'prompt-6',
      lenser_id: 'lenser-1',
      title: 'React Component Generator',
      description: 'Generate boilerplate for React components with TypeScript interfaces and Tailwind CSS.',
      content: "Component Name: [Name]\nProps: [List of Props]\nStyle: Tailwind\n\nOutput the full .tsx file.",
      visibility: 'public',
      usage_count: 412,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  private tags: TagRecord[] = [
    { id: 'tag-1', slug: 'uiux', name: 'UI/UX', created_at: '' },
    { id: 'tag-2', slug: 'marketing', name: 'Marketing', created_at: '' },
    { id: 'tag-3', slug: 'copywriting', name: 'Copywriting', created_at: '' },
    { id: 'tag-4', slug: 'development', name: 'Development', created_at: '' },
  ];

  // Template ID -> Tag ID[]
  private templateTags: Record<string, string[]> = {
    'prompt-1': ['tag-1', 'tag-2', 'tag-3'],
    'prompt-2': ['tag-1', 'tag-3'],
    'prompt-3': ['tag-2', 'tag-3'],
    'prompt-4': ['tag-2', 'tag-3'],
    'prompt-5': ['tag-2', 'tag-3'],
    'prompt-6': ['tag-4'],
  };

  private reactions: PromptTemplateReactionRecord[] = [];
  private usages: PromptTemplateUsageRecord[] = [];

  constructor() {
    this.reactions.push(
      { id: 'rx-1', template_id: 'prompt-1', lenser_id: 'other-1', reaction: 'like', created_at: new Date().toISOString() },
      { id: 'rx-2', template_id: 'prompt-1', lenser_id: 'other-2', reaction: 'saved', created_at: new Date().toISOString() }
    );
  }

  async getAll(): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return this.prompts.filter(p => p.visibility === 'public');
  }

  async search(query: string): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const lowerQ = query.toLowerCase();
    return this.prompts.filter(p => 
      p.visibility === 'public' && (
      p.title.toLowerCase().includes(lowerQ) || 
      (p.description && p.description.toLowerCase().includes(lowerQ)))
    );
  }

  async filterByTag(tagSlug: string | null): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const visiblePrompts = this.prompts.filter(p => p.visibility === 'public');
    if (!tagSlug) return visiblePrompts;

    const tag = this.tags.find(t => t.slug === tagSlug);
    if (!tag) return [];

    return visiblePrompts.filter(p => {
      const pTags = this.templateTags[p.id] || [];
      return pTags.includes(tag.id);
    });
  }

  async sort(order: "newest" | "popular"): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const sorted = this.prompts.filter(p => p.visibility === 'public');
    if (order === 'newest') {
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      return sorted.sort((a, b) => b.usage_count - a.usage_count);
    }
  }

  async getTopPrompts(limit: number): Promise<PromptTemplateRecord[]> {
      await new Promise(resolve => setTimeout(resolve, 300));
      // Just hardcode the 'best' ones for the widget to ensure they look good, filtering strictly public
      const topIds = ['prompt-6', 'prompt-3', 'prompt-1'];
      return this.prompts.filter(p => topIds.includes(p.id) && p.visibility === 'public');
  }

  async getById(id: string): Promise<PromptTemplateRecord | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.prompts.find(p => p.id === id) || null;
  }

  async getTags(templateId: string): Promise<TagRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const tagIds = this.templateTags[templateId] || [];
    return this.tags.filter(t => tagIds.includes(t.id));
  }

  async getReactions(templateId: string): Promise<PromptTemplateReactionRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.reactions.filter(r => r.template_id === templateId);
  }

  async getUsage(templateId: string): Promise<PromptTemplateUsageRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.usages.filter(u => u.template_id === templateId);
  }

  async createUsageEvent(templateId: string, action: string, lenserId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    this.usages.push({
      id: `use-${Date.now()}`,
      template_id: templateId,
      lenser_id: lenserId,
      action,
      created_at: new Date().toISOString()
    });
    const prompt = this.prompts.find(p => p.id === templateId);
    if (prompt) {
      prompt.usage_count += 1;
    }
  }

  async addReaction(templateId: string, lenserId: string, reaction: ReactionEnum): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const existing = this.reactions.find(r => r.template_id === templateId && r.lenser_id === lenserId && r.reaction === reaction);
    if (existing) return;

    this.reactions.push({
      id: `rx-${Date.now()}`,
      template_id: templateId,
      lenser_id: lenserId,
      reaction,
      created_at: new Date().toISOString()
    });
  }

  async removeReaction(templateId: string, lenserId: string, reaction: ReactionEnum): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    this.reactions = this.reactions.filter(r => !(r.template_id === templateId && r.lenser_id === lenserId && r.reaction === reaction));
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

    this.prompts.unshift(newPrompt);

    if (input.tagIds && input.tagIds.length > 0) {
      const newTagIds: string[] = [];
      input.tagIds.forEach((tagStr, idx) => {
        const existingTag = this.tags.find(t => t.name.toLowerCase() === tagStr.toLowerCase());
        if (existingTag) {
           newTagIds.push(existingTag.id);
        } else {
           const newTag = {
             id: `tag-${Date.now()}-${idx}`,
             name: tagStr,
             slug: tagStr.toLowerCase().replace(/\s+/g, '-'),
             created_at: new Date().toISOString()
           };
           this.tags.push(newTag);
           newTagIds.push(newTag.id);
        }
      });
      
      this.templateTags[newPrompt.id] = newTagIds;
    }

    return newPrompt;
  }
}

// --- Supabase Implementation (Stub) ---
export class SupabasePromptsRepository implements PromptsRepositoryPort {
  async getAll(): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase.from('prompt_templates').select('*').eq('visibility', 'public');
    if (error) throw error;
    return data as PromptTemplateRecord[];
  }

  async search(query: string): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase.from('prompt_templates').select('*').ilike('title', `%${query}%`).eq('visibility', 'public');
    if (error) throw error;
    return data as PromptTemplateRecord[];
  }

  async filterByTag(tagSlug: string | null): Promise<PromptTemplateRecord[]> { return []; }

  async sort(order: "newest" | "popular"): Promise<PromptTemplateRecord[]> { return []; }

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

  async getReactions(templateId: string): Promise<PromptTemplateReactionRecord[]> {
     const { data, error } = await supabase.from('prompt_template_reactions').select('*').eq('template_id', templateId);
     if (error) throw error;
     return data as PromptTemplateReactionRecord[];
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

  async addReaction(templateId: string, lenserId: string, reaction: ReactionEnum): Promise<void> {
    const { error } = await supabase.from('prompt_template_reactions').insert({ template_id: templateId, lenser_id: lenserId, reaction });
    if (error) throw error;
  }

  async removeReaction(templateId: string, lenserId: string, reaction: ReactionEnum): Promise<void> {
    const { error } = await supabase.from('prompt_template_reactions').delete().match({ template_id: templateId, lenser_id: lenserId, reaction });
    if (error) throw error;
  }

  async createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord> {
    const { data, error } = await supabase.from('prompt_templates').insert({ lenser_id: input.lenserId, title: input.title, description: input.description, content: input.content, visibility: input.visibility }).select().single();
    if (error) throw error;
    return data as PromptTemplateRecord;
  }
}