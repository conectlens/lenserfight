import { supabase } from '@lenserfight/data/supabase'
import type {
  CompleteToolInvocationInput,
  InvokeToolInput,
  ListToolInvocationsOptions,
  ToolInvocationRecord,
} from '@lenserfight/types'

export interface ToolsRepository {
  listInvocations(options?: ListToolInvocationsOptions): Promise<ToolInvocationRecord[]>
  listPendingApprovals(aiLenserId: string): Promise<ToolInvocationRecord[]>
  invokeTool(input: InvokeToolInput): Promise<string>
  completeInvocation(input: CompleteToolInvocationInput): Promise<void>
  approveInvocation(invocationId: string): Promise<void>
  rejectInvocation(invocationId: string, reason?: string): Promise<void>
}

export class SupabaseToolsRepository implements ToolsRepository {
  async listInvocations(
    options: ListToolInvocationsOptions = {}
  ): Promise<ToolInvocationRecord[]> {
    let query = supabase
      .schema('agents')
      .from('tool_invocations_v')
      .select('*')
      .order('created_at', { ascending: false })

    if (options.ai_lenser_id) query = query.eq('ai_lenser_id', options.ai_lenser_id)
    if (options.team_run_id) query = query.eq('team_run_id', options.team_run_id)
    if (options.status) query = query.eq('status', options.status)
    if (options.approval_status)
      query = query.eq('approval_status', options.approval_status)
    if (options.limit && options.limit > 0) query = query.limit(options.limit)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as ToolInvocationRecord[]
  }

  listPendingApprovals(aiLenserId: string): Promise<ToolInvocationRecord[]> {
    return this.listInvocations({
      ai_lenser_id: aiLenserId,
      approval_status: 'pending',
      limit: 100,
    })
  }

  async invokeTool(input: InvokeToolInput): Promise<string> {
    const { data, error } = await supabase.rpc('fn_invoke_tool', {
      p_team_run_id: input.team_run_id,
      p_tool_id: input.tool_id,
      p_ai_lenser_id: input.ai_lenser_id,
      p_input: input.input ?? {},
      p_agent_run_step_id: input.agent_run_step_id ?? null,
    })
    if (error) throw error
    return data as string
  }

  async completeInvocation(input: CompleteToolInvocationInput): Promise<void> {
    const { error } = await supabase.rpc('fn_complete_tool_invocation', {
      p_invocation_id: input.invocation_id,
      p_status: input.status,
      p_output: input.output ?? null,
      p_error: input.error ?? null,
      p_cost: input.cost_estimate ?? null,
    })
    if (error) throw error
  }

  async approveInvocation(invocationId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_approve_tool_invocation', {
      p_invocation_id: invocationId,
    })
    if (error) throw error
  }

  async rejectInvocation(invocationId: string, reason?: string): Promise<void> {
    const { error } = await supabase.rpc('fn_reject_tool_invocation', {
      p_invocation_id: invocationId,
      p_reason: reason ?? null,
    })
    if (error) throw error
  }
}
