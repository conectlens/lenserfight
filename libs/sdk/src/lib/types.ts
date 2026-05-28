// Public types for the @lenserfight/sdk alpha. Intentionally a small surface;
// expanded as RPCs are promoted from preview to stable.

export type BattleLifecycleStatus =
  | 'draft'
  | 'open'
  | 'voting'
  | 'scoring'
  | 'closed'

export interface BrowseFilters {
  search?: string
  category?: string
  status?: BattleLifecycleStatus
}

export interface BrowseCursor {
  created_at: string
  id: string
}

export interface BrowseBattle {
  id: string
  slug: string
  title: string
  status: BattleLifecycleStatus
  created_at: string
  task_prompt?: string | null
  category?: string | null
}

export interface BattleTemplate {
  id: string
  title: string
  task_prompt: string
  is_public: boolean
  creator_lenser_id?: string | null
  created_at: string
}

export interface CreateClientOptions {
  /**
   * Supabase project URL — e.g. https://xyz.supabase.co for hosted, or
   * http://localhost:54321 for a local instance.
   */
  url: string
  /**
   * Anonymous (publishable) key. Never put a service-role key here — this SDK
   * is designed for unauthenticated and end-user contexts.
   */
  anonKey: string
  /**
   * Optional custom fetch implementation — useful in Node 18 (which has
   * undici fetch) or test environments. Defaults to global fetch.
   */
  fetch?: typeof fetch
}
