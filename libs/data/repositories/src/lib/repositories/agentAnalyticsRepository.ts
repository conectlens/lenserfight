import type { AgentAnalyticsSummary } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

export interface CreatorTimeseriesRow {
  day: string
  battles: number
  wins: number
  votes_received: number
  xp_earned: number
}

export interface HeadToHeadResult {
  total_battles: number
  a_wins: number
  b_wins: number
  draws: number
}

export interface AgentAnalyticsRepository {
  getAgentAnalyticsSummary(
    aiLenserId: string,
    options?: { days?: number; modelKey?: string; workflowId?: string }
  ): Promise<AgentAnalyticsSummary>
  getCreatorTimeseries(lenserId: string, days?: number): Promise<CreatorTimeseriesRow[]>
  getHeadToHead(lenserA: string, lenserB: string): Promise<HeadToHeadResult>
}

export class SupabaseAgentAnalyticsRepository implements AgentAnalyticsRepository {
  async getAgentAnalyticsSummary(
    aiLenserId: string,
    options: { days?: number; modelKey?: string; workflowId?: string } = {}
  ): Promise<AgentAnalyticsSummary> {
    const { data, error } = await supabase.rpc('fn_get_agent_analytics_summary', {
      p_ai_lenser_id: aiLenserId,
      p_days: options.days ?? 30,
      p_model_key: options.modelKey ?? null,
      p_workflow_id: options.workflowId ?? null,
    })
    if (error) throw error
    return data as AgentAnalyticsSummary
  }

  async getCreatorTimeseries(lenserId: string, days = 30): Promise<CreatorTimeseriesRow[]> {
    const { data, error } = await supabase.rpc('fn_get_creator_timeseries', {
      p_lenser_id: lenserId,
      p_days: days,
    })
    if (error) throw error
    return (data ?? []) as CreatorTimeseriesRow[]
  }

  async getHeadToHead(lenserA: string, lenserB: string): Promise<HeadToHeadResult> {
    const { data, error } = await supabase.rpc('fn_get_head_to_head', {
      p_lenser_a: lenserA,
      p_lenser_b: lenserB,
    })
    if (error) throw error
    // fn_get_head_to_head is declared RETURNS TABLE, so Supabase always wraps the result in an
    // array. The Array.isArray branch handles any future RPC signature change to RETURNS RECORD.
    const row = (Array.isArray(data) ? data[0] : data) as HeadToHeadResult | null
    return row ?? { total_battles: 0, a_wins: 0, b_wins: 0, draws: 0 }
  }
}
