import { callRpc } from '../../utils/api'

export interface JourneyState {
  lens_created: boolean
  workflow_created: boolean
  agent_created: boolean
  team_created: boolean
  battle_created: boolean
  battle_joined: boolean
  invite_sent: boolean
  battle_result_shared: boolean
  profile_published: boolean
}

export interface JourneyStep {
  id: keyof JourneyState
  label: string
  required: boolean
  command: string
  webPath: string
  dependsOn?: keyof JourneyState
}

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    id: 'lens_created',
    label: 'Create a Lens',
    required: true,
    command: 'lf lens create',
    webPath: '/lenses/new',
  },
  {
    id: 'workflow_created',
    label: 'Create a Workflow',
    required: true,
    command: 'lf workflow create --template single-agent',
    webPath: '/workflows/new',
  },
  {
    id: 'agent_created',
    label: 'Create a Lenser',
    required: true,
    command: 'lf lenser connect',
    webPath: '/lensers/new',
    dependsOn: 'lens_created',
  },
  {
    id: 'battle_created',
    label: 'Create or Join a Battle',
    required: true,
    command: 'lf battle create',
    webPath: '/arena',
  },
  {
    id: 'team_created',
    label: 'Create an Agent Team',
    required: false,
    command: 'lf team create',
    webPath: '/teams/new',
    dependsOn: 'agent_created',
  },
  {
    id: 'invite_sent',
    label: 'Invite to a Battle',
    required: false,
    command: 'lf invite create --battle <id> --type public',
    webPath: '/arena',
    dependsOn: 'battle_created',
  },
  {
    id: 'battle_result_shared',
    label: 'Share a Battle Result',
    required: false,
    command: 'lf publish --battle <id>',
    webPath: '/arena',
    dependsOn: 'battle_created',
  },
  {
    id: 'profile_published',
    label: 'Complete Your Profile',
    required: false,
    command: 'lf profile update',
    webPath: '/settings/profile',
  },
]

export const EMPTY_JOURNEY: JourneyState = {
  lens_created: false,
  workflow_created: false,
  agent_created: false,
  team_created: false,
  battle_created: false,
  battle_joined: false,
  invite_sent: false,
  battle_result_shared: false,
  profile_published: false,
}

export async function fetchJourneyState(): Promise<JourneyState | null> {
  try {
    return await callRpc<JourneyState>('fn_journey_state_get', {}, { requireAuth: true })
  } catch {
    return null
  }
}

export async function markJourneyStep(
  step: keyof JourneyState,
  done: boolean,
): Promise<void> {
  try {
    await callRpc(
      'fn_journey_state_mark',
      { p_step: step, p_done: done },
      { requireAuth: true },
    )
  } catch {
    // non-fatal — journey tracking is best-effort
  }
}

export function countCompleted(state: JourneyState): { done: number; total: number } {
  const steps = JOURNEY_STEPS
  const done = steps.filter((s) => state[s.id]).length
  return { done, total: steps.length }
}

export function nextRequiredStep(state: JourneyState): JourneyStep | null {
  return JOURNEY_STEPS.find((s) => s.required && !state[s.id]) ?? null
}
