
import { JoinWaitingListDTO, WaitingListEntry } from '../types/waitingList.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface WaitingListRepositoryPort {
  joinList(dto: JoinWaitingListDTO): Promise<WaitingListEntry>;
  checkMembership(lenserId: string): Promise<boolean>;
}

export class MockWaitingListRepository implements WaitingListRepositoryPort {
  private STORAGE_KEY = 'mock_waiting_list';

  private getStore(): WaitingListEntry[] {
    return JSON.parse(storage.getItem(this.STORAGE_KEY) || '[]');
  }

  async joinList(dto: JoinWaitingListDTO): Promise<WaitingListEntry> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const store = this.getStore();
    
    // Simulate Unique Constraint
    if (store.find(x => x.lenser_id === dto.lenser_id)) {
        throw new Error("You are already on the waiting list.");
    }

    const entry: WaitingListEntry = {
        id: `wl-${Date.now()}`,
        lenser_id: dto.lenser_id,
        email: dto.email,
        kvkk_approved: dto.kvkk_approved,
        created_at: new Date().toISOString()
    };

    store.push(entry);
    storage.setItem(this.STORAGE_KEY, JSON.stringify(store));
    return entry;
  }

  async checkMembership(lenserId: string): Promise<boolean> {
      await new Promise(resolve => setTimeout(resolve, 200));
      const store = this.getStore();
      return !!store.find(x => x.lenser_id === lenserId);
  }
}

export class SupabaseWaitingListRepository implements WaitingListRepositoryPort {
  async joinList(dto: JoinWaitingListDTO): Promise<WaitingListEntry> {
    const { data, error } = await supabase
        .from('waiting_list')
        .insert({
            lenser_id: dto.lenser_id,
            email: dto.email,
            kvkk_approved: dto.kvkk_approved
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { // Unique violation
            throw new Error("You are already on the waiting list.");
        }
        throw error;
    }
    
    return data as WaitingListEntry;
  }

  async checkMembership(lenserId: string): Promise<boolean> {
      // We rely on RLS policy "waiting_list_select_own" which restricts select to own user_id/lenser_id
      const { data, error } = await supabase
        .from('waiting_list')
        .select('id')
        .eq('lenser_id', lenserId)
        .maybeSingle(); // Use maybeSingle to avoid error on 0 rows
      
      if (error) return false;
      return !!data;
  }
}
