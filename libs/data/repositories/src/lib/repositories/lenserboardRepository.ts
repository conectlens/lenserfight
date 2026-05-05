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
    const { data, error } = await supabase
      .schema('battles')
      .from('contenders')
      .select(`
        contender_ref_id,
        slot,
        battle:battles!inner(
          id,
          status,
          winner_contender_id,
          total_vote_count
        )
      `)
      .eq('battle.status', 'published')
      .not('contender_ref_id', 'is', null)
      .limit(limit * 5)

    if (error) throw error

    const byLenser = new Map<string, { wins: number; battles: number; votes: number }>()

    for (const row of (data ?? []) as Array<{
      contender_ref_id: string
      slot: string
      battle: { id: string; winner_contender_id: string | null; total_vote_count: number }
    }>) {
      if (!row.contender_ref_id) continue
      const entry = byLenser.get(row.contender_ref_id) ?? { wins: 0, battles: 0, votes: 0 }
      entry.battles += 1
      entry.votes += row.battle.total_vote_count ?? 0
      byLenser.set(row.contender_ref_id, entry)
    }

    const topLenserIds = [...byLenser.keys()].slice(0, limit)
    if (topLenserIds.length === 0) return []

    const { data: profiles } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      .in('id', topLenserIds)

    return (profiles ?? []).map((p) => {
      const stats = byLenser.get(p.id) ?? { wins: 0, battles: 0, votes: 0 }
      return {
        lenser_id: p.id,
        handle: p.handle,
        display_name: p.display_name ?? p.handle,
        avatar_url: p.avatar_url ?? null,
        total_wins: stats.wins,
        total_battles: stats.battles,
        win_rate: stats.battles > 0 ? Math.round((stats.wins / stats.battles) * 100) / 100 : 0,
        total_votes_received: stats.votes,
      } as GlobalLenserboardEntry
    })
  }

  async getContenderRatings(lenserId: string, limit = 20): Promise<ContenderRating[]> {
    const { data, error } = await supabase
      .schema('battles')
      .from('contenders')
      .select(`
        id,
        slot,
        battle:battles!inner(
          id,
          slug,
          title,
          total_vote_count,
          vote_velocity,
          published_at,
          winner_contender_id
        )
      `)
      .eq('contender_ref_id', lenserId)
      .eq('battle.status', 'published')
      .order('battle.published_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data ?? []).map((row) => {
      const b = row.battle as unknown as {
        id: string; slug: string; title: string; total_vote_count: number
        vote_velocity: number; published_at: string; winner_contender_id: string | null
      }
      const slot = row.slot as 'A' | 'B'

      return {
        contender_id: row.id,
        battle_id: b.id,
        battle_slug: b.slug,
        battle_title: b.title,
        slot,
        winner_slot: null,
        total_vote_count: b.total_vote_count,
        vote_velocity: b.vote_velocity,
        published_at: b.published_at,
      } as ContenderRating
    })
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
