
import { SocialLink, SocialPlatform } from '../types/lenser.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface SocialLinksRepositoryPort {
  getLinks(handle: string): Promise<SocialLink[]>;
  getLinksByHandle(handle: string): Promise<SocialLink[]>;
  syncLinks(handle: string, links: (Omit<SocialLink, 'id' | 'lenser_id' | 'created_at'> & { id?: string })[]): Promise<SocialLink[]>;
}

export class MockSocialLinksRepository implements SocialLinksRepositoryPort {
  private STORAGE_KEY = 'mock_social_links';
  private LENSERS_INDEX_KEY = 'mock_lensers_index';

  private getAll(): SocialLink[] {
    return JSON.parse(storage.getItem(this.STORAGE_KEY) || '[]');
  }

  private saveAll(links: SocialLink[]) {
    storage.setItem(this.STORAGE_KEY, JSON.stringify(links));
  }

  private async getLenserIdByHandle(handle: string): Promise<string | null> {
    const indexJson = storage.getItem(this.LENSERS_INDEX_KEY);
    const index = indexJson ? JSON.parse(indexJson) : [];
    
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

  async getLinks(handle: string): Promise<SocialLink[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const lenserId = await this.getLenserIdByHandle(handle);
    if (!lenserId) return [];
    return this.getAll().filter(l => l.lenser_id === lenserId);
  }

  async getLinksByHandle(handle: string): Promise<SocialLink[]> {
    // Consolidated logic in mock
    return this.getLinks(handle);
  }

  async syncLinks(handle: string, links: (Omit<SocialLink, 'id' | 'lenser_id' | 'created_at'> & { id?: string })[]): Promise<SocialLink[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const lenserId = await this.getLenserIdByHandle(handle);
    if (!lenserId) throw new Error("Lenser not found");

    let allLinks = this.getAll();
    // Remove existing links for this user
    allLinks = allLinks.filter(l => l.lenser_id !== lenserId);
    
    // Create new records
    const newLinks: SocialLink[] = links.map(l => ({
      id: l.id && l.id.length > 10 ? l.id : `link-${Date.now()}-${Math.random()}`,
      lenser_id: lenserId,
      platform: l.platform,
      url: l.url,
      label: l.label,
      created_at: new Date().toISOString()
    }));

    allLinks.push(...newLinks);
    this.saveAll(allLinks);
    
    return newLinks;
  }
}

export class SupabaseSocialLinksRepository implements SocialLinksRepositoryPort {
  async getLinks(handle: string): Promise<SocialLink[]> {
    // Join with lensers to filter by handle, effectively replacing simple select by ID
    // Note: We need real IDs from lenser_social_links for editing, so we select * from base table
    const { data, error } = await supabase
      .from('lenser_social_links')
      .select('*, lensers!inner(handle)')
      .eq('lensers.handle', handle);
    
    if (error) throw error;
    return data as SocialLink[];
  }

  async getLinksByHandle(handle: string): Promise<SocialLink[]> {
    const { data, error } = await supabase
      .from('lenser_social_links_view')
      .select('platform, url, label')
      .eq('handle', handle);

    if (error) throw error;

    return data.map((l: any, i: number) => ({
      id: `public-link-${i}`,
      lenser_id: 'public', 
      platform: l.platform,
      url: l.url,
      label: l.label,
      created_at: new Date().toISOString()
    })) as SocialLink[];
  }

  async syncLinks(handle: string, links: (Omit<SocialLink, 'id' | 'lenser_id' | 'created_at'> & { id?: string })[]): Promise<SocialLink[]> {
    // 1. Resolve Lenser ID from Handle (required for FK insertion)
    const { data: lenser, error: lenserError } = await supabase
        .from('lensers')
        .select('id')
        .eq('handle', handle)
        .single();
    
    if (lenserError || !lenser) throw new Error("Lenser not found for syncing links");
    const lenserId = lenser.id;

    // 2. Fetch existing IDs for this user to determine deletions
    const { data: existing, error: fetchError } = await supabase
      .from('lenser_social_links')
      .select('id')
      .eq('lenser_id', lenserId);      
    if (fetchError) throw fetchError;

    const existingIds = existing.map(r => r.id);
    const incomingIds = links.filter(l => l.id).map(l => l.id!);
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));

    // 3. Delete removed items
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('lenser_social_links')
        .delete()
        .in('id', toDelete);
      if (deleteError) throw deleteError;
    }

    // 4. Upsert items
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const upsertPayload = links.map(link => {
      const hasValidId = typeof link.id === 'string' && uuidRegex.test(link.id);
      return {
        ...(hasValidId ? { id: link.id } : {}),
        lenser_id: lenserId,
        platform: link.platform,
        url: link.url,
        label: link.label
      };
    });

    if (upsertPayload.length > 0) {
      const { error: upsertError } = await supabase
        .from('lenser_social_links')
        .upsert(upsertPayload);
      if (upsertError) throw upsertError;
    }

    // 5. Return updated list using handle
    return this.getLinks(handle);
  }
}
