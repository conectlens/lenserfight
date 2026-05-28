import { describe, expect, it } from 'vitest'

import { filterSchedulesForAgentWorkspace } from './filterSchedulesForAgentWorkspace'

import type { AgentWorkspaceBootstrap, WorkflowScheduleRecord } from '@lenserfight/types'

const bootstrap = {
  profile_id: 'profile-1',
  ai_lenser_id: 'ai-1',
  teams: [
    {
      id: 'team-1',
      ai_lenser_id: 'ai-1',
      name: 'Research team',
      description: null,
      status: 'active',
      scratchpad: {},
      is_active: true,
      member_count: 1,
      members: [],
      edges: [],
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
    },
  ],
  runs: [],
  profiles: {
    personality: [],
    memory: [],
    tools: [],
    models: [],
  },
  workflow_assignments: [
    {
      id: 'assignment-agent',
      ai_lenser_id: 'ai-1',
      workflow_id: 'workflow-1',
      assignee_kind: 'agent',
      assignee_ai_lenser_id: 'ai-1',
      assignee_team_id: null,
      approval_policy: {},
      retry_policy: {},
      failure_policy: {},
      queue_policy: {},
      output_destination: {},
      is_active: true,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
    },
    {
      id: 'assignment-team',
      ai_lenser_id: 'ai-1',
      workflow_id: 'workflow-2',
      assignee_kind: 'team',
      assignee_ai_lenser_id: null,
      assignee_team_id: 'team-1',
      approval_policy: {},
      retry_policy: {},
      failure_policy: {},
      queue_policy: {},
      output_destination: {},
      is_active: true,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
    },
  ],
} satisfies AgentWorkspaceBootstrap

function makeSchedule(overrides: Partial<WorkflowScheduleRecord>): WorkflowScheduleRecord {
  return {
    id: 'schedule-1',
    workflow_id: 'workflow-1',
    workflow_title: 'Nightly research',
    cron_expr: '0 * * * *',
    timezone: 'UTC',
    global_model_id: null,
    inputs_template: {},
    is_active: true,
    assignee_type: 'agent',
    assignee_id: 'ai-1',
    workflow_assignment_id: null,
    approval_policy: {},
    retry_policy: {},
    failure_policy: {},
    queue_policy: {},
    next_run_at: null,
    last_run_at: null,
    last_run_id: null,
    last_dispatch_status: null,
    last_error_at: null,
    last_error_message: null,
    last_completed_at: null,
    last_result: {},
    created_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('filterSchedulesForAgentWorkspace', () => {
  it('keeps only schedules assigned to the active agent, its teams, or its workflow assignments', () => {
    const schedules = [
      makeSchedule({ id: 'schedule-agent', assignee_type: 'agent', assignee_id: 'ai-1' }),
      makeSchedule({ id: 'schedule-team', assignee_type: 'team', assignee_id: 'team-1' }),
      makeSchedule({
        id: 'schedule-assignment',
        assignee_type: 'team',
        assignee_id: null,
        workflow_assignment_id: 'assignment-team',
      }),
      makeSchedule({ id: 'schedule-foreign-agent', assignee_type: 'agent', assignee_id: 'ai-2' }),
      makeSchedule({ id: 'schedule-foreign-team', assignee_type: 'team', assignee_id: 'team-2' }),
    ]

    expect(
      filterSchedulesForAgentWorkspace(schedules, bootstrap).map((schedule) => schedule.id)
    ).toEqual(['schedule-agent', 'schedule-team', 'schedule-assignment'])
  })
})
