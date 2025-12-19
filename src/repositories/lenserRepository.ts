import {
  Lenser,
  CreateLenserDTO,
  LenserActivityPoint,
  ActionRecord,
  NetworkUser,
  AuthorProfile,
  LenserFullProfile,
  LenserProfileDTO,
} from '../types/lenser.types'
import { PromptTemplateRecord } from '../types/prompts.types'
import { ThreadRecord } from '../types/threads.types'
import { storage } from '../utils/storage'
import { supabase } from '../utils/supabase'

// --- Port (Interface) ---
export interface LenserRepositoryPort {
  createLenser(data: CreateLenserDTO): Promise<Lenser>
  updateLenser(data: Partial<Lenser>): Promise<Lenser>
  requestDeletion(handle: string): Promise<void>
  getRecentlyActive(limit: number): Promise<Lenser[]>
  getLatestJoined(): Promise<Lenser[]>

  getPromptsByLenser(
    lenserId: string,
    offset?: number,
    limit?: number,
    viewerId?: string
  ): Promise<PromptTemplateRecord[]>
  getThreadsByLenser(
    lenserId: string,
    offset?: number,
    limit?: number,
    viewerId?: string
  ): Promise<ThreadRecord[]>
  getActivityTimeline(lenserId: string): Promise<LenserActivityPoint[]>

  getPublicLenserProfile(handle: string): Promise<LenserProfileDTO>
  getAuthenticatedLenser(): Promise<Lenser | null>

  // New features
  getLenserActions(lenserId: string): Promise<ActionRecord[]>
  getLenserNetwork(
    lenserId: string,
    type: 'followers' | 'following',
    page: number
  ): Promise<NetworkUser[]>
}

// --- Mock Implementation ---
export class MockLenserRepository implements LenserRepositoryPort {
  private STORAGE_KEY_PREFIX = 'mock_lenser_'
  private INDEX_KEY = 'mock_lensers_index'
  private JOIN_LOG_KEY = 'mock_lenser_join_log'
  // Keys from other repos to calculate stats and sync profiles
  private PROMPTS_KEY = 'mock_prompts_db'
  private THREADS_KEY = 'mock_threads_db'

  private mockLensers: Lenser[] = [
    {
      id: 'lenser-1',
      user_id: 'user-1',
      handle: 'cassian.lens',
      display_name: 'Cassian',
      headline: 'Co-founder at LenserFight. Building the future of productive creativity.',
      bio: 'Passionate about AI and UX. Sharing tools for thought.',
      avatar_url: 'https://ui-avatars.com/api/?name=Cassian&background=111&color=fff',
      banner_url:
        'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=2400',
      website_url: 'https://lenserfight.com',
      visibility: 'public',
      is_in_waiting_list: false,
      is_super_admin: true,
      created_at: new Date(Date.now() - 100000000).toISOString(),
      join_order: 1,
    },
    {
      id: 'lenser-2',
      user_id: 'user-2',
      handle: 'sarah_ai',
      display_name: 'Sarah Connor',
      headline: 'Prompt Engineer | Resistance Leader',
      bio: 'Hunting terminators and optimizing LLMs.',
      avatar_url: 'https://ui-avatars.com/api/?name=Sarah+Connor&background=e11d48&color=fff',
      banner_url: null,
      visibility: 'public',
      is_in_waiting_list: true,
      is_super_admin: false,
      created_at: new Date(Date.now() - 80000000).toISOString(),
      join_order: 2,
    },
    {
      id: 'lenser-3',
      user_id: 'user-3',
      handle: 'neo_one',
      display_name: 'Neo',
      headline: 'The One',
      bio: 'I know Kung Fu and Python.',
      avatar_url: 'https://ui-avatars.com/api/?name=Neo&background=000&color=fff',
      banner_url: null,
      visibility: 'public',
      is_in_waiting_list: true,
      is_super_admin: false,
      created_at: new Date(Date.now() - 60000000).toISOString(),
      join_order: 3,
    },
    {
      id: 'lenser-4',
      user_id: 'user-4',
      handle: 'trinity_matrix',
      display_name: 'Trinity',
      headline: 'Hacker & Pilot',
      bio: 'Dodging bullets and hallucinations.',
      avatar_url: 'https://ui-avatars.com/api/?name=Trinity&background=0f172a&color=fff',
      banner_url: null,
      visibility: 'public',
      is_in_waiting_list: false,
      is_super_admin: false,
      created_at: new Date(Date.now() - 40000000).toISOString(),
      join_order: 4,
    },
  ]

  constructor() {
    // Seed initial join log if empty
    const logJson = storage.getItem(this.JOIN_LOG_KEY)
    if (!logJson) {
      const log = this.mockLensers.map((l) => ({ lenser_id: l.id, join_order: l.join_order }))
      storage.setItem(this.JOIN_LOG_KEY, JSON.stringify(log))
    }
  }
  getPublicLenserProfile(handle: string): Promise<LenserProfileDTO> {
    throw new Error('Method not implemented.')
  }
  getAuthenticatedLenser(): Promise<Lenser | null> {
    throw new Error('Method not implemented.')
  }

  private getJoinOrder(lenserId: string): number | undefined {
    const logJson = storage.getItem(this.JOIN_LOG_KEY)
    const log: { lenser_id: string; join_order: number }[] = logJson ? JSON.parse(logJson) : []
    const entry = log.find((l) => l.lenser_id === lenserId)
    return entry?.join_order
  }

  private createJoinLog(lenserId: string): number {
    const logJson = storage.getItem(this.JOIN_LOG_KEY)
    const log: { lenser_id: string; join_order: number }[] = logJson ? JSON.parse(logJson) : []

    const maxOrder = log.reduce((max, curr) => Math.max(max, curr.join_order), 0)
    const newOrder = maxOrder + 1

    log.push({ lenser_id: lenserId, join_order: newOrder })
    storage.setItem(this.JOIN_LOG_KEY, JSON.stringify(log))
    return newOrder
  }

  private enrich(lenser: Lenser | null): Lenser | null {
    if (!lenser) return null
    const order = this.getJoinOrder(lenser.id)
    if (order) return { ...lenser, join_order: order }
    return lenser
  }

  async getLenserByHandle(handle: string): Promise<Lenser | null> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const indexJson = storage.getItem(this.INDEX_KEY)
    if (indexJson) {
      const index: Lenser[] = JSON.parse(indexJson)
      const found = index.find((l) => l.handle.toLowerCase() === handle.toLowerCase())
      if (found) return this.enrich(found)
    }
    const mock = this.mockLensers.find((l) => l.handle.toLowerCase() === handle.toLowerCase())
    if (mock) return this.enrich(mock)
    return null
  }

  async getFullProfileByHandle(handle: string): Promise<LenserFullProfile | null> {
    await new Promise((resolve) => setTimeout(resolve, 600))
    const lenser = await this.getLenserByHandle(handle)
    if (!lenser) return null

    // Mock XP calculation
    const xp = 1250
    const current_level = 4
    const min = (current_level - 1) * (current_level - 1) * 100
    const max = current_level * current_level * 100

    return {
      id: lenser.id,
      user_id: lenser.user_id,
      handle: lenser.handle,
      display_name: lenser.display_name,
      bio: lenser.bio,
      headline: lenser.headline,
      avatar_url: lenser.avatar_url,
      banner_url: lenser.banner_url,
      website_url: lenser.website_url,
      status: 'active',
      join_order: lenser.join_order,

      thread_count: 0,
      prompt_count: 0,
      follower_count: 0,
      following_count: 0,

      xp: xp,
      current_level: current_level,
      global_rank: 42,
      xp_min: min,
      xp_max: max,
      badges: [],
    }
  }

  async createLenser(data: CreateLenserDTO): Promise<Lenser> {
    await new Promise((resolve) => setTimeout(resolve, 800))
    const newId = `lenser-${Date.now()}-uuid`
    const joinOrder = this.createJoinLog(newId)

    const newLenser: Lenser = {
      id: newId,
      // TODO: FIX THIS
      user_id: 'asdasd',
      handle: data.handle,
      display_name: data.display_name,
      bio: data.bio || '',
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.display_name)}&background=random`,
      banner_url: null,
      visibility: 'public',
      is_in_waiting_list: false,
      is_super_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      join_order: joinOrder,
    }

    storage.setItem(this.STORAGE_KEY_PREFIX + data.handle, JSON.stringify(newLenser))
    const indexJson = storage.getItem(this.INDEX_KEY)
    const index: Lenser[] = indexJson ? JSON.parse(indexJson) : []
    index.push(newLenser)
    storage.setItem(this.INDEX_KEY, JSON.stringify(index))

    return newLenser
  }

  async updateLenser(data: Partial<Lenser>): Promise<Lenser> {
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Resolve ID from handle first for Mock Storage
    const lenser = await this.getLenserByHandle(data.handle)
    if (!lenser) throw new Error('Lenser profile not found')

    const userId = lenser.user_id
    if (!userId) throw new Error('Invalid lenser state')

    const updatedLenser = { ...lenser, ...data, updated_at: new Date().toISOString() }

    // Save
    storage.setItem(this.STORAGE_KEY_PREFIX + userId, JSON.stringify(updatedLenser))

    // Update Index
    const indexJson = storage.getItem(this.INDEX_KEY)
    const index: Lenser[] = indexJson ? JSON.parse(indexJson) : []
    const idx = index.findIndex((l) => l.user_id === userId)
    if (idx !== -1) {
      index[idx] = updatedLenser
    } else {
      index.push(updatedLenser)
    }
    storage.setItem(this.INDEX_KEY, JSON.stringify(index))

    // --- TRIGGER SIMULATION: Sync author_profile in Threads & Prompts ---
    const newProfile: AuthorProfile = {
      id: updatedLenser.id,
      handle: updatedLenser.handle,
      display_name: updatedLenser.display_name,
      avatar_url: updatedLenser.avatar_url,
    }

    // Update Prompts
    const promptsJson = storage.getItem(this.PROMPTS_KEY)
    if (promptsJson) {
      const prompts: any[] = JSON.parse(promptsJson)
      let changed = false
      prompts.forEach((p) => {
        if (p.lenser_id === updatedLenser.id) {
          p.author_profile = newProfile
          changed = true
        }
      })
      if (changed) storage.setItem(this.PROMPTS_KEY, JSON.stringify(prompts))
    }

    // Update Threads
    const threadsJson = storage.getItem(this.THREADS_KEY)
    if (threadsJson) {
      const threads: any[] = JSON.parse(threadsJson)
      let changed = false
      threads.forEach((t) => {
        if (t.lenser_id === updatedLenser.id) {
          t.author_profile = newProfile
          changed = true
        }
      })
      if (changed) storage.setItem(this.THREADS_KEY, JSON.stringify(threads))
    }

    return updatedLenser
  }

  async requestDeletion(): Promise<void> {
    const { error } = await supabase.rpc('fn_lensers_request_deletion')
    if (error) throw error
  }

  async getRecentlyActive(limit: number): Promise<Lenser[]> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return this.mockLensers.slice(0, limit).map((l) => this.enrich(l)!)
  }

  async getLatestJoined(): Promise<Lenser[]> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const limit = 5
    const indexJson = storage.getItem(this.INDEX_KEY)
    const dynamicLensers: Lenser[] = indexJson ? JSON.parse(indexJson) : []
    const all = [...this.mockLensers]
    dynamicLensers.forEach((d) => {
      if (!all.find((m) => m.id === d.id)) {
        all.push(d)
      }
    })
    const enriched = all.map((l) => this.enrich(l)!)
    return enriched.sort((a, b) => (b.join_order || 0) - (a.join_order || 0)).slice(0, limit)
  }

  async getPromptsByLenser(
    lenserId: string,
    offset = 0,
    limit = 10,
    viewerId?: string
  ): Promise<PromptTemplateRecord[]> {
    await new Promise((resolve) => setTimeout(resolve, 400))
    const promptsJson = storage.getItem(this.PROMPTS_KEY)
    const allPrompts: PromptTemplateRecord[] = promptsJson ? JSON.parse(promptsJson) : []
    const filtered = allPrompts
      .filter((p) => {
        if (p.lenser_id !== lenserId) return false
        if (p.visibility === 'public') return true
        return viewerId === lenserId
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return filtered.slice(offset, offset + limit)
  }

  async getThreadsByLenser(
    lenserId: string,
    offset = 0,
    limit = 10,
    viewerId?: string
  ): Promise<ThreadRecord[]> {
    await new Promise((resolve) => setTimeout(resolve, 400))
    const threadsJson = storage.getItem(this.THREADS_KEY)
    const allThreads: ThreadRecord[] = threadsJson ? JSON.parse(threadsJson) : []
    const filtered = allThreads
      .filter((t) => {
        if (t.lenser_id !== lenserId) return false
        if (t.visibility === 'public') return true
        return viewerId === lenserId
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return filtered.slice(offset, offset + limit)
  }

  async getActivityTimeline(lenserId: string): Promise<LenserActivityPoint[]> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const points: LenserActivityPoint[] = []
    const now = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      if (Math.random() > 0.6) {
        points.push({ date: d.toISOString().split('T')[0], count: Math.floor(Math.random() * 8) })
      }
    }
    return points
  }

  async getLenserActions(lenserId: string): Promise<ActionRecord[]> {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return []
  }

  async getLenserNetwork(
    lenserId: string,
    type: 'followers' | 'following',
    page: number
  ): Promise<NetworkUser[]> {
    await new Promise((resolve) => setTimeout(resolve, 800))
    if (page > 3) return []
    const baseUsers: NetworkUser[] = [
      {
        id: 'net-1',
        handle: 'design_guru',
        display_name: 'Design Guru',
        avatar_url: 'https://ui-avatars.com/api/?name=DG&background=random',
        is_following: true,
      },
      {
        id: 'net-2',
        handle: 'ai_wizard',
        display_name: 'AI Wizard',
        avatar_url: 'https://ui-avatars.com/api/?name=AW&background=random',
        is_following: false,
      },
      {
        id: 'net-3',
        handle: 'frontend_master',
        display_name: 'Frontend Master',
        avatar_url: 'https://ui-avatars.com/api/?name=FM&background=random',
        is_following: true,
      },
    ]
    return baseUsers.map((u) => ({ ...u, id: `${u.id}-p${page}` }))
  }
}

// --- Supabase Implementation ---
export class SupabaseLenserRepository implements LenserRepositoryPort {
  async getPublicLenserProfile(handle: string): Promise<LenserProfileDTO> {
    const { data, error } = await supabase.rpc('fn_lensers_get_public_profile', {
      p_handle: handle,
    })

    if (error) throw error

    return {
      handle: data.handle,
      display_name: data.display_name,
      avatar_url: data.avatar_url,
      banner_url: data.banner_url,
      headline: data.headline,
      bio: data.bio,
      join_order: data.join_order,
      visibility: data.visibility,
      total_xp: data.total_xp,
      current_level: data.current_level,
      badges: data.badges,
    }
  }

  async getAuthenticatedLenser(): Promise<Lenser | null> {
    const { data, error } = await supabase.rpc('fn_lensers_get_authenticated_profile')

    if (error) return null
    return data as Lenser
  }

  async createLenser(data: CreateLenserDTO): Promise<Lenser> {
    const { data: newLenser, error } = await supabase.rpc('fn_lensers_create_profile', {
      p_handle: data.handle,
      p_display_name: data.display_name,
      p_bio: data.bio || '',
      p_headline: null,
    })
    console.log('x')
    if (error) throw error
    return newLenser as Lenser
  }

  async updateLenser(data: Partial<Lenser>): Promise<Lenser> {
    const { data: updated, error } = await supabase.rpc('fn_lensers_update_profile', {
      p_display_name: data.display_name ?? null,
      p_avatar_url: data.avatar_url ?? null,
      p_banner_url: data.banner_url ?? null,
      p_bio: data.bio ?? null,
      p_headline: data.headline ?? null,
      p_preferences: data.preferences ?? null,
    })

    if (error) throw error
    return updated as Lenser
  }

  async requestDeletion(): Promise<void> {
    const { error } = await supabase.rpc('fn_lensers_request_deletion')
    if (error) throw error
  }

  async getRecentlyActive(limit: number): Promise<Lenser[]> {
    const { data, error } = await supabase
      .from('vw_lensers_profile_full')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data as Lenser[]
  }

  async getLatestJoined(): Promise<Lenser[]> {
    // Fetch directly from lensers table using the join_order column
    const { data, error } = await supabase.from('vw_lensers_public_recent').select('*')
    if (error) throw error
    return data as Lenser[]
  }

  async getPromptsByLenser(
    handle: string,
    offset = 0,
    limit = 10,
    viewerId?: string
  ): Promise<PromptTemplateRecord[]> {
    const query = supabase
      .from('vw_prompt_templates_public')
      .select('*') // Reads denormalized profile/tags directly
      .eq('handle', handle)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // if (viewerId !== lenserId) {
    //     query = query.eq('visibility', 'public');
    // }

    const { data, error } = await query
    if (error) throw error
    return data as PromptTemplateRecord[]
  }

  async getThreadsByLenser(
    lenserId: string,
    offset = 0,
    limit = 10,
    viewerId?: string
  ): Promise<ThreadRecord[]> {
    let query = supabase
      .from('threads')
      .select('*')
      .eq('lenser_id', lenserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (viewerId !== lenserId) {
      query = query.eq('visibility', 'public')
    }

    const { data, error } = await query
    if (error) throw error
    return data as ThreadRecord[]
  }

  async getActivityTimeline(lenserId: string): Promise<LenserActivityPoint[]> {
    return []
  }
  async getLenserActions(lenserId: string): Promise<ActionRecord[]> {
    return []
  }
  async getLenserNetwork(
    lenserId: string,
    type: 'followers' | 'following',
    page: number
  ): Promise<NetworkUser[]> {
    return []
  }
}
