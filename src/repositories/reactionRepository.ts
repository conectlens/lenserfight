
import { ReactionRecord, TargetType, ReactionType, ReactionCount } from '../types/reactions.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface ReactionRepositoryPort {
  getReactionsFor(targetType: TargetType, targetId: string): Promise<ReactionRecord[]>;
  getUserReaction(targetType: TargetType, targetId: string, lenserId: string): Promise<ReactionRecord[]>;
  addReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<ReactionRecord>;
  removeReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<void>;
  countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]>;
  getUserHistory(lenserId: string, offset?: number, limit?: number): Promise<ReactionRecord[]>;
}

export class MockReactionRepository implements ReactionRepositoryPort {
  private STORAGE_KEY = 'mock_reactions_db';
  // Access to other stores for trigger simulation
  private THREADS_KEY = 'mock_threads_db';
  private REPLIES_KEY = 'mock_replies_db';
  private PROMPTS_KEY = 'mock_prompts_db';

  constructor() {
    this.seed();
  }

  private seed() {
    const json = storage.getItem(this.STORAGE_KEY);
    if (!json || JSON.parse(json).length === 0) {
        const seedData: ReactionRecord[] = [
            { id: 'rx-seed-1', lenser_id: 'lenser-1', target_type: 'prompt_template', target_id: 'prompt-1', reaction: 'like', created_at: new Date().toISOString() }
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

  private updateEntityTotals(targetType: TargetType, targetId: string, reaction: ReactionType, delta: number) {
      let key = '';
      if (targetType === 'thread') key = this.THREADS_KEY;
      else if (targetType === 'thread_reply') key = this.REPLIES_KEY;
      else if (targetType === 'prompt_template') key = this.PROMPTS_KEY;
      else return;

      const items = JSON.parse(storage.getItem(key) || '[]');
      const itemIndex = items.findIndex((i: any) => i.id === targetId);
      
      if (itemIndex !== -1) {
          const item = items[itemIndex];
          if (!item.reaction_totals) item.reaction_totals = {};
          
          const current = item.reaction_totals[reaction] || 0;
          item.reaction_totals[reaction] = Math.max(0, current + delta);
          
          // Specifically handle save_count logic trigger for prompts if applicable
          if (targetType === 'prompt_template' && reaction === 'saved') {
              item.save_count = (item.save_count || 0) + delta;
          }

          items[itemIndex] = item;
          storage.setItem(key, JSON.stringify(items));
      }
  }

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
    
    // For 'copy', we allow multiple entries usually (log behavior), but for 'like'/'saved' typically unique per user
    // However, the reaction table constraint is usually unique on (user, target, reaction).
    // Assuming 'copy' allows multiple might break uniqueness if the DB schema enforces it.
    // If the schema unifies all, it probably enforces uniqueness. 
    // BUT 'copy' implies usage. If I copy twice, does it count twice?
    // Usually 'copy' is an EVENT log, while 'like' is a STATE.
    // If Supabase schema unifies them in `reactions` table, there might be a unique constraint.
    // If so, 'copy' might be restricted to once per user, OR 'copy' is a different table?
    // Prompt says: "unifying all prompt usage and 'copy' events under the reactions table using the new reaction_enum value 'copy'".
    // If I use the same prompt 10 times, I want 10 counts.
    // This implies `reactions` might NOT have a unique constraint on (user, target, reaction) for ALL types, OR 'copy' is handled differently.
    // Or maybe it does enforce uniqueness and 'copy' essentially becomes "Used by user X".
    // Let's assume standard toggle behavior for like/save, but 'copy' might be just an insert.
    // For MOCK simplicity, we check existence only for non-copy interactions.
    
    if (reaction !== 'copy') {
        const existing = store.find(r => 
            r.lenser_id === lenserId && 
            r.target_type === targetType && 
            r.target_id === targetId &&
            r.reaction === reaction
        );
        if (existing) return existing;
    }

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
    
    // Simulate Trigger for totals
    this.updateEntityTotals(targetType, targetId, reaction, 1);

    return newReaction;
  }

  async removeReaction(targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const store = this.getStore();
    
    // For copy, we don't usually 'remove' a copy event, but let's allow it for consistency if passed
    const filtered = store.filter(r => 
      !(r.lenser_id === lenserId && 
        r.target_type === targetType && 
        r.target_id === targetId &&
        r.reaction === reaction)
    );
    
    if (filtered.length !== store.length) {
        this.setStore(filtered);
        // Simulate Trigger
        this.updateEntityTotals(targetType, targetId, reaction, -1);
    }
  }

  async countReactions(targetType: TargetType, targetId: string): Promise<ReactionCount[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Read from Entity storage (optimized read simulating trigger-maintained columns)
    let key = '';
    if (targetType === 'thread') key = this.THREADS_KEY;
    else if (targetType === 'thread_reply') key = this.REPLIES_KEY;
    else if (targetType === 'prompt_template') key = this.PROMPTS_KEY;

    if (key) {
        const items = JSON.parse(storage.getItem(key) || '[]');
        const item = items.find((i: any) => i.id === targetId);
        if (item && item.reaction_totals) {
            return Object.entries(item.reaction_totals).map(([r, c]) => ({
                reaction: r as ReactionType,
                count: c as number
            }));
        }
    }
    
    return [];
  }

  async getUserHistory(lenserId: string, offset = 0, limit = 20): Promise<ReactionRecord[]> {
      await new Promise(resolve => setTimeout(resolve, 400));
      return this.getStore()
          .filter(r => r.lenser_id === lenserId)
          .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(offset, offset + limit);
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
    // Optimized: Read reaction_totals JSONB from the entity table instead of counting rows
    let tableName = '';
    if (targetType === 'thread') tableName = 'threads';
    else if (targetType === 'thread_reply') tableName = 'thread_replies';
    else if (targetType === 'prompt_template') tableName = 'prompt_templates';
    
    if (!tableName) return [];

    const { data, error } = await supabase
        .from(tableName)
        .select('reaction_totals')
        .eq('id', targetId)
        .single();

    if (error) {
        console.error("Failed to fetch reaction totals", error);
        return [];
    }

    const totals = data?.reaction_totals || {};
    return Object.entries(totals).map(([key, val]) => ({
        reaction: key as ReactionType,
        count: Number(val)
    }));
  }

  async getUserHistory(lenserId: string, offset = 0, limit = 20): Promise<ReactionRecord[]> {
    const { data, error } = await supabase
        .from('reactions')
        .select('*')
        .eq('lenser_id', lenserId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as ReactionRecord[];
  }
}
