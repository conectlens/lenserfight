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
    const { data, error } = await supabase.rpc('fn_list_policy_evaluations', {
      p_ai_lenser_id: aiLenserId,
      p_limit: options.limit && options.limit > 0 ? options.limit : 100,
      p_cursor: null,
    })
    if (error) throw error
    let rows = (data ?? []) as PolicyEvaluationRecord[]
    if (options.verdict) rows = rows.filter((r) => r.verdict === options.verdict)
    if (options.policy_type) rows = rows.filter((r) => r.policy_type === options.policy_type)
    return rows
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
