import { Lenser, CreateLenserDTO, LenserStats, LenserActivityPoint, ReactionRecord } from '../types/lenser.types';
import { PromptTemplateRecord } from '../types/prompts.types';
import { ThreadRecord } from '../types/threads.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

// --- Port (Interface) ---
export interface LenserRepositoryPort {
  getLenserByUserId(userId: string): Promise<Lenser | null>;
  getLenserById(id: string): Promise<Lenser | null>;
  getLenserByHandle(handle: string): Promise<Lenser | null>;
  createLenser(userId: string, data: CreateLenserDTO): Promise<Lenser>;
  getRecentlyActive(limit: number): Promise<Lenser[]>;
  
  // Profile specific
  getLenserStats(lenserId: string): Promise<LenserStats>;
  getPromptsByLenser(lenserId: string): Promise<PromptTemplateRecord[]>;
  getThreadsByLenser(lenserId: string): Promise<ThreadRecord[]>;
  getActivityTimeline(lenserId: string): Promise<LenserActivityPoint[]>;
}

// --- Mock Implementation ---
export class MockLenserRepository implements LenserRepositoryPort {
  private STORAGE_KEY_PREFIX = 'mock_lenser_';
  private INDEX_KEY = 'mock_lensers_index';

  private mockLensers: Lenser[] = [
    {
      id: 'lenser-1',
      user_id: 'user-1',
      handle: 'cassian.lens',
      display_name: 'Cassian',
      headline: 'Co-founder at LenserFight. Building the future of productive creativity.',
      bio: 'Passionate about AI and UX. Sharing tools for thought.',
      avatar_url: 'https://ui-avatars.com/api/?name=Cassian&background=111&color=fff',
      banner_url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=2400',
      created_at: new Date().toISOString()
    },
    {
        id: 'lenser-2',
        user_id: 'user-2',
        handle: 'samantha_bee',
        display_name: 'Samantha Bee',
        headline: 'Digital Nomad & Prompt Engineer',
        bio: 'Exploring the intersection of lifestyle and AI automation.',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
        banner_url: 'https://images.unsplash.com/photo-1614850523060-8da1d56ae167?auto=format&fit=crop&q=80&w=2400',
        created_at: new Date().toISOString()
    },
    {
        id: 'lenser-3',
        user_id: 'user-3',
        handle: 'dev_lane',
        display_name: 'Devon Lane',
        headline: 'Full Stack Dev | React Enthusiast',
        bio: 'Building scalable apps and sharing code snippets.',
        avatar_url: 'https://ui-avatars.com/api/?name=Devon&background=random',
        banner_url: null,
        created_at: new Date().toISOString()
    },
    {
        id: 'lenser-4',
        user_id: 'user-4',
        handle: 'courtney_h',
        display_name: 'Courtney Henry',
        headline: 'Marketing Strategist',
        bio: 'Helping brands find their voice in the AI era.',
        avatar_url: 'https://ui-avatars.com/api/?name=Courtney&background=random',
        banner_url: null,
        created_at: new Date().toISOString()
    }
  ];

  async getLenserByUserId(userId: string): Promise<Lenser | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const mock = this.mockLensers.find(l => l.user_id === userId);
    if (mock) return mock;

    const stored = storage.getItem(this.STORAGE_KEY_PREFIX + userId);
    return stored ? JSON.parse(stored) : null;
  }

  async getLenserById(id: string): Promise<Lenser | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const mock = this.mockLensers.find(l => l.id === id);
    if (mock) return mock;
    
    const indexJson = storage.getItem(this.INDEX_KEY);
    if (indexJson) {
      const index: Lenser[] = JSON.parse(indexJson);
      const found = index.find(l => l.id === id);
      if (found) return found;
    }

    return null;
  }

  async getLenserByHandle(handle: string): Promise<Lenser | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const mock = this.mockLensers.find(l => l.handle.toLowerCase() === handle.toLowerCase());
    if (mock) return mock;
    
    const indexJson = storage.getItem(this.INDEX_KEY);
    if (indexJson) {
      const index: Lenser[] = JSON.parse(indexJson);
      const found = index.find(l => l.handle.toLowerCase() === handle.toLowerCase());
      if (found) return found;
    }
    
    return null; 
  }

  async createLenser(userId: string, data: CreateLenserDTO): Promise<Lenser> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newLenser: Lenser = {
      id: `lenser-${Date.now()}-uuid`,
      user_id: userId,
      handle: data.handle,
      display_name: data.display_name,
      bio: data.bio || '',
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.display_name)}&background=random`,
      banner_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    storage.setItem(this.STORAGE_KEY_PREFIX + userId, JSON.stringify(newLenser));

    const indexJson = storage.getItem(this.INDEX_KEY);
    const index: Lenser[] = indexJson ? JSON.parse(indexJson) : [];
    index.push(newLenser);
    storage.setItem(this.INDEX_KEY, JSON.stringify(index));

    return newLenser;
  }

  async getRecentlyActive(limit: number): Promise<Lenser[]> {
      await new Promise(resolve => setTimeout(resolve, 300));
      // In a real app, this would query based on recent login or activity timestamps
      return this.mockLensers.slice(0, limit);
  }

  async getLenserStats(lenserId: string): Promise<LenserStats> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Simulate realistic data based on the mock ID
    if (lenserId === 'lenser-1') {
      return { promptsCount: 8, threadsCount: 2, followersCount: 1500, winsCount: 212 };
    }
    if (lenserId === 'lenser-2') {
         return { promptsCount: 12, threadsCount: 5, followersCount: 840, winsCount: 45 };
    }
    if (lenserId === 'lenser-3') {
        return { promptsCount: 3, threadsCount: 1, followersCount: 120, winsCount: 5 };
    }
    if (lenserId === 'lenser-4') {
        return { promptsCount: 5, threadsCount: 3, followersCount: 340, winsCount: 12 };
    }

    // Dynamic checks for created users
    return {
      promptsCount: 0,
      threadsCount: 0,
      followersCount: 0,
      winsCount: 0
    };
  }

  async getPromptsByLenser(lenserId: string): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Base mocks
    const basePrompts: PromptTemplateRecord[] = [
        { id: 'p-1', lenser_id: 'lenser-1', title: 'Designing for Accessibility', description: 'A checklist for inclusive design.', content: '...', visibility: 'public', usage_count: 340, created_at: new Date().toISOString(), updated_at: '' },
        { id: 'p-2', lenser_id: 'lenser-1', title: 'The Future of AI in UI/UX', description: 'Thought starters for AI integration.', content: '...', visibility: 'public', usage_count: 820, created_at: new Date().toISOString(), updated_at: '' },
        { id: 'p-3', lenser_id: 'lenser-1', title: 'Minimalist Dashboard Concepts', description: 'Grid layouts for data density.', content: '...', visibility: 'public', usage_count: 120, created_at: new Date().toISOString(), updated_at: '' },
        { id: 'p-4', lenser_id: 'lenser-1', title: 'Crafting a Design System', description: 'Token naming conventions.', content: '...', visibility: 'public', usage_count: 55, created_at: new Date().toISOString(), updated_at: '' },
        { id: 'p-5', lenser_id: 'lenser-1', title: 'Productivity App Teardown', description: 'Analyzing key flows.', content: '...', visibility: 'public', usage_count: 22, created_at: new Date().toISOString(), updated_at: '' },
        { id: 'p-6', lenser_id: 'lenser-1', title: 'Iconography Masterclass', description: 'SVGs and strokes.', content: '...', visibility: 'public', usage_count: 90, created_at: new Date().toISOString(), updated_at: '' },
        { id: 'p-7', lenser_id: 'lenser-1', title: 'Modern Branding Guidelines', description: 'Typography pairings.', content: '...', visibility: 'public', usage_count: 110, created_at: new Date().toISOString(), updated_at: '' },
        { id: 'p-8', lenser_id: 'lenser-1', title: 'Streamlining User Onboarding', description: 'Friction reduction strategies.', content: '...', visibility: 'public', usage_count: 400, created_at: new Date().toISOString(), updated_at: '' },
        
        { id: 'p-21', lenser_id: 'lenser-2', title: 'Instagram Caption Generator', description: 'Viral hooks for lifestyle content.', content: '...', visibility: 'public', usage_count: 1200, created_at: new Date().toISOString(), updated_at: '' },
        { id: 'p-22', lenser_id: 'lenser-2', title: 'Email Newsletter Structure', description: 'High open-rate templates.', content: '...', visibility: 'public', usage_count: 500, created_at: new Date().toISOString(), updated_at: '' },
        { id: 'p-23', lenser_id: 'lenser-2', title: 'Midjourney Portrait Prompts', description: 'Photorealistic settings.', content: '...', visibility: 'public', usage_count: 2300, created_at: new Date().toISOString(), updated_at: '' },
        
        { id: 'p-31', lenser_id: 'lenser-3', title: 'React Hooks Cheatsheet', description: 'Common patterns.', content: '...', visibility: 'public', usage_count: 150, created_at: new Date().toISOString(), updated_at: '' },
        { id: 'p-32', lenser_id: 'lenser-3', title: 'Docker Compose Setup', description: 'For Node and Postgres.', content: '...', visibility: 'public', usage_count: 80, created_at: new Date().toISOString(), updated_at: '' },

        { id: 'p-41', lenser_id: 'lenser-4', title: 'Brand Voice Analysis', description: 'Tone and style audit.', content: '...', visibility: 'public', usage_count: 210, created_at: new Date().toISOString(), updated_at: '' },
    ];
    
    return basePrompts.filter(p => p.lenser_id === lenserId);
  }

  async getThreadsByLenser(lenserId: string): Promise<ThreadRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const baseThreads: ThreadRecord[] = [
        { id: 't-1', lenser_id: 'lenser-1', title: 'Thoughts on the new React compiler?', content: 'It looks amazing...', visibility: 'public', view_count: 100, reply_count: 12, created_at: new Date().toISOString(), updated_at: '' },
        { id: 't-2', lenser_id: 'lenser-1', title: 'How I manage my design system tokens', content: 'Using a json file...', visibility: 'public', view_count: 230, reply_count: 5, created_at: new Date().toISOString(), updated_at: '' },
        
        { id: 't-3', lenser_id: 'lenser-2', title: 'Remote work essentials 2024', content: 'My top gear picks.', visibility: 'public', view_count: 450, reply_count: 20, created_at: new Date().toISOString(), updated_at: '' },
        { id: 't-4', lenser_id: 'lenser-3', title: 'Why I switched to Rust', content: 'Memory safety is key.', visibility: 'public', view_count: 300, reply_count: 45, created_at: new Date().toISOString(), updated_at: '' },
    ];

    return baseThreads.filter(t => t.lenser_id === lenserId);
  }

  async getActivityTimeline(lenserId: string): Promise<LenserActivityPoint[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const data: LenserActivityPoint[] = [];
    const now = new Date();
    for (let i = 0; i < 365; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        let count = 0;
        const rand = Math.random();
        if (lenserId === 'lenser-1') {
            if (rand > 0.6) count = Math.floor(Math.random() * 5) + 1;
            if (rand > 0.9) count = Math.floor(Math.random() * 10) + 1;
        } else {
             if (rand > 0.9) count = Math.floor(Math.random() * 3) + 1;
        }

        data.push({
            date: date.toISOString().split('T')[0],
            count: count
        });
    }
    return data;
  }
}

// --- Supabase Implementation (Stub) ---
export class SupabaseLenserRepository implements LenserRepositoryPort {
  async getLenserByUserId(userId: string): Promise<Lenser | null> {
    const { data, error } = await supabase.from('lensers').select('*').eq('user_id', userId).single();
    if (error) throw error;
    return data as Lenser;
  }

  async getLenserById(id: string): Promise<Lenser | null> {
    const { data, error } = await supabase.from('lensers').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Lenser;
  }

  async getLenserByHandle(handle: string): Promise<Lenser | null> {
    const { data, error } = await supabase.from('lensers').select('*').eq('handle', handle).single();
    if (error) return null; 
    return data as Lenser;
  }

  async createLenser(userId: string, data: CreateLenserDTO): Promise<Lenser> {
    const { data: newLenser, error } = await supabase.from('lensers').insert({ user_id: userId, ...data }).select().single();
    if (error) throw error;
    return newLenser as Lenser;
  }

  async getRecentlyActive(limit: number): Promise<Lenser[]> {
     // Stub: Just return random 5 for now or last updated
     const { data, error } = await supabase.from('lensers').select('*').order('updated_at', { ascending: false }).limit(limit);
     if (error) throw error;
     return data as Lenser[];
  }

  async getLenserStats(lenserId: string): Promise<LenserStats> {
      const [prompts, threads] = await Promise.all([
          supabase.from('prompt_templates').select('*', { count: 'exact', head: true }).eq('lenser_id', lenserId),
          supabase.from('threads').select('*', { count: 'exact', head: true }).eq('lenser_id', lenserId),
      ]);
      return { promptsCount: prompts.count || 0, threadsCount: threads.count || 0, followersCount: 0, winsCount: 0 };
  }

  async getPromptsByLenser(lenserId: string): Promise<PromptTemplateRecord[]> {
      const { data, error } = await supabase.from('prompt_templates').select('*').eq('lenser_id', lenserId).order('created_at', { ascending: false });
      if (error) throw error;
      return data as PromptTemplateRecord[];
  }

  async getThreadsByLenser(lenserId: string): Promise<ThreadRecord[]> {
      const { data, error } = await supabase.from('threads').select('*').eq('lenser_id', lenserId).order('created_at', { ascending: false });
      if (error) throw error;
      return data as ThreadRecord[];
  }

  async getActivityTimeline(lenserId: string): Promise<LenserActivityPoint[]> {
    return [];
  }
}