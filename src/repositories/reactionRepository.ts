
import { ReactionRecord, TargetType, ReactionType, ReactionCount } from '../types/reactions.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';


export interface ReactionRepositoryPort {
    toggleReaction(
    targetType: TargetType,
    targetId: string,
    lenserId: string,
    reaction: ReactionType
  ): Promise<{
    added: boolean;
    summary: {
      counts: Record<ReactionType, number>;
      total: number;
      userReactions: ReactionType[];
    };
  }>;
  getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]>;
  getUserReaction(targetType: TargetType, targetId: string, lenserId: string): Promise<ReactionRecord[]>;
  getBatchUserReactions(targetType: TargetType, targetIds: string[], lenserId: string): Promise<ReactionRecord[]>;
  addReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<ReactionRecord>;
  removeReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<void>;
  countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]>;
  getLenserHistory(handle: string, offset?: number, limit?: number): Promise<ReactionRecord[]>;
}

export class MockReactionRepository implements ReactionRepositoryPort {
  private STORAGE_KEY = 'mock_reactions_db';
  private THREADS_KEY = 'mock_threads_db';
  private PROMPTS_KEY = 'mock_prompts_db';
  private LENSERS_INDEX_KEY = 'mock_lensers_index';
  
  constructor() {} 

  private getStore(): ReactionRecord[] {
    return JSON.parse(storage.getItem(this.STORAGE_KEY) || '[]');
  }

  // --- Trigger Simulation Logic ---
  private updateParentTotals(targetType: TargetType, targetId: string) {
      const store = this.getStore();
      const relevant = store.filter(r => r.target_type === targetType && r.target_id === targetId);
      
      const counts: Record<string, number> = {};
      relevant.forEach(r => {
          counts[r.reaction] = (counts[r.reaction] || 0) + 1;
      });

      if (targetType === 'thread') {
          const threads = JSON.parse(storage.getItem(this.THREADS_KEY) || '[]');
          const idx = threads.findIndex((t: any) => t.id === targetId);
          if (idx !== -1) {
              threads[idx].reaction_totals = counts;
              storage.setItem(this.THREADS_KEY, JSON.stringify(threads));
          }
      } else if (targetType === 'prompt_template') {
          const prompts = JSON.parse(storage.getItem(this.PROMPTS_KEY) || '[]');
          const idx = prompts.findIndex((p: any) => p.id === targetId);
          if (idx !== -1) {
              prompts[idx].reaction_totals = counts;
              storage.setItem(this.PROMPTS_KEY, JSON.stringify(prompts));
          }
      }
  }

  private getLenserIdByHandle(handle: string): string | null {
    const indexJson = storage.getItem(this.LENSERS_INDEX_KEY);
    const index = indexJson ? JSON.parse(indexJson) : [];
    
    // Static fallback map similar to other mock repos
    const mockIdMap: Record<string, string> = {
        'cassian.lens': 'lenser-1',
        'sarah_ai': 'lenser-2',
        'neo_one': 'lenser-3',
        'trinity_matrix': 'lenser-4'
    };
    
    let lenserId = mockIdMap[handle];
    if (!lenserId) {
        const found = index.find((l: any) => l.handle === handle);
        if (found) lenserId = found.id;
    }
    return lenserId || null;
  }

  async getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]> {
    return this.getStore().filter(r => r.target_type === targetType && r.target_id === targetId);
  }

  async getUserReaction(targetType: TargetType, targetId: string, lenserId: string): Promise<ReactionRecord[]> {
    return this.getStore().filter(r => r.target_type === targetType && r.target_id === targetId && r.lenser_id === lenserId);
  }

  async getBatchUserReactions(targetType: TargetType, targetIds: string[], lenserId: string): Promise<ReactionRecord[]> {
      return this.getStore().filter(r => r.target_type === targetType && r.lenser_id === lenserId && targetIds.includes(r.target_id));
  }

  async addReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<ReactionRecord> {
    const store = this.getStore();
    const newReaction = { id: `rx-${Date.now()}`, lenser_id: lenserId, target_type: targetType, target_id: targetId, reaction, created_at: new Date().toISOString() };
    store.push(newReaction);
    storage.setItem(this.STORAGE_KEY, JSON.stringify(store));
    
    // Trigger update
    this.updateParentTotals(targetType, targetId);
    
    return newReaction;
  }

  async removeReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<void> {
    const store = this.getStore().filter(r => !(r.lenser_id === lenserId && r.target_type === targetType && r.target_id === targetId && r.reaction === reaction));
    storage.setItem(this.STORAGE_KEY, JSON.stringify(store));
    
    // Trigger update
    this.updateParentTotals(targetType, targetId);
  }

  async toggleReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const store = this.getStore();
    const index = store.findIndex(
      (r) =>
        r.target_type === targetType &&
        r.target_id === targetId &&
        r.lenser_id === lenserId &&
        r.reaction === reaction
    );

    let added = false;
    if (index > -1) {
      store.splice(index, 1);
    } else {
      store.push({
        id: `rx-${Date.now()}`,
        lenser_id: lenserId,
        target_type: targetType,
        target_id: targetId,
        reaction,
        created_at: new Date().toISOString(),
      });
      added = true;
    }
    storage.setItem(this.STORAGE_KEY, JSON.stringify(store));
    this.updateParentTotals(targetType, targetId);

    // Calc summary
    const counts: Record<ReactionType, number> = { like: 0, love: 0, clap: 0, saved: 0, copy: 0 };
    let total = 0;
    const relevant = store.filter(r => r.target_type === targetType && r.target_id === targetId);
    relevant.forEach(r => {
        counts[r.reaction] = (counts[r.reaction] || 0) + 1;
        if (r.reaction !== 'saved' && r.reaction !== 'copy') total++;
    });
    const userReactions = store
        .filter(r => r.target_type === targetType && r.target_id === targetId && r.lenser_id === lenserId)
        .map(r => r.reaction);

    return {
      added,
      summary: { counts, total, userReactions }
    };
  }

  async countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]> {
      const store = this.getStore();
      const relevant = store.filter(r => r.target_type === targetType && r.target_id === targetId);
      
      const counts: Record<string, number> = {};
      relevant.forEach(r => {
          counts[r.reaction] = (counts[r.reaction] || 0) + 1;
      });
      
      return Object.entries(counts).map(([reaction, count]) => ({ reaction: reaction as ReactionType, count }));
  }

  async getLenserHistory(handle: string, offset = 0, limit = 20): Promise<ReactionRecord[]> {
      const lenserId = this.getLenserIdByHandle(handle);
      if (!lenserId) return [];

      const store = this.getStore();
      return store
        .filter(r => r.lenser_id === lenserId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(offset, offset + limit);
  }
}

export class SupabaseReactionRepository implements ReactionRepositoryPort {
  async getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]> {
    const { data, error } = await supabase.from('reactions').select('*').eq('target_type', targetType).eq('target_id', targetId);
    if (error) throw error;
    return data as ReactionRecord[];
  }

  async getUserReaction(targetType: TargetType, targetId: string, lenserId: string): Promise<ReactionRecord[]> {
    const { data, error } = await supabase.from('reactions').select('*').eq('target_type', targetType).eq('target_id', targetId).eq('lenser_id', lenserId);
    if (error) throw error;
    return data as ReactionRecord[];
  }

  async toggleReaction(
  targetType: TargetType,
  targetId: string,
  lenserId: string,
  reaction: ReactionType
): Promise<{
  added: boolean;
  summary: {
    counts: Record<ReactionType, number>;
    total: number;
    userReactions: ReactionType[];
  };
}> {
  const { data, error } = await supabase.rpc('toggle_reaction', {
    p_lenser_id: lenserId,
    p_target_type: targetType,
    p_target_id: targetId,
    p_reaction: reaction,
  });

  if (error) throw error;

  return data;
}


  async getBatchUserReactions(targetType: TargetType, targetIds: string[], lenserId: string): Promise<ReactionRecord[]> {
    if (targetIds.length === 0) return [];
    
    const { data, error } = await supabase
        .from('reactions')
        .select('*')
        .eq('target_type', targetType)
        .eq('lenser_id', lenserId)
        .in('target_id', targetIds);

    if (error) throw error;
    return data as ReactionRecord[];
  }

  async addReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<ReactionRecord> {
    const { data, error } = await supabase.from('reactions').insert({ lenser_id: lenserId, target_type: targetType, target_id: targetId, reaction }).select().single();
    if (error) throw error;
    return data as ReactionRecord;
  }

  async removeReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<void> {
    const { error } = await supabase.from('reactions').delete().match({ lenser_id: lenserId, target_type: targetType, target_id: targetId, reaction });
    if (error) throw error;
  }

  async countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]> {
    const { data, error } = await supabase
        .from('reactions')
        .select('reaction')
        .eq('target_type', targetType)
        .eq('target_id', targetId);
        
    if (error) {
        console.error("Error counting reactions:", error);
        return [];
    }
    
    const counts: Record<string, number> = {};
    data.forEach((row: any) => {
        counts[row.reaction] = (counts[row.reaction] || 0) + 1;
    });
    
    return Object.entries(counts).map(([reaction, count]) => ({ reaction: reaction as ReactionType, count }));
  }

  async getLenserHistory(handle: string, offset = 0, limit = 20): Promise<ReactionRecord[]> {
    // Join with lensers to filter by handle
    const { data, error } = await supabase
        .from('reactions')
        .select('*, lensers!inner(handle)')
        .eq('lensers.handle', handle)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
        
    if (error) throw error;
    return data as ReactionRecord[];
  }
}
