import { SharedLink, CreateLinkDTO, ShareEvent, ResolveLinkResult } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

export interface ShareRepositoryPort {
  createOrGetSharedLink(dto: CreateLinkDTO): Promise<SharedLink>
  resolveLink(shortId: string): Promise<ResolveLinkResult | null>
  logEvent(shortId: string, eventType: 'opened', viewerData?: Partial<ShareEvent>): Promise<void>
}
export class SupabaseShareRepository implements ShareRepositoryPort {
  // 1. CREATE OR REUSE SHARED LINK
  async createOrGetSharedLink(dto: CreateLinkDTO): Promise<SharedLink> {
    const { data, error } = await supabase.rpc('fn_analytics_shared_links_create', {
      p_resource_type: dto.resourceType,
      p_resource_id: dto.resourceId, // REQUIRED
      p_slug: dto.slug ?? null,
      p_channel: dto.channel ?? 'in_app',
      p_meta: dto.meta ?? {},
      p_display_name: dto.displayName ?? null,
    })

    if (error) throw error
    return data as SharedLink
  }

  // 2. RESOLVE SHORT LINK
  async resolveLink(shortId: string): Promise<ResolveLinkResult | null> {
    const { data, error } = await supabase.rpc('fn_analytics_shared_links_get', {
      p_short_id: shortId,
    })

    if (error || !data) return null

    const link = data as SharedLink

    let path = '/'

    switch (link.resource_type) {
      case 'external':
        path = link.meta?.targetUrl || link.resource_id
        break

      case 'lens':
        path = `/lenses/${link.slug || link.resource_id}`
        break

      case 'thread':
        path = `/threads/${link.resource_id}`
        break

      case 'profile':
        path = `/lenser/${link.slug || link.resource_id}`
        break
    }

    return {
      url: path,
      link,
    }
  }

  // 3. LOG AN EVENT
  async logEvent(
    shortId: string,
    eventType: 'opened',
    viewerData: Partial<ShareEvent> = {}
  ): Promise<void> {
    const { error } = await supabase.rpc('fn_analytics_share_events_log', {
      p_short_id: shortId,
      p_event_type: eventType,
      p_ip_hash: viewerData.ip_hash ?? null,
      p_user_agent: viewerData.user_agent ?? null,
      p_referer: viewerData.referer ?? null,
      p_country: viewerData.country ?? null,
      p_city: viewerData.city ?? null,
    })

    if (error) throw error
  }
}
