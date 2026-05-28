import { supabase } from '@lenserfight/data/supabase'

export interface TournamentRecord {
  id: string
  title: string
  slug: string
  creator_lenser_id: string | null
  format: 'single_elimination' | 'round_robin' | 'swiss'
  status: 'pending' | 'registration' | 'active' | 'completed' | 'cancelled'
  max_contenders: number
  battle_type: string
  ai_judge_enabled: boolean
  created_at: string
  updated_at: string
}

export interface TournamentContenderRecord {
  id: string
  tournament_id: string
  lenser_id: string
  seed: number | null
  status: 'registered' | 'active' | 'eliminated' | 'winner'
  created_at: string
  // joined
  handle?: string
  display_name?: string
  avatar_url?: string | null
}

export interface TournamentMatchRecord {
  round_number: number
  round_status: string
  match_id: string
  battle_id: string | null
  battle_slug: string | null
  contender_a_lenser_id: string | null
  contender_a_handle: string | null
  contender_a_avatar_url: string | null
  contender_b_lenser_id: string | null
  contender_b_handle: string | null
  contender_b_avatar_url: string | null
  winner_lenser_id: string | null
  winner_handle: string | null
  winner_avatar_url: string | null
}

export interface TournamentRepositoryPort {
  getTournament(slug: string): Promise<TournamentRecord | null>
  listTournaments(limit?: number): Promise<TournamentRecord[]>
  getTournamentBracket(tournamentId: string): Promise<TournamentMatchRecord[]>
  getTournamentContenders(tournamentId: string): Promise<TournamentContenderRecord[]>
  createTournament(input: {
    title: string
    format?: string
    maxContenders?: number
    battleType?: string
    aiJudgeEnabled?: boolean
  }): Promise<TournamentRecord>
  registerContender(tournamentId: string): Promise<TournamentContenderRecord>
  startTournament(tournamentId: string): Promise<void>
  advanceTournament(matchId: string): Promise<void>
}

export class SupabaseTournamentRepository implements TournamentRepositoryPort {
  async getTournament(slug: string): Promise<TournamentRecord | null> {
    const { data, error } = await supabase.rpc('fn_get_tournament_by_slug', { p_slug: slug })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as TournamentRecord | null
  }

  async listTournaments(limit = 20): Promise<TournamentRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_tournaments', { p_limit: limit })
    if (error) throw error
    return (data ?? []) as TournamentRecord[]
  }

  async getTournamentBracket(tournamentId: string): Promise<TournamentMatchRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_tournament_bracket', {
      p_tournament_id: tournamentId,
    })
    if (error) throw error
    return (data ?? []) as TournamentMatchRecord[]
  }

  async getTournamentContenders(tournamentId: string): Promise<TournamentContenderRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_tournament_contenders', {
      p_tournament_id: tournamentId,
    })
    if (error) throw error
    return (data ?? []) as TournamentContenderRecord[]
  }

  async createTournament(input: {
    title: string
    format?: string
    maxContenders?: number
    battleType?: string
    aiJudgeEnabled?: boolean
  }): Promise<TournamentRecord> {
    const { data, error } = await supabase.rpc('fn_create_tournament', {
      p_title:             input.title,
      p_format:            input.format ?? 'single_elimination',
      p_max_contenders:    input.maxContenders ?? 8,
      p_battle_type:       input.battleType ?? 'ai_vs_ai',
      p_ai_judge_enabled:  input.aiJudgeEnabled ?? false,
    })
    if (error) throw error
    return (Array.isArray(data) ? data[0] : data) as TournamentRecord
  }

  async registerContender(tournamentId: string): Promise<TournamentContenderRecord> {
    const { data, error } = await supabase.rpc('fn_register_tournament_contender', {
      p_tournament_id: tournamentId,
    })
    if (error) throw error
    return (Array.isArray(data) ? data[0] : data) as TournamentContenderRecord
  }

  async startTournament(tournamentId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_start_tournament', {
      p_tournament_id: tournamentId,
    })
    if (error) throw error
  }

  async advanceTournament(matchId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_advance_tournament', {
      p_match_id: matchId,
    })
    if (error) throw error
  }
}

export const tournamentRepository = new SupabaseTournamentRepository()
