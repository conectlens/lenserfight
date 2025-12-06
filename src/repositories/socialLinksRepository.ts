
import { SocialLink, SocialPlatform } from '../types/lenser.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface SocialLinksRepositoryPort {
  getLinks(lenserId: string): Promise<SocialLink[]>;
  syncLinks(lenserId: string, links: (Omit<SocialLink, 'id' | 'lenser_id' | 'created_at'> & { id?: string })[]): Promise<SocialLink[]>;
}

export class MockSocialLinksRepository implements SocialLinksRepositoryPort {
  private STORAGE_KEY = 'mock_social_links';

  private getAll(): SocialLink[] {
    return JSON.parse(storage.getItem(this.STORAGE_KEY) || '[]');
  }

  private saveAll(links: SocialLink[]) {
    storage.setItem(this.STORAGE_KEY, JSON.stringify(links));
  }

  async getLinks(lenserId: string): Promise<SocialLink[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.getAll().filter(l => l.lenser_id === lenserId);
  }

  async syncLinks(lenserId: string, links: (Omit<SocialLink, 'id' | 'lenser_id' | 'created_at'> & { id?: string })[]): Promise<SocialLink[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
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
  async getLinks(lenserId: string): Promise<SocialLink[]> {
    const { data, error } = await supabase
      .from('lenser_social_links')
      .select('*')
      .eq('lenser_id', lenserId);
    
    if (error) throw error;
    return data as SocialLink[];
  }

  async syncLinks(lenserId: string, links: (Omit<SocialLink, 'id' | 'lenser_id' | 'created_at'> & { id?: string })[]): Promise<SocialLink[]> {
    // 1. Fetch existing IDs
    const { data: existing, error: fetchError } = await supabase
      .from('lenser_social_links')
      .select('id')
      .eq('lenser_id', lenserId);      
    if (fetchError) throw fetchError;

    const existingIds = existing.map(r => r.id);
    const incomingIds = links.filter(l => l.id).map(l => l.id!);
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));

    // 2. Delete removed items
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('lenser_social_links')
        .delete()
        .in('id', toDelete);
      if (deleteError) throw deleteError;
    }

    // 3. Upsert items
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

    // 4. Return updated list
    return this.getLinks(lenserId);
  }
}
