import { callRest, callRpc } from '../../utils/api'

export type AgentTeamRunRow = {
  id: string
  ai_lenser_id: string
  team_id: string | null
  workflow_id: string | null
  status: string
  approval_status: string
  created_at: string
}

const ACTIVE_RUN_STATUSES = 'in.(queued,running,blocked)'

/** Active team runs for an agent (queued, running, or blocked). */
export async function listActiveTeamRuns(aiLenserId: string): Promise<AgentTeamRunRow[]> {
  const rows = await callRest<AgentTeamRunRow[]>(
    'agents',
    'team_runs',
    'GET',
    undefined,
    {
      requireAuth: true,
      query: {
        select: 'id,ai_lenser_id,team_id,workflow_id,status,approval_status,created_at',
        ai_lenser_id: `eq.${aiLenserId}`,
        status: ACTIVE_RUN_STATUSES,
        order: 'created_at.desc',
        limit: '200',
      },
    },
  )
  return rows ?? []
}

export async function cancelAgentTeamRun(teamRunId: string, aiLenserId: string): Promise<void> {
  await callRpc(
    'fn_cancel_agent_run',
    { p_team_run_id: teamRunId, p_ai_lenser_id: aiLenserId },
    { requireAuth: true },
  )
}

export type KillAgentWorkersResult = {
  killSwitchEnabled: boolean
  agentPaused: boolean
  cancelledRunIds: string[]
  cancelledCount: number
}

/**
 * Emergency stop: cancel active team runs, enable kill switch, pause agent.
 * Does not delete the agent or schedules — use `agents stop` / kill-switch off to recover.
 */
export async function killAgentWorkers(aiLenserId: string): Promise<KillAgentWorkersResult> {
  const active = await listActiveTeamRuns(aiLenserId)
  const cancelledRunIds: string[] = []

  for (const run of active) {
    await cancelAgentTeamRun(run.id, aiLenserId)
    cancelledRunIds.push(run.id)
  }

  await callRpc(
    'fn_toggle_kill_switch',
    { p_ai_lenser_id: aiLenserId, p_enabled: true },
    { requireAuth: true },
  )
  await callRpc('fn_pause_agent', { p_ai_lenser_id: aiLenserId }, { requireAuth: true })

  return {
    killSwitchEnabled: true,
    agentPaused: true,
    cancelledRunIds,
    cancelledCount: cancelledRunIds.length,
  }
}
