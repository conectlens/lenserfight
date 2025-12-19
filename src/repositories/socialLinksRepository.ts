import { SocialLink, SocialPlatform } from '../types/lenser.types'
import { storage } from '../utils/storage'
import { supabase } from '../utils/supabase'

export interface SocialLinksRepositoryPort {
  /**
   * Owner view: used on profile settings page.
   * Should return real IDs from lensers.social_links for editing.
   */
  getLinks(handle: string): Promise<SocialLink[]>

  /**
   * Public view: used on public profile. No real IDs / internal data.
   */
  getLinksByHandle(handle: string): Promise<SocialLink[]>

  /**
   * Full sync for the authenticated Lenser.
   * For Supabase implementation, `handle` is ignored for ownership
   * (ownership is determined by auth.uid() in RPC).
   */
  syncLinks(
    handle: string,
    links: (Omit<SocialLink, 'id' | 'lenser_id' | 'created_at'> & { id?: string })[]
  ): Promise<SocialLink[]>
}

/* ------------------------------------------------------------------ */
/* MOCK IMPLEMENTATION (localStorage)                                 */
/* ------------------------------------------------------------------ */

export class MockSocialLinksRepository implements SocialLinksRepositoryPort {
  private STORAGE_KEY = 'mock_social_links'
  private LENSERS_INDEX_KEY = 'mock_lensers_index'

  private getAll(): SocialLink[] {
    return JSON.parse(storage.getItem(this.STORAGE_KEY) || '[]')
  }

  private saveAll(links: SocialLink[]) {
    storage.setItem(this.STORAGE_KEY, JSON.stringify(links))
  }

  private async getLenserIdByHandle(handle: string): Promise<string | null> {
    const indexJson = storage.getItem(this.LENSERS_INDEX_KEY)
    const index = indexJson ? JSON.parse(indexJson) : []

    const mockIdMap: Record<string, string> = {
      'cassian.lens': 'lenser-1',
      sarah_ai: 'lenser-2',
      neo_one: 'lenser-3',
      trinity_matrix: 'lenser-4',
    }

    let lenserId = mockIdMap[handle]
    if (!lenserId) {
      const found = index.find((l: any) => l.handle === handle)
      if (found) lenserId = found.id
    }
    return lenserId || null
  }

  async getLinks(handle: string): Promise<SocialLink[]> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const lenserId = await this.getLenserIdByHandle(handle)
    if (!lenserId) return []
    return this.getAll().filter((l) => l.lenser_id === lenserId)
  }

  async getLinksByHandle(handle: string): Promise<SocialLink[]> {
    // For mock we reuse the same logic; in real impl this is public-only.
    return this.getLinks(handle)
  }

  async syncLinks(
    handle: string,
    links: (Omit<SocialLink, 'id' | 'lenser_id' | 'created_at'> & { id?: string })[]
  ): Promise<SocialLink[]> {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const lenserId = await this.getLenserIdByHandle(handle)
    if (!lenserId) throw new Error('Lenser not found')

    let allLinks = this.getAll()
    // Remove existing links for this user
    allLinks = allLinks.filter((l) => l.lenser_id !== lenserId)

    // Create new records
    const newLinks: SocialLink[] = links.map((l) => ({
      id: l.id && l.id.length > 10 ? l.id : `link-${Date.now()}-${Math.random()}`,
      lenser_id: lenserId,
      platform: l.platform,
      url: l.url,
      label: l.label,
      created_at: new Date().toISOString(),
    }))

    allLinks.push(...newLinks)
    this.saveAll(allLinks)

    return newLinks
  }
}

/* ------------------------------------------------------------------ */
/* SUPABASE IMPLEMENTATION                                            */
/* ------------------------------------------------------------------ */

export class SupabaseSocialLinksRepository implements SocialLinksRepositoryPort {
  /**
   * Owner view — uses vw_lensers_social_links_private.
   * RLS + view definition ensure that even if a user passes a different handle,
   * they will only ever see their own links.
   */
  async getLinks(handle: string): Promise<SocialLink[]> {
    const { data, error } = await supabase
      .from('vw_lensers_social_links_private')
      .select('*')
      .eq('handle', handle)

    if (error) throw error
    // View should already expose id, lenser_id, platform, url, label, created_at
    return data as SocialLink[]
  }

  /**
   * Public view — no internal IDs. We map to SocialLink type with
   * synthetic IDs and lenser_id to keep type consistency on the frontend.
   */
  async getLinksByHandle(handle: string): Promise<SocialLink[]> {
    const { data, error } = await supabase
      .from('vw_lensers_social_links_public')
      .select('platform, url, label')
      .eq('handle', handle)

    if (error) throw error

    // Map to a safe SocialLink shape (no real ids or lenser_id)
    return (data || []).map((l: any, i: number) => ({
      id: `public-link-${i}`,
      lenser_id: 'public',
      platform: l.platform as SocialPlatform,
      url: l.url,
      label: l.label,
      created_at: new Date().toISOString(),
    })) as SocialLink[]
  }

  /**
   * Full sync through RPC.
   * `handle` is not used for authorization — the RPC resolves lenser_id
   * via auth.uid() inside Postgres.
   */
  async syncLinks(
    _handle: string,
    links: (Omit<SocialLink, 'id' | 'lenser_id' | 'created_at'> & { id?: string })[]
  ): Promise<SocialLink[]> {
    // Prepare minimal payload: id?, platform, url, label
    const payload = links.map((l) => ({
      id: l.id ?? null,
      platform: l.platform,
      url: l.url,
      label: l.label,
    }))

    const { error } = await supabase.rpc('fn_lensers_sync_social_links', {
      p_links: payload,
    })

    if (error) throw error

    // After sync, reload the authenticated user's links via private view.
    // Caller should pass the current user's handle here.
    // We ignore _handle for auth, but still use it as a filter to stay consistent.
    return this.getLinks(_handle)
  }
}
