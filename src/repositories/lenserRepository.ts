
import { Lenser, CreateLenserDTO, LenserStats, LenserActivityPoint, ActionRecord, NetworkUser, AuthorProfile } from '../types/lenser.types';
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
  getLatestJoined(limit: number): Promise<Lenser[]>;
  
  // Profile specific
  getLenserStats(lenserId: string): Promise<LenserStats>;
  getPromptsByLenser(lenserId: string, offset?: number, limit?: number, viewerId?: string): Promise<PromptTemplateRecord[]>;
  getThreadsByLenser(lenserId: string, offset?: number, limit?: number, viewerId?: string): Promise<ThreadRecord[]>;
  getActivityTimeline(lenserId: string): Promise<LenserActivityPoint[]>;
  
  // New features
  getLenserActions(lenserId: string): Promise<ActionRecord[]>;
  getLenserNetwork(lenserId: string, type: 'followers' | 'following', page: number): Promise<NetworkUser[]>;
}

// --- Mock Implementation ---
export class MockLenserRepository implements LenserRepositoryPort {
  private STORAGE_KEY_PREFIX = 'mock_lenser_';
  private INDEX_KEY = 'mock_lensers_index';
  private JOIN_LOG_KEY = 'mock_lenser_join_log';
  // Keys from other repos to calculate stats and sync profiles
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
      is_in_waiting_list: false,
      created_at: new Date(Date.now() - 100000000).toISOString(),
      join_order: 1
    },
    // ... (rest of mock lensers same as before)
  ];

  constructor() {
      // Seed initial join log if empty
      const logJson = storage.getItem(this.JOIN_LOG_KEY);
      if (!logJson) {
          const log = this.mockLensers.map(l => ({ lenser_id: l.id, join_order: l.join_order }));
          storage.setItem(this.JOIN_LOG_KEY, JSON.stringify(log));
      }
  }

  // ... (Previous getters getLenserByUserId, etc. remain the same) ...
  // Re-implementing updateLenser to show trigger logic

  private getJoinOrder(lenserId: string): number | undefined {
      const logJson = storage.getItem(this.JOIN_LOG_KEY);
      const log: { lenser_id: string, join_order: number }[] = logJson ? JSON.parse(logJson) : [];
      const entry = log.find(l => l.lenser_id === lenserId);
      return entry?.join_order;
  }

  private createJoinLog(lenserId: string): number {
      const logJson = storage.getItem(this.JOIN_LOG_KEY);
      const log: { lenser_id: string, join_order: number }[] = logJson ? JSON.parse(logJson) : [];
      
      const maxOrder = log.reduce((max, curr) => Math.max(max, curr.join_order), 0);
      const newOrder = maxOrder + 1;
      
      log.push({ lenser_id: lenserId, join_order: newOrder });
      storage.setItem(this.JOIN_LOG_KEY, JSON.stringify(log));
      return newOrder;
  }

  private enrich(lenser: Lenser | null): Lenser | null {
      if (!lenser) return null;
      const order = this.getJoinOrder(lenser.id);
      if (order) return { ...lenser, join_order: order };
      return lenser;
  }

  async getLenserByUserId(userId: string): Promise<Lenser | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const stored = storage.getItem(this.STORAGE_KEY_PREFIX + userId);
    if (stored) return this.enrich(JSON.parse(stored));
    const mock = this.mockLensers.find(l => l.user_id === userId);
    if (mock) return this.enrich(mock);
    const indexJson = storage.getItem(this.INDEX_KEY);
    if (indexJson) {
        const index: Lenser[] = JSON.parse(indexJson);
        const found = index.find(l => l.user_id === userId);
        if (found) return this.enrich(found);
    }
    return null;
  }

  async getLenserById(id: string): Promise<Lenser | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const mock = this.mockLensers.find(l => l.id === id);
    if (mock) return this.enrich(mock);
    const indexJson = storage.getItem(this.INDEX_KEY);
    if (indexJson) {
      const index: Lenser[] = JSON.parse(indexJson);
      const found = index.find(l => l.id === id);
      if (found) return this.enrich(found);
    }
    return null;
  }

  async getLenserByHandle(handle: string): Promise<Lenser | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const indexJson = storage.getItem(this.INDEX_KEY);
    if (indexJson) {
        const index: Lenser[] = JSON.parse(indexJson);
        const found = index.find(l => l.handle.toLowerCase() === handle.toLowerCase());
        if (found) return this.enrich(found);
    }
    const mock = this.mockLensers.find(l => l.handle.toLowerCase() === handle.toLowerCase());
    if (mock) return this.enrich(mock);
    return null; 
  }

  async createLenser(userId: string, data: CreateLenserDTO): Promise<Lenser> {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newId = `lenser-${Date.now()}-uuid`;
    const joinOrder = this.createJoinLog(newId);

    const newLenser: Lenser = {
      id: newId,
      user_id: userId,
      handle: data.handle,
      display_name: data.display_name,
      bio: data.bio || '',
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.display_name)}&background=random`,
      banner_url: null,
      visibility: 'public',
      is_in_waiting_list: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      join_order: joinOrder
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
    if (!lenser) {
        const mock = this.mockLensers.find(l => l.user_id === userId);
        if (mock) lenser = this.enrich(mock);
    }
    if (!lenser) throw new Error("Lenser profile not found");

    const updatedLenser = { ...lenser, ...data, updated_at: new Date().toISOString() };
    
    // Save
    storage.setItem(this.STORAGE_KEY_PREFIX + userId, JSON.stringify(updatedLenser));

    // Update Index
    const indexJson = storage.getItem(this.INDEX_KEY);
    let index: Lenser[] = indexJson ? JSON.parse(indexJson) : [];
    const idx = index.findIndex(l => l.user_id === userId);
    if (idx !== -1) {
        index[idx] = updatedLenser;
    } else {
        index.push(updatedLenser);
    }
    storage.setItem(this.INDEX_KEY, JSON.stringify(index));

    // --- TRIGGER SIMULATION: Sync author_profile in Threads & Prompts ---
    const newProfile: AuthorProfile = {
        id: updatedLenser.id,
        handle: updatedLenser.handle,
        display_name: updatedLenser.display_name,
        avatar_url: updatedLenser.avatar_url
    };

    // Update Prompts
    const promptsJson = storage.getItem(this.PROMPTS_KEY);
    if (promptsJson) {
        const prompts: any[] = JSON.parse(promptsJson);
        let changed = false;
        prompts.forEach(p => {
            if (p.lenser_id === updatedLenser.id) {
                p.author_profile = newProfile;
                changed = true;
            }
        });
        if (changed) storage.setItem(this.PROMPTS_KEY, JSON.stringify(prompts));
    }

    // Update Threads
    const threadsJson = storage.getItem(this.THREADS_KEY);
    if (threadsJson) {
        const threads: any[] = JSON.parse(threadsJson);
        let changed = false;
        threads.forEach(t => {
            if (t.lenser_id === updatedLenser.id) {
                t.author_profile = newProfile;
                changed = true;
            }
        });
        if (changed) storage.setItem(this.THREADS_KEY, JSON.stringify(threads));
    }

    return updatedLenser;
  }

  async getRecentlyActive(limit: number): Promise<Lenser[]> {
      await new Promise(resolve => setTimeout(resolve, 300));
      return this.mockLensers.slice(0, limit).map(l => this.enrich(l)!);
  }

  async getLatestJoined(limit: number): Promise<Lenser[]> {
      await new Promise(resolve => setTimeout(resolve, 300));
      const indexJson = storage.getItem(this.INDEX_KEY);
      const dynamicLensers: Lenser[] = indexJson ? JSON.parse(indexJson) : [];
      const all = [...this.mockLensers];
      dynamicLensers.forEach(d => {
          if (!all.find(m => m.id === d.id)) {
              all.push(d);
          }
      });
      const enriched = all.map(l => this.enrich(l)!);
      return enriched.sort((a, b) => (b.join_order || 0) - (a.join_order || 0)).slice(0, limit);
  }

  async getLenserStats(lenserId: string): Promise<LenserStats> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const promptsJson = storage.getItem(this.PROMPTS_KEY);
    const prompts: any[] = promptsJson ? JSON.parse(promptsJson) : [];
    const threadsJson = storage.getItem(this.THREADS_KEY);
    const threads: any[] = threadsJson ? JSON.parse(threadsJson) : [];

    const realPromptsCount = prompts.filter(p => p.lenser_id === lenserId && p.visibility === 'public').length;
    const realThreadsCount = threads.filter(t => t.lenser_id === lenserId && t.visibility === 'public').length;

    let followers = 0;
    let following = 0;
    let wins = 0;
    if (lenserId === 'lenser-1') { followers = 1500; following = 420; wins = 212; }
    else if (lenserId === 'lenser-2') { followers = 840; following = 150; wins = 45; }

    return { promptsCount: realPromptsCount, threadsCount: realThreadsCount, followersCount: followers, followingCount: following, winsCount: wins };
  }

  async getPromptsByLenser(lenserId: string, offset = 0, limit = 10, viewerId?: string): Promise<PromptTemplateRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const promptsJson = storage.getItem(this.PROMPTS_KEY);
    const allPrompts: PromptTemplateRecord[] = promptsJson ? JSON.parse(promptsJson) : [];
    const filtered = allPrompts
        .filter(p => {
            if (p.lenser_id !== lenserId) return false;
            if (p.visibility === 'public') return true;
            return viewerId === lenserId;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return filtered.slice(offset, offset + limit);
  }

  async getThreadsByLenser(lenserId: string, offset = 0, limit = 10, viewerId?: string): Promise<ThreadRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const threadsJson = storage.getItem(this.THREADS_KEY);
    const allThreads: ThreadRecord[] = threadsJson ? JSON.parse(threadsJson) : [];
    const filtered = allThreads
        .filter(t => {
            if (t.lenser_id !== lenserId) return false;
            if (t.visibility === 'public') return true;
            return viewerId === lenserId;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return filtered.slice(offset, offset + limit);
  }

  async getActivityTimeline(lenserId: string): Promise<LenserActivityPoint[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
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

// --- Supabase Implementation ---
export class SupabaseLenserRepository implements LenserRepositoryPort {
  async getLenserByUserId(userId: string): Promise<Lenser | null> {
    const { data, error } = await supabase.from('lensers')
        .select('*, lenser_join_log(join_order)')
        .eq('user_id', userId)
        .single();
    
    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    const lenser = { ...data, join_order: data.lenser_join_log?.join_order };
    delete lenser.lenser_join_log;
    return lenser as Lenser;
  }

  async getLenserById(id: string): Promise<Lenser | null> {
    const { data, error } = await supabase.from('lensers')
        .select('*, lenser_join_log(join_order)')
        .eq('id', id)
        .single();
    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    const lenser = { ...data, join_order: data.lenser_join_log?.join_order };
    delete lenser.lenser_join_log;
    return lenser as Lenser;
  }

  async getLenserByHandle(handle: string): Promise<Lenser | null> {
    const { data, error } = await supabase.from('lensers')
        .select('*, lenser_join_log(join_order)')
        .eq('handle', handle)
        .single();
    if (error) return null; 
    const lenser = { ...data, join_order: data.lenser_join_log?.join_order };
    delete lenser.lenser_join_log;
    return lenser as Lenser;
  }

  async createLenser(userId: string, data: CreateLenserDTO): Promise<Lenser> {
    const { data: newLenser, error } = await supabase.from('lensers').insert({ user_id: userId, ...data }).select().single();
    if (error) throw error;
    const { data: logEntry, error: logError } = await supabase
        .from('lenser_join_log')
        .insert({ lenser_id: newLenser.id })
        .select('join_order')
        .single();
    if (logError) {
        console.error("Failed to create join log", logError);
        return newLenser as Lenser;
    }
    return { ...newLenser, join_order: logEntry.join_order } as Lenser;
  }

  async updateLenser(userId: string, data: Partial<Lenser>): Promise<Lenser> {
      const { data: updated, error } = await supabase
        .from('lensers')
        .update(data)
        .eq('user_id', userId)
        .select('*, lenser_join_log(join_order)')
        .single();
      if (error) throw error;
      const lenser = { ...updated, join_order: updated.lenser_join_log?.join_order };
      delete lenser.lenser_join_log;
      return lenser as Lenser;
  }

  async getRecentlyActive(limit: number): Promise<Lenser[]> {
     const { data, error } = await supabase.from('lensers')
        .select('*, lenser_join_log(join_order)')
        .order('updated_at', { ascending: false })
        .limit(limit);
     if (error) throw error;
     return data.map((d: any) => {
         const l = { ...d, join_order: d.lenser_join_log?.join_order };
         delete l.lenser_join_log;
         return l;
     }) as Lenser[];
  }

  async getLatestJoined(limit: number): Promise<Lenser[]> {
      const { data, error } = await supabase
        .from('lenser_join_log')
        .select('join_order, lensers!inner(*)')
        .order('join_order', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data.map((row: any) => ({
          ...row.lensers,
          join_order: row.join_order
      })) as Lenser[];
  }

  async getLenserStats(lenserId: string): Promise<LenserStats> {
      const { count: promptsCount } = await supabase
        .from('prompt_templates')
        .select('*', { count: 'exact', head: true })
        .eq('lenser_id', lenserId)
        .eq('visibility', 'public');
        
      const { count: threadsCount } = await supabase
        .from('threads')
        .select('*', { count: 'exact', head: true })
        .eq('lenser_id', lenserId)
        .eq('visibility', 'public');
      
      return { promptsCount: promptsCount || 0, threadsCount: threadsCount || 0, followersCount: 0, followingCount: 0, winsCount: 0 };
  }

  async getPromptsByLenser(lenserId: string, offset = 0, limit = 10, viewerId?: string): Promise<PromptTemplateRecord[]> {
      let query = supabase
        .from('prompt_templates')
        .select('*') // Reads denormalized profile/tags directly
        .eq('lenser_id', lenserId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
        
      if (viewerId !== lenserId) {
          query = query.eq('visibility', 'public');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PromptTemplateRecord[];
  }

  async getThreadsByLenser(lenserId: string, offset = 0, limit = 10, viewerId?: string): Promise<ThreadRecord[]> {
      let query = supabase
        .from('threads')
        .select('*')
        .eq('lenser_id', lenserId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (viewerId !== lenserId) {
          query = query.eq('visibility', 'public');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ThreadRecord[];
  }

  async getActivityTimeline(lenserId: string): Promise<LenserActivityPoint[]> { return []; }
  async getLenserActions(lenserId: string): Promise<ActionRecord[]> { return []; }
  async getLenserNetwork(lenserId: string, type: 'followers' | 'following', page: number): Promise<NetworkUser[]> { return []; }
}
