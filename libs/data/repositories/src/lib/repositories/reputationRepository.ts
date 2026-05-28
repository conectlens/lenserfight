import { supabase } from '@lenserfight/data/supabase'
import {
  LenserScoreRecord,
  ContenderRatingRecord,
  JudgeCalibrationRecord,
} from '@lenserfight/types'

// --- View type (maps xp.v_leaderboard with p_order_by='elo') ---

export interface EloLeaderboardEntry {
  lenser_id: string
  handle: string
  display_name: string
  avatar_url: string | null
  type: string
  total_xp: number
  current_level: number
  elo_score: number
  composite_score: number
  battles_played: number
  battles_won: number
  xp_rank: number
  elo_rank: number
}

// --- Port ---

export interface ReputationRepositoryPort {
  getLenserScores(lenserId: string): Promise<LenserScoreRecord[]>
  getContenderRating(lenserId: string, category?: string): Promise<ContenderRatingRecord | null>
  getJudgeCalibration(lenserId: string): Promise<JudgeCalibrationRecord | null>
  getEloLeaderboard(limit?: number, offset?: number): Promise<EloLeaderboardEntry[]>
}

// --- Supabase Implementation ---

export class SupabaseReputationRepository implements ReputationRepositoryPort {
  private handleError(error: unknown) {
    const e = error as { code?: string; message?: string }
    if (!e) return
    if (e.code === 'PGRST116') throw new Error('Reputation record not found.')
    throw error
  }

  async getLenserScores(lenserId: string): Promise<LenserScoreRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_lenser_scores', {
      p_lenser_id: lenserId,
    })

    if (error) this.handleError(error)
    return (data ?? []) as LenserScoreRecord[]
  }

  async getContenderRating(lenserId: string, category?: string): Promise<ContenderRatingRecord | null> {
    const { data, error } = await supabase.rpc('fn_get_contender_rating', {
      p_lenser_id: lenserId,
      p_category: category ?? null,
    })

    if (error) this.handleError(error)
    return (data?.[0] ?? null) as ContenderRatingRecord | null
  }

  async getJudgeCalibration(lenserId: string): Promise<JudgeCalibrationRecord | null> {
    const { data, error } = await supabase.rpc('fn_get_judge_calibration', {
      p_lenser_id: lenserId,
    })

    if (error) this.handleError(error)
    return (data?.[0] ?? null) as JudgeCalibrationRecord | null
  }

  async getEloLeaderboard(limit = 50, offset = 0): Promise<EloLeaderboardEntry[]> {
    const { data, error } = await supabase.rpc('fn_get_leaderboard', {
      p_order_by: 'elo',
      p_limit: limit,
      p_offset: offset,
    })
    if (error) this.handleError(error)
    return (data ?? []) as EloLeaderboardEntry[]
  }
}
