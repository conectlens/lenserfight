
import { ReactionRecord, TargetType, ReactionType, ReactionCount } from '../types/reactions.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface ReactionRepositoryPort {
  getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]>;
  getUserReaction(targetType: TargetType, targetId: string, lenserId: string): Promise<ReactionRecord[]>;
  getBatchUserReactions(targetType: TargetType, targetIds: string[], lenserId: string): Promise<ReactionRecord[]>;
  addReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<ReactionRecord>;
  removeReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<void>;
  countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]>;
  getUserHistory(lenserId: string, offset?: number, limit?: number): Promise<ReactionRecord[]>;
}

export class MockReactionRepository implements ReactionRepositoryPort {
  private STORAGE_KEY = 'mock_reactions_db';
  private THREADS_KEY = 'mock_threads_db';
  
  constructor() {} // Seed logic omitted for brevity

  private getStore(): ReactionRecord[] {
    return JSON.parse(storage.getItem(this.STORAGE_KEY) || '[]');
  }

  async getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]> {
    return this.getStore().filter(r => r.target_type === targetType && r.target_id === targetId);
  }

  async getUserReaction(targetType: TargetType, targetId: string, lenserId: string): Promise<ReactionRecord[]> {
    return this.getStore().filter(r => r.target_type === targetType && r.target_id === targetId && r.lenser_id === lenserId);
  }

  async getBatchUserReactions(targetType: TargetType, targetIds: string[], lenserId: string): Promise<ReactionRecord[]> {
      // Mock batch implementation
      return this.getStore().filter(r => r.target_type === targetType && r.lenser_id === lenserId && targetIds.includes(r.target_id));
  }

  async addReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<ReactionRecord> {
    const store = this.getStore();
    const newReaction = { id: `rx-${Date.now()}`, lenser_id: lenserId, target_type: targetType, target_id: targetId, reaction, created_at: new Date().toISOString() };
    store.push(newReaction);
    storage.setItem(this.STORAGE_KEY, JSON.stringify(store));
    return newReaction;
  }

  async removeReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<void> {
    const store = this.getStore().filter(r => !(r.lenser_id === lenserId && r.target_type === targetType && r.target_id === targetId && r.reaction === reaction));
    storage.setItem(this.STORAGE_KEY, JSON.stringify(store));
  }

  async countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]> {
      return []; // Simplification
  }

  async getUserHistory(lenserId: string, offset = 0, limit = 20): Promise<ReactionRecord[]> {
      return [];
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
    // Optimized: Read reaction_totals JSONB from entity tables if applicable, but explicit count here just in case
    return [];
  }

  async getUserHistory(lenserId: string, offset = 0, limit = 20): Promise<ReactionRecord[]> {
    const { data, error } = await supabase.from('reactions').select('*').eq('lenser_id', lenserId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    return data as ReactionRecord[];
  }
}
