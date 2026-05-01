import type { AgentWorkspaceBootstrap, WorkflowScheduleRecord } from '@lenserfight/types'

export function filterSchedulesForAgentWorkspace(
  schedules: WorkflowScheduleRecord[],
  bootstrap: AgentWorkspaceBootstrap
): WorkflowScheduleRecord[] {
  const visibleTeamIds = new Set(bootstrap.teams.map((team) => team.id))
  const visibleAssignmentIds = new Set(
    bootstrap.workflow_assignments
      .filter(
        (assignment) =>
          assignment.assignee_ai_lenser_id === bootstrap.ai_lenser_id ||
          (assignment.assignee_team_id ? visibleTeamIds.has(assignment.assignee_team_id) : false)
      )
      .map((assignment) => assignment.id)
  )

  return schedules.filter((schedule) => {
    if (schedule.assignee_type === 'agent' && schedule.assignee_id === bootstrap.ai_lenser_id) {
      return true
    }

    if (
      schedule.assignee_type === 'team' &&
      schedule.assignee_id &&
      visibleTeamIds.has(schedule.assignee_id)
    ) {
      return true
    }

    if (
      schedule.workflow_assignment_id &&
      visibleAssignmentIds.has(schedule.workflow_assignment_id)
    ) {
      return true
    }

    return false
  })
}
