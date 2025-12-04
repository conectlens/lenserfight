
import { SharedLink, CreateLinkDTO, ShareEvent, ResolveLinkResult } from '../types/share.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface ShareRepositoryPort {
  createLink(dto: CreateLinkDTO, creatorLenserId: string): Promise<SharedLink>;
  resolveLink(shortId: string): Promise<ResolveLinkResult | null>;
  logEvent(shortId: string, eventType: 'opened', viewerData: Partial<ShareEvent>): Promise<void>;
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

  async createLink(dto: CreateLinkDTO, creatorLenserId: string): Promise<SharedLink> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Deterministic mock short ID logic
    const links = this.getLinks();
    const shortId = `lnk${(links.length + 1).toString().padStart(3, '0')}`;
    
    const newLink: SharedLink = {
      id: `link-${Date.now()}`,
      short_id: shortId,
      resource_type: dto.resourceType,
      resource_id: dto.resourceId,
      slug: dto.slug || null,
      creator_lenser_id: creatorLenserId,
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

    // Log generation event
    this.logEvent(shortId, 'generated', { viewer_lenser_id: creatorLenserId });

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
                path = `/prompts/${link.resource_id}`;
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

  async logEvent(shortId: string, eventType: 'opened' | 'generated', viewerData: Partial<ShareEvent>): Promise<void> {
    // In mock, we just store it
    const links = this.getLinks();
    const link = links.find(l => l.short_id === shortId);
    if (!link) return;

    const events = this.getEvents();
    const newEvent: ShareEvent = {
        id: `evt-${Date.now()}-${Math.random()}`,
        shared_link_id: link.id,
        event_type: eventType,
        viewer_lenser_id: viewerData.viewer_lenser_id,
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
  async createLink(dto: CreateLinkDTO, creatorLenserId: string): Promise<SharedLink> {
    const { data, error } = await supabase.functions.invoke('create-link', {
        body: { ...dto, creatorLenserId }
    });
    
    if (error) throw error;
    return data as SharedLink;
  }

  async resolveLink(shortId: string): Promise<ResolveLinkResult | null> {
    const { data, error } = await supabase.from('shared_links').select('*').eq('short_id', shortId).single();
    
    if (error || !data) return null;
    
    const link = data as SharedLink;
    let path = '/';
    
    if (link.resource_type === 'external') {
        path = link.meta?.targetUrl || link.resource_id; // Check meta first for real URLs stored under UUID resource_id
    } else if (link.resource_type === 'prompt') {
        path = `/prompts/${link.slug || link.resource_id}`;
    } else if (link.resource_type === 'thread') {
        path = `/threads/${link.resource_id}`;
    } else if (link.resource_type === 'profile') {
        path = `/lenser/${link.slug || link.resource_id}`;
    }

    return {
        url: path,
        link
    };
  }

  async logEvent(shortId: string, eventType: 'opened', viewerData: Partial<ShareEvent>): Promise<void> {
    await supabase.functions.invoke('log-share-event', {
        body: { shortId, eventType, ...viewerData }
    });
  }
}
