
import { SharedLink, CreateLinkDTO, ShareEvent, ResolveLinkResult } from '../types/share.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface ShareRepositoryPort {
  createOrGetSharedLink(dto: CreateLinkDTO): Promise<SharedLink>;
  resolveLink(shortId: string): Promise<ResolveLinkResult | null>;
  logEvent(shortId: string, eventType: 'opened', viewerData?: Partial<ShareEvent>): Promise<void>;
}

export class MockShareRepository implements ShareRepositoryPort {
  private LINKS_KEY = 'mock_shared_links';
  private EVENTS_KEY = 'mock_share_events';

  private getLinks(): SharedLink[] {
    return JSON.parse(storage.getItem(this.LINKS_KEY) || '[]');
  }

  private getEvents(): ShareEvent[] {
    return JSON.parse(storage.getItem(this.EVENTS_KEY) || '[]');
  }

  async createOrGetSharedLink(dto: CreateLinkDTO): Promise<SharedLink> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const links = this.getLinks();

    // Idempotency Check: Return existing if matches constraints
    const existing = links.find(l => 
        l.resource_type === dto.resourceType && 
        l.resource_id === dto.resourceId
    );

    if (existing) {
        return existing;
    }
    
    // Deterministic mock short ID logic
    const shortId = `lnk${(links.length + 1).toString().padStart(3, '0')}`;
    
    const newLink: SharedLink = {
      id: `link-${Date.now()}`,
      short_id: shortId,
      resource_type: dto.resourceType,
      resource_id: dto.resourceId,
      slug: dto.slug || null,
      channel: dto.channel || 'in_app',
      campaign_key: dto.campaignKey || null,
      experiment_key: dto.experimentKey || null,
      experiment_variant: dto.experimentVariant || null,
      meta: dto.meta || {},
      created_at: new Date().toISOString(),
      display_name: dto.displayName || null
    };

    links.push(newLink);
    storage.setItem(this.LINKS_KEY, JSON.stringify(links));

    // Log generation event only on actual creation
    this.logEvent(shortId, "generated");

    return newLink;
  }

  async resolveLink(shortId: string): Promise<ResolveLinkResult | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const links = this.getLinks();
    const link = links.find(l => l.short_id === shortId);
    
    if (!link) return null;

    let path = '/app';
    if (link.resource_type === 'external') {
        // Prefer meta.targetUrl if available, falling back to resource_id (legacy/mock)
        path = link.meta?.targetUrl || link.resource_id; 
    } else {
        switch (link.resource_type) {
            case 'prompt':
                path = `/len/p/${link.resource_id}`;
                break;
            case 'thread':
                path = `/threads/${link.resource_id}`;
                break;
            case 'profile':
                path = `/lenser/${link.slug || link.resource_id}`;
                break;
            case 'arena':
            case 'challenge':
                path = '/app';
                break;
        }
    }

    return {
        url: path,
        link
    };
  }

  async logEvent(shortId: string, eventType: 'opened' | 'generated', viewerData?: Partial<ShareEvent>): Promise<void> {
    // In mock, we just store it
    const links = this.getLinks();
    const link = links.find(l => l.short_id === shortId);
    if (!link) return;

    const events = this.getEvents();
    const newEvent: ShareEvent = {
        id: `evt-${Date.now()}-${Math.random()}`,
        shared_link_id: link.id,
        event_type: eventType,
        viewer_session_id: viewerData.viewer_session_id || 'mock-session',
        ip_hash: 'mock-hash',
        country: 'Mockland',
        city: 'Mock City',
        created_at: new Date().toISOString()
    };
    
    events.push(newEvent);
    storage.setItem(this.EVENTS_KEY, JSON.stringify(events));
    
    if (eventType === 'opened') {
        console.groupCollapsed(`[Mock Analytics] Link ${shortId} Opened`);
        console.log("Link:", link);
        console.log("Event:", newEvent);
        console.groupEnd();
    }
  }
}
export class SupabaseShareRepository implements ShareRepositoryPort {

  // 1. CREATE OR REUSE SHARED LINK
  async createOrGetSharedLink(
    dto: CreateLinkDTO,
  ): Promise<SharedLink> {
    
  const { data, error } = await supabase.rpc(
    'fn_analytics_shared_links_create',
    {
      p_resource_type: dto.resourceType,
      p_resource_id: dto.resourceId,            // REQUIRED
      p_slug: dto.slug ?? null,
      p_channel: dto.channel ?? "in_app",
      p_meta: dto.meta ?? {},
      p_display_name: dto.displayName ?? null
    }
  );

    if (error) throw error;
    return data as SharedLink;
  }


  // 2. RESOLVE SHORT LINK
  async resolveLink(shortId: string): Promise<ResolveLinkResult | null> {
    const { data, error } = await supabase.rpc(
      "fn_analytics_shared_links_get",
      { p_short_id: shortId }
    );

    if (error || !data) return null;

    const link = data as SharedLink;

    let path = "/";

    switch (link.resource_type) {
      case "external":
        path = link.meta?.targetUrl || link.resource_id;
        break;

      case "prompt":
        path = `/len/p/${link.slug || link.resource_id}`;
        break;

      case "thread":
        path = `/threads/${link.resource_id}`;
        break;

      case "profile":
        path = `/lenser/${link.slug || link.resource_id}`;
        break;
    }

    return {
      url: path,
      link
    };
  }


  // 3. LOG AN EVENT
  async logEvent(
    shortId: string,
    eventType: "opened",
    viewerData: Partial<ShareEvent>
  ): Promise<void> {
    
    const { error } = await supabase.rpc(
      "fn_analytics_share_events_log",
      {
        p_short_id: shortId,
        p_event_type: eventType,
        p_ip_hash: viewerData.ip_hash ?? null,
        p_user_agent: viewerData.user_agent ?? null,
        p_referer: viewerData.referer ?? null,
        p_country: viewerData.country ?? null,
        p_city: viewerData.city ?? null
      }
    );

    if (error) throw error;
  }
}
