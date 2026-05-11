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
    const { data, error } = await supabase.rpc('fn_get_workspace_controls', {
      p_ai_lenser_id: aiLenserId,
    })
    if (error) throw error
    let rows = (data ?? []) as RunUnifiedRow[]
    if (options.status) rows = rows.filter((r) => (r as unknown as Record<string, unknown>)['status'] === options.status)
    if (options.run_type) rows = rows.filter((r) => (r as unknown as Record<string, unknown>)['run_type'] === options.run_type)
    if (options.limit && options.limit > 0) rows = rows.slice(0, options.limit)
    return rows
  }
}
