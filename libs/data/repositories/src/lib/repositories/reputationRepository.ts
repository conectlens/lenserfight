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
    const { data, error } = await supabase
      .schema('reputation')
      .from('lenser_scores')
      .select('id, lenser_id, score_type, score, uncertainty, computed_at')
      .eq('lenser_id', lenserId)
      .order('computed_at', { ascending: false })

    if (error) this.handleError(error)
    return (data ?? []) as LenserScoreRecord[]
  }

  async getContenderRating(lenserId: string, category?: string): Promise<ContenderRatingRecord | null> {
    let query = supabase
      .schema('reputation')
      .from('contender_ratings')
      .select('id, lenser_id, category, elo_rating, uncertainty, battles_played, wins, draws, losses, updated_at')
      .eq('lenser_id', lenserId)

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (error) this.handleError(error)
    return data as ContenderRatingRecord | null
  }

  async getJudgeCalibration(lenserId: string): Promise<JudgeCalibrationRecord | null> {
    const { data, error } = await supabase
      .schema('reputation')
      .from('judge_calibrations')
      .select('id, lenser_id, calibration_score, total_judgments, agreement_rate, kappa_score, updated_at')
      .eq('lenser_id', lenserId)
      .maybeSingle()

    if (error) this.handleError(error)
    return data as JudgeCalibrationRecord | null
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
