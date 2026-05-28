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
  recordToolDecision(logId: string, decision: 'approved' | 'rejected', reason?: string): Promise<void>
}

export class SupabaseToolsRepository implements ToolsRepository {
  async listInvocations(
    options: ListToolInvocationsOptions = {}
  ): Promise<ToolInvocationRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_agent_tools', {
      p_ai_lenser_id: options.ai_lenser_id ?? '',
      p_limit: options.limit && options.limit > 0 ? options.limit : 100,
      p_cursor: null,
    })
    if (error) throw error
    let rows = (data ?? []) as ToolInvocationRecord[]
    if (options.team_run_id) rows = rows.filter((r) => (r as unknown as Record<string, unknown>)['team_run_id'] === options.team_run_id)
    if (options.status) rows = rows.filter((r) => (r as unknown as Record<string, unknown>)['status'] === options.status)
    if (options.approval_status) rows = rows.filter((r) => (r as unknown as Record<string, unknown>)['approval_status'] === options.approval_status)
    return rows
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

  // approveInvocation / rejectInvocation call fn_approve_tool_invocation and
  // fn_reject_tool_invocation respectively — these operate on a tool_invocations row by id.
  // recordToolDecision calls fn_decide_tool_invocation which operates on an approval_logs row
  // by log id. The two RPC families are NOT redundant: approveInvocation targets invocation-level
  // state while recordToolDecision records an auditable human decision against a log entry.
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

  async recordToolDecision(
    logId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ): Promise<void> {
    const { error } = await supabase.rpc('fn_decide_tool_invocation', {
      p_log_id: logId,
      p_decision: decision,
      p_reason: reason ?? null,
    })
    if (error) throw error
  }
}
