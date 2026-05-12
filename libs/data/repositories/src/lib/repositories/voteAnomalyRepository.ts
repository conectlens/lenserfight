import { supabase } from '@lenserfight/data/supabase'

export interface VoteAnomalyRecord {
  id: string
  battle_id: string
  voter_lenser_id: string
  anomaly_type: string
  score: number
  detected_at: string
  resolved_at: string | null
  resolved_by: string | null
}

export type VoteAnomalyStatusFilter = 'pending' | 'resolved' | 'all'

export interface VoteAnomalyRepositoryPort {
  getVoteAnomalies(
    status: VoteAnomalyStatusFilter,
    battleId?: string | null
  ): Promise<VoteAnomalyRecord[]>
  resolveVoteAnomaly(anomalyId: string): Promise<void>
}

export class SupabaseVoteAnomalyRepository implements VoteAnomalyRepositoryPort {
  async getVoteAnomalies(
    status: VoteAnomalyStatusFilter,
    battleId?: string | null
  ): Promise<VoteAnomalyRecord[]> {
    let query = supabase
      .from('vote_anomalies')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(100)

    if (status === 'pending') {
      query = query.is('resolved_at', null)
    } else if (status === 'resolved') {
      query = query.not('resolved_at', 'is', null)
    }

    if (battleId) {
      query = query.eq('battle_id', battleId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as VoteAnomalyRecord[]
  }

  async resolveVoteAnomaly(anomalyId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_resolve_vote_anomaly', {
      p_anomaly_id: anomalyId,
    })
    if (error) throw error
  }
}

export const voteAnomalyRepository = new SupabaseVoteAnomalyRepository()
