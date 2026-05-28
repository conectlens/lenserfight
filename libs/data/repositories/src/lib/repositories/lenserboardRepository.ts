import { supabase } from '@lenserfight/data/supabase'
import type { TrendingBattleRecord } from './battlesRepository'

export interface GlobalLenserboardEntry {
  lenser_id: string
  handle: string
  display_name: string
  avatar_url: string | null
  total_wins: number
  total_battles: number
  win_rate: number
  total_votes_received: number
}

export interface ContenderRating {
  contender_id: string
  battle_id: string
  battle_slug: string
  battle_title: string
  slot: 'A' | 'B'
  winner_slot: 'A' | 'B' | null
  total_vote_count: number
  vote_velocity: number
  published_at: string | null
}

export interface LenserboardRepositoryPort {
  getGlobalLenserboard(limit?: number): Promise<GlobalLenserboardEntry[]>
  getContenderRatings(lenserId: string, limit?: number): Promise<ContenderRating[]>
  getTrendingBattles(limit?: number, cursor?: number | null): Promise<TrendingBattleRecord[]>
}

export class SupabaseLenserboardRepository implements LenserboardRepositoryPort {
  async getGlobalLenserboard(limit = 50): Promise<GlobalLenserboardEntry[]> {
    const { data, error } = await supabase.rpc('fn_get_global_lenserboard', {
      p_limit: limit,
    })
    if (error) throw error
    return (data ?? []) as GlobalLenserboardEntry[]
  }

  async getContenderRatings(lenserId: string, limit = 20): Promise<ContenderRating[]> {
    const { data, error } = await supabase.rpc('fn_get_contender_ratings', {
      p_lenser_id: lenserId,
      p_limit: limit,
    })
    if (error) throw error
    return (data ?? []) as ContenderRating[]
  }

  async getTrendingBattles(limit = 20, cursor: number | null = null): Promise<TrendingBattleRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_trending_battles', {
      p_limit:  limit,
      p_cursor: cursor,
    })
    if (error) throw error
    return (data ?? []) as TrendingBattleRecord[]
  }
}

export const lenserboardRepository = new SupabaseLenserboardRepository()
