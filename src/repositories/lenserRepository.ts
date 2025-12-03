import { Lenser, CreateLenserDTO, LenserStats, LenserActivityPoint, ActionRecord, NetworkUser } from '../types/lenser.types';
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
  updateLenser(userId: string, data: Partial<Lenser>): Promise<Lenser>; 
  getRecentlyActive(limit: number): Promise<Lenser[]>;
  
  // Profile specific
  getLenserStats(lenserId: string): Promise<LenserStats>;
  getPromptsByLenser(lenserId: string): Promise<PromptTemplateRecord[]>;
  getThreadsByLenser(lenserId: string): Promise<ThreadRecord[]>;
  getActivityTimeline(lenserId: string): Promise<LenserActivityPoint[]>;
  
  // New features
  getLenserActions(lenserId: string): Promise<ActionRecord[]>;
  getLenserNetwork(lenserId: string, type: 'followers' | 'following', page: number): Promise<NetworkUser[]>;
}

// --- Mock Implementation ---
export class MockLenserRepository implements LenserRepositoryPort {
  private STORAGE_KEY_PREFIX = 'mock_lenser_';
  private INDEX_KEY = 'mock_lensers_index';
  // Keys from other repos to calculate stats
  private PROMPTS_KEY = 'mock_prompts_db';
  private THREADS_KEY = 'mock_threads_db';

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
      website_url: 'https://lenserfight.com',
      visibility: 'public',
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
        website_url: 'https://samanthabee.io',
        visibility: 'public',
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
        visibility: 'public',
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
        visibility: 'public',
        created_at: new Date().toISOString()
    }
  ];

  async getLenserByUserId(userId: string): Promise<Lenser | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const stored = storage.getItem(this.STORAGE_KEY_PREFIX + userId);
    if (stored) return JSON.parse(stored);
    
    const mock = this.mockLensers.find(l => l.user_id === userId);
    if (mock) return mock;

    return null;
  }

  async getLenserById(id: string): Promise<Lenser | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    // Check mocked list first, then local storage index
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
    
    // Check updated storage first for the current user
    const indexJson = storage.getItem(this.INDEX_KEY);
    if (indexJson) {
        const index: Lenser[] = JSON.parse(indexJson);
        const found = index.find(l => l.handle.toLowerCase() === handle.toLowerCase());
        if (found) return found;
    }

    // Then static mocks
    const mock = this.mockLensers.find(l => l.handle.toLowerCase() === handle.toLowerCase());
    if (mock) return mock;
    
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
      visibility: 'public',
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

  async updateLenser(userId: string, data: Partial<Lenser>): Promise<Lenser> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let lenser = await this.getLenserByUserId(userId);
    if (!lenser) throw new Error("Lenser profile not found");

    const updatedLenser = { ...lenser, ...data, updated_at: new Date().toISOString() };
    
    // Update individual storage
    storage.setItem(this.STORAGE_KEY_PREFIX + userId, JSON.stringify(updatedLenser));

    // Update index
    const indexJson = storage.getItem(this.INDEX_KEY);
    let index: Lenser[] = indexJson ? JSON.parse(indexJson) : [];
    
    // If it's a static mock user, we need to add/update them in the dynamic index
    const idx = index.findIndex(l => l.user_id === userId);
    if (idx !== -1) {
        index[idx] = updatedLenser;
    } else {
        index.push(updatedLenser);
    }
    storage.setItem(this.INDEX_KEY, JSON.stringify(index));

    // Also update in-memory mock if it exists there
    const mockIdx = this.mockLensers.findIndex(l => l.user_id === userId);
    if (mockIdx !== -1) {
        this.mockLensers[mockIdx] = updatedLenser;
    }

    return updatedLenser;
  }

  async getRecentlyActive(limit: number): Promise<Lenser[]> {
      await new Promise(resolve => setTimeout(resolve, 300));
      return this.mockLensers.slice(0, limit);
  }

  async getLenserStats(lenserId: string): Promise<LenserStats> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Calculate real stats from storage
    const promptsJson = storage.getItem(this.PROMPTS_KEY);
    const prompts: PromptTemplateRecord[] = promptsJson ? JSON.parse(promptsJson) : [];
    
    const threadsJson = storage.getItem(this.THREADS_KEY);
    const threads: ThreadRecord[] = threadsJson ? JSON.parse(threadsJson) : [];

    const realPromptsCount = prompts.filter(p => p.lenser_id === lenserId).length;
    const realThreadsCount = threads.filter(t => t.lenser_id === lenserId).length;

    // Use random seed for social stats if not implemented yet, or fixed for demo users
    let followers = 0;
    let following = 0;
    let wins = 0;

    if (lenserId === 'lenser-1') { followers = 1500; following = 420; wins = 212; }
    else if (lenserId === 'lenser-2') { followers = 840; following = 150; wins = 45; }

    return {
      promptsCount: realPromptsCount,
      threadsCount: realThreadsCount,
      followersCount: followers,
      followingCount: following,
      winsCount: wins
    };
  }

  async getPromptsByLenser(lenserId: string): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const promptsJson = storage.getItem(this.PROMPTS_KEY);
    const allPrompts: PromptTemplateRecord[] = promptsJson ? JSON.parse(promptsJson) : [];
    
    return allPrompts
        .filter(p => p.lenser_id === lenserId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getThreadsByLenser(lenserId: string): Promise<ThreadRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const threadsJson = storage.getItem(this.THREADS_KEY);
    const allThreads: ThreadRecord[] = threadsJson ? JSON.parse(threadsJson) : [];

    return allThreads
        .filter(t => t.lenser_id === lenserId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getActivityTimeline(lenserId: string): Promise<LenserActivityPoint[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    // Mock random activity
    const points: LenserActivityPoint[] = [];
    const now = new Date();
    for(let i=0; i < 365; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        if (Math.random() > 0.6) {
             points.push({ date: d.toISOString().split('T')[0], count: Math.floor(Math.random() * 8) });
        }
    }
    return points;
  }

  async getLenserActions(lenserId: string): Promise<ActionRecord[]> {
      await new Promise(resolve => setTimeout(resolve, 600));
      return [];
  }

  async getLenserNetwork(lenserId: string, type: 'followers' | 'following', page: number): Promise<NetworkUser[]> {
    await new Promise(resolve => setTimeout(resolve, 800));
    if (page > 3) return []; 

    const baseUsers: NetworkUser[] = [
        { id: 'net-1', handle: 'design_guru', display_name: 'Design Guru', avatar_url: 'https://ui-avatars.com/api/?name=DG&background=random', is_following: true },
        { id: 'net-2', handle: 'ai_wizard', display_name: 'AI Wizard', avatar_url: 'https://ui-avatars.com/api/?name=AW&background=random', is_following: false },
        { id: 'net-3', handle: 'frontend_master', display_name: 'Frontend Master', avatar_url: 'https://ui-avatars.com/api/?name=FM&background=random', is_following: true },
    ];

    return baseUsers.map(u => ({ ...u, id: `${u.id}-p${page}` }));
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

  async updateLenser(userId: string, data: Partial<Lenser>): Promise<Lenser> {
      const { data: updated, error } = await supabase
        .from('lensers')
        .update(data)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return updated as Lenser;
  }

  async getRecentlyActive(limit: number): Promise<Lenser[]> {
     const { data, error } = await supabase.from('lensers').select('*').order('updated_at', { ascending: false }).limit(limit);
     if (error) throw error;
     return data as Lenser[];
  }

  async getLenserStats(lenserId: string): Promise<LenserStats> {
      // Real implementation would use count queries
      const { count: promptsCount } = await supabase.from('prompt_templates').select('*', { count: 'exact', head: true }).eq('lenser_id', lenserId);
      const { count: threadsCount } = await supabase.from('threads').select('*', { count: 'exact', head: true }).eq('lenser_id', lenserId);
      
      return { 
          promptsCount: promptsCount || 0, 
          threadsCount: threadsCount || 0, 
          followersCount: 0, 
          followingCount: 0, 
          winsCount: 0 
      };
  }

  async getPromptsByLenser(lenserId: string): Promise<PromptTemplateRecord[]> {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('lenser_id', lenserId)
        .order('created_at', { ascending: false });
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

  async getLenserActions(lenserId: string): Promise<ActionRecord[]> {
      return [];
  }

  async getLenserNetwork(lenserId: string, type: 'followers' | 'following', page: number): Promise<NetworkUser[]> {
      return [];
  }
}