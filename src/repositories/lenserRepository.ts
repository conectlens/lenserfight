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
import { supabase } from '../core/supabase/client'

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
  getLenserById(id: string): Promise<Lenser | null>
}
export class SupabaseLenserRepository implements LenserRepositoryPort {
  async getPublicLenserProfile(handle: string): Promise<LenserProfileDTO> {
    const { data, error } = await supabase.rpc('fn_lensers_get_public_profile', {
      p_handle: handle,
    })

    if (error) throw error
    if (!data) return null as any;

    return {
      id: data.id,
      handle: data.handle,
      display_name: data.display_name,
      avatar_url: data.avatar_url,
      headline: data.headline,
      join_order: data.join_order,
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
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) throw new Error('Not authenticated')

    const { data: newLenser, error } = await supabase.schema('lensers').from('profiles').insert({
      user_id: authData.user.id,
      handle: data.handle,
      display_name: data.display_name,
      bio: data.bio || '',
      headline: null
    }).select('*').single()

    if (error) throw error
    return newLenser as Lenser
  }

  async updateLenser(data: Partial<Lenser>): Promise<Lenser> {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) throw new Error('Not authenticated')

    const updatePayload: any = {}
    if (data.display_name !== undefined) updatePayload.display_name = data.display_name
    if (data.avatar_url !== undefined) updatePayload.avatar_url = data.avatar_url
    if (data.banner_url !== undefined) updatePayload.banner_url = data.banner_url
    if (data.bio !== undefined) updatePayload.bio = data.bio
    if (data.headline !== undefined) updatePayload.headline = data.headline
    if (data.preferences !== undefined) updatePayload.preferences = data.preferences

    const { data: updated, error } = await supabase.schema('lensers').from('profiles')
      .update(updatePayload)
      .eq('user_id', authData.user.id)
      .select('*')
      .single()

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
  async getLenserById(id: string): Promise<Lenser | null> {
    const { data, error } = await supabase.from('vw_lensers_profile_full').select('*').eq('id', id).single()
    if (error) return null
    return data as Lenser
  }
}
