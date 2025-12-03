
import { ReactionRecord, TargetType, ReactionType, ReactionCount } from '../types/reactions.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface ReactionRepositoryPort {
  getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]>;
  getUserReaction(targetType: TargetType, targetId: string, lenserId: string): Promise<ReactionRecord[]>;
  addReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<ReactionRecord>;
  removeReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<void>;
  countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]>;
  getUserHistory(lenserId: string, limit: number): Promise<ReactionRecord[]>;
}

export class MockReactionRepository implements ReactionRepositoryPort {
  private STORAGE_KEY = 'mock_reactions_db';

  constructor() {
    this.seed();
  }

  private seed() {
    // Seed initial reactions for 'lenser-1' so Actions tab isn't empty in demo
    const json = storage.getItem(this.STORAGE_KEY);
    if (!json || JSON.parse(json).length === 0) {
        const seedData: ReactionRecord[] = [
            { id: 'rx-seed-1', lenser_id: 'lenser-1', target_type: 'prompt_template', target_id: 'prompt-2', reaction: 'saved', created_at: new Date().toISOString() },
            { id: 'rx-seed-2', lenser_id: 'lenser-1', target_type: 'thread', target_id: 'thread-2', reaction: 'like', created_at: new Date(Date.now() - 86400000).toISOString() },
            { id: 'rx-seed-3', lenser_id: 'lenser-1', target_type: 'thread_reply', target_id: 'reply-1', reaction: 'clap', created_at: new Date(Date.now() - 172800000).toISOString() },
            { id: 'rx-seed-4', lenser_id: 'lenser-1', target_type: 'prompt_template', target_id: 'prompt-3', reaction: 'love', created_at: new Date(Date.now() - 250000000).toISOString() },
        ];
        storage.setItem(this.STORAGE_KEY, JSON.stringify(seedData));
    }
  }

  private getStore(): ReactionRecord[] {
    const json = storage.getItem(this.STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  }

  private setStore(data: ReactionRecord[]) {
    storage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  async getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]>;
  async getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.getStore().filter(r => r.target_type === targetType && r.target_id === targetId);
  }

  async getUserReaction(targetType: TargetType, targetId: string, lenserId: string): Promise<ReactionRecord[]> {
    return this.getStore().filter(r => 
      r.target_type === targetType && 
      r.target_id === targetId && 
      r.lenser_id === lenserId
    );
  }

  async addReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<ReactionRecord> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const store = this.getStore();
    
    const existing = store.find(r => 
      r.lenser_id === lenserId && 
      r.target_type === targetType && 
      r.target_id === targetId &&
      r.reaction === reaction
    );

    if (existing) return existing;

    const newReaction: ReactionRecord = {
      id: `rx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lenser_id: lenserId,
      target_type: targetType,
      target_id: targetId,
      reaction: reaction,
      created_at: new Date().toISOString()
    };

    store.push(newReaction);
    this.setStore(store);
    return newReaction;
  }

  async removeReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const store = this.getStore();
    const filtered = store.filter(r => 
      !(r.lenser_id === lenserId && 
        r.target_type === targetType && 
        r.target_id === targetId &&
        r.reaction === reaction)
    );
    this.setStore(filtered);
  }

  async countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]> {
    const reactions = await this.getReactionsFor(targetType, targetId);
    const counts: Record<string, number> = {};
    
    reactions.forEach(r => {
      counts[r.reaction] = (counts[r.reaction] || 0) + 1;
    });

    return Object.entries(counts).map(([reaction, count]) => ({
      reaction: reaction as ReactionType,
      count
    }));
  }

  async getUserHistory(lenserId: string, limit: number): Promise<ReactionRecord[]> {
      await new Promise(resolve => setTimeout(resolve, 400));
      return this.getStore()
          .filter(r => r.lenser_id === lenserId)
          .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit);
  }
}

export class SupabaseReactionRepository implements ReactionRepositoryPort {
  async getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]> {
    const { data, error } = await supabase
      .from('reactions')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId);
    
    if (error) throw error;
    return data as ReactionRecord[];
  }

  async getUserReaction(targetType: TargetType, targetId: string, lenserId: string): Promise<ReactionRecord[]> {
    const { data, error } = await supabase
      .from('reactions')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('lenser_id', lenserId);
      
    if (error) throw error;
    return data as ReactionRecord[];
  }

  async addReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<ReactionRecord> {
    const { data, error } = await supabase
      .from('reactions')
      .insert({
        lenser_id: lenserId,
        target_type: targetType,
        target_id: targetId,
        reaction: reaction
      })
      .select()
      .single();
      
    if (error) throw error;
    return data as ReactionRecord;
  }

  async removeReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<void> {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .match({
        lenser_id: lenserId,
        target_type: targetType,
        target_id: targetId,
        reaction: reaction
      });
      
    if (error) throw error;
  }

  async countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]> {
    const { data, error } = await supabase
      .from('reactions')
      .select('reaction');
      
    if (error) throw error;
    
    // Client side aggregation for the stub
    const counts: Record<string, number> = {};
    data.forEach((r: any) => {
        counts[r.reaction] = (counts[r.reaction] || 0) + 1;
    });

    return Object.entries(counts).map(([reaction, count]) => ({
        reaction: reaction as ReactionType,
        count
    }));
  }

  async getUserHistory(lenserId: string, limit: number): Promise<ReactionRecord[]> {
    const { data, error } = await supabase
        .from('reactions')
        .select('*')
        .eq('lenser_id', lenserId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data as ReactionRecord[];
  }
}
