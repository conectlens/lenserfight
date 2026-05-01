import { supabase } from '@lenserfight/data/supabase'
import type { RunUnifiedRow, UpdateWorkspaceSettingsPatch } from '@lenserfight/types'

export interface ListRunUnifiedOptions {
  status?: string
  run_type?: 'team' | 'workflow'
  limit?: number
}

export interface WorkspaceControlsRepository {
  cancelRun(teamRunId: string): Promise<void>
  pauseAgent(aiLenserId: string): Promise<void>
  resumeAgent(aiLenserId: string): Promise<void>
  toggleKillSwitch(aiLenserId: string, enabled: boolean): Promise<void>
  updateWorkspaceSettings(
    aiLenserId: string,
    patch: UpdateWorkspaceSettingsPatch
  ): Promise<void>
  listRunUnified(
    aiLenserId: string,
    options?: ListRunUnifiedOptions
  ): Promise<RunUnifiedRow[]>
}

export class SupabaseWorkspaceControlsRepository
  implements WorkspaceControlsRepository
{
  async cancelRun(teamRunId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_cancel_run', {
      p_team_run_id: teamRunId,
    })
    if (error) throw error
  }

  async pauseAgent(aiLenserId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_pause_agent', {
      p_ai_lenser_id: aiLenserId,
    })
    if (error) throw error
  }

  async resumeAgent(aiLenserId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_resume_agent', {
      p_ai_lenser_id: aiLenserId,
    })
    if (error) throw error
  }

  async toggleKillSwitch(aiLenserId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase.rpc('fn_toggle_kill_switch', {
      p_ai_lenser_id: aiLenserId,
      p_enabled: enabled,
    })
    if (error) throw error
  }

  async updateWorkspaceSettings(
    aiLenserId: string,
    patch: UpdateWorkspaceSettingsPatch
  ): Promise<void> {
    const { error } = await supabase.rpc('fn_update_workspace_settings', {
      p_ai_lenser_id: aiLenserId,
      p_patch: patch,
    })
    if (error) throw error
  }

  async listRunUnified(
    aiLenserId: string,
    options: ListRunUnifiedOptions = {}
  ): Promise<RunUnifiedRow[]> {
    let query = supabase
      .schema('agents')
      .from('v_run_unified')
      .select('*')
      .eq('ai_lenser_id', aiLenserId)
      .order('started_at', { ascending: false, nullsFirst: false })

    if (options.status) query = query.eq('status', options.status)
    if (options.run_type) query = query.eq('run_type', options.run_type)
    if (options.limit && options.limit > 0) query = query.limit(options.limit)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as RunUnifiedRow[]
  }
}
