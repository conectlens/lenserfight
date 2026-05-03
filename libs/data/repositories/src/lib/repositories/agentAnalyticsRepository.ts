import type { AgentAnalyticsSummary } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

export interface AgentAnalyticsRepository {
  getAgentAnalyticsSummary(
    aiLenserId: string,
    options?: { days?: number; modelKey?: string; workflowId?: string }
  ): Promise<AgentAnalyticsSummary>
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
}
