export type ShareResourceType =
  | 'lens'
  | 'thread'
  | 'arena'
  | 'profile'
  | 'challenge'
  | 'external'
  | 'battle'
  | 'workflow'
  | 'tournament'
  | 'series'
  | 'tag'

export interface SharedLink {
  id: string
  short_id: string
  resource_type: ShareResourceType
  resource_id: string
  slug?: string | null
  channel: string
  campaign_key?: string | null
  experiment_key?: string | null
  experiment_variant?: string | null
  meta: Record<string, any>
  created_at: string
  display_name?: string | null
}

export interface ShareEvent {
  id: string
  shared_link_id: string
  event_type: 'generated' | 'opened'
  viewer_session_id?: string | null
  ip_hash?: string | null
  country?: string | null
  city?: string | null
  user_agent?: string | null
  referer?: string | null
  ref_host?: string | null
  created_at: string
}

export interface CreateLinkDTO {
  resourceType: ShareResourceType
  resourceId: string
  slug?: string
  channel?: string
  campaignKey?: string
  experimentKey?: string
  experimentVariant?: string
  meta?: Record<string, any>
  displayName?: string
}

export interface ResolveLinkResult {
  url: string
  link: SharedLink
}
