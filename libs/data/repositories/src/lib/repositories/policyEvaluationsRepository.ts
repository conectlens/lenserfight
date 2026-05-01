import { supabase } from '@lenserfight/data/supabase'
import type {
  PolicyEvaluationRecord,
  PolicyVerdict,
  PolicyVerdictResult,
} from '@lenserfight/types'

export interface ListPolicyLogOptions {
  verdict?: PolicyVerdict
  policy_type?: string
  evaluation_point?: string
  limit?: number
}

export interface PolicyEvaluationsRepository {
  listPolicyLog(
    aiLenserId: string,
    options?: ListPolicyLogOptions
  ): Promise<PolicyEvaluationRecord[]>
  evaluatePreRunPolicy(
    aiLenserId: string,
    workflowId: string | null,
    context?: Record<string, unknown>
  ): Promise<PolicyVerdictResult>
}

export class SupabasePolicyEvaluationsRepository
  implements PolicyEvaluationsRepository
{
  async listPolicyLog(
    aiLenserId: string,
    options: ListPolicyLogOptions = {}
  ): Promise<PolicyEvaluationRecord[]> {
    let query = supabase
      .schema('agents')
      .from('policy_evaluations')
      .select('*')
      .eq('ai_lenser_id', aiLenserId)
      .order('evaluated_at', { ascending: false })

    if (options.verdict) query = query.eq('verdict', options.verdict)
    if (options.policy_type) query = query.eq('policy_type', options.policy_type)
    if (options.evaluation_point)
      query = query.eq('evaluation_point', options.evaluation_point)
    if (options.limit && options.limit > 0) query = query.limit(options.limit)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as PolicyEvaluationRecord[]
  }

  async evaluatePreRunPolicy(
    aiLenserId: string,
    workflowId: string | null,
    context: Record<string, unknown> = {}
  ): Promise<PolicyVerdictResult> {
    const { data, error } = await supabase.rpc('fn_evaluate_pre_run_policy', {
      p_ai_lenser_id: aiLenserId,
      p_workflow_id: workflowId ?? null,
      p_context: context,
    })
    if (error) throw error
    const rows = data as Array<{ verdict: string; reason: string | null }>
    const row = rows?.[0] ?? { verdict: 'allow', reason: null }
    return {
      verdict: row.verdict as PolicyVerdict,
      reason: row.reason,
    }
  }
}
