import { defineCommand } from 'citty'
import consola from 'consola'
import { callRest, callRpc, handleError } from '../utils/api'
import { printJson, printTable, truncate } from '../utils/output'

// ─── Shared helpers ────────────────────────────────────────────────────────

interface AgentTeamRow {
  id: string
  ai_lenser_id: string
  name: string
  description: string | null
  status: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AgentTeamMemberRow {
  id: string
  team_id: string
  agent_id: string
  role: string
  responsibility: string
  lane: number
  sort_order: number
  is_active: boolean
  personality_profile_id: string | null
  memory_profile_id: string | null
  tool_profile_id: string | null
  model_profile_id: string | null
}

interface AgentTeamEdgeRow {
  id: string
  team_id: string
  source_member_id: string
  target_member_id: string
  edge_type: string
  is_blocking: boolean
}

interface AgentTeamRunRow {
  id: string
  ai_lenser_id: string
  team_id: string | null
  workflow_id: string | null
  workflow_run_id: string | null
  status: string
  approval_status: string
  started_at: string | null
  completed_at: string | null
  created_at: string
}

function parseJsonArg(value: string | undefined, label: string): Record<string, unknown> | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
      throw new Error(`${label} must be a JSON object`)
    }
    return parsed as Record<string, unknown>
  } catch (err) {
    throw new Error(
      `Invalid JSON for --${label}: ${(err as Error).message}`
    )
  }
}

// ─── team list ─────────────────────────────────────────────────────────────

const teamList = defineCommand({
  meta: {
    name: 'list',
    description: 'List teams owned by an AI workspace.',
  },
  args: {
    'ai-lenser': {
      type: 'string',
      description: 'AI Lenser UUID (agents.ai_lensers.id)',
      required: true,
    },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRest<AgentTeamRow[]>(
        'agents',
        'teams',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select: 'id,ai_lenser_id,name,description,status,is_active,created_at,updated_at',
            ai_lenser_id: `eq.${args['ai-lenser']}`,
            order: 'updated_at.desc',
          },
        }
      )

      if (!rows || rows.length === 0) {
        consola.info('No teams found for AI lenser %s.', args['ai-lenser'])
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['ID', 'Name', 'Status', 'Active', 'Updated'],
        rows.map((t) => [
          t.id.slice(0, 8) + '…',
          truncate(t.name, 30),
          t.status,
          t.is_active ? 'yes' : 'no',
          new Date(t.updated_at).toLocaleString(),
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── team create ───────────────────────────────────────────────────────────

const teamCreate = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new team for an AI workspace.',
  },
  args: {
    'ai-lenser': {
      type: 'string',
      description: 'AI Lenser UUID',
      required: true,
    },
    name: { type: 'string', description: 'Team name', required: true },
    description: { type: 'string', description: 'Team description', default: '' },
  },
  async run({ args }) {
    try {
      const rows = await callRest<AgentTeamRow[]>(
        'agents',
        'teams',
        'POST',
        {
          ai_lenser_id: args['ai-lenser'],
          name: args.name,
          description: args.description || null,
        },
        { requireAuth: true, prefer: 'return=representation' }
      )

      const team = Array.isArray(rows) ? rows[0] : (rows as unknown as AgentTeamRow)
      consola.success('Team created.')
      consola.info('Team ID: %s', team.id)
      consola.info('Name:    %s', team.name)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── team members ──────────────────────────────────────────────────────────

const teamMembers = defineCommand({
  meta: {
    name: 'members',
    description: 'List members of a team.',
  },
  args: {
    team: { type: 'string', description: 'Team UUID', required: true },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRest<AgentTeamMemberRow[]>(
        'agents',
        'team_members',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select:
              'id,team_id,agent_id,role,responsibility,lane,sort_order,is_active,personality_profile_id,memory_profile_id,tool_profile_id,model_profile_id',
            team_id: `eq.${args.team}`,
            order: 'lane.asc,sort_order.asc',
          },
        }
      )

      if (!rows || rows.length === 0) {
        consola.info('No members found for team %s.', args.team)
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['Member', 'Agent', 'Role', 'Lane', 'Active'],
        rows.map((m) => [
          m.id.slice(0, 8) + '…',
          m.agent_id.slice(0, 8) + '…',
          truncate(m.role, 18),
          String(m.lane),
          m.is_active ? 'yes' : 'no',
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── team add-member ───────────────────────────────────────────────────────

const teamAddMember = defineCommand({
  meta: {
    name: 'add-member',
    description: 'Add an agent to a team.',
  },
  args: {
    team: { type: 'string', description: 'Team UUID', required: true },
    agent: {
      type: 'string',
      description: 'Agent (AI Lenser) UUID',
      required: true,
    },
    role: { type: 'string', description: 'Member role', default: 'operator' },
    responsibility: { type: 'string', description: 'Responsibility text', default: '' },
    lane: { type: 'string', description: 'Parallel lane index', default: '0' },
    'sort-order': { type: 'string', description: 'Sort order within lane', default: '0' },
    'personality-profile': { type: 'string', description: 'Personality profile UUID', default: '' },
    'memory-profile': { type: 'string', description: 'Memory profile UUID', default: '' },
    'tool-profile': { type: 'string', description: 'Tool profile UUID', default: '' },
    'model-profile': { type: 'string', description: 'Model profile UUID', default: '' },
  },
  async run({ args }) {
    try {
      const rows = await callRest<AgentTeamMemberRow[]>(
        'agents',
        'team_members',
        'POST',
        {
          team_id: args.team,
          agent_id: args.agent,
          role: args.role,
          responsibility: args.responsibility,
          lane: Number(args.lane),
          sort_order: Number(args['sort-order']),
          personality_profile_id: args['personality-profile'] || null,
          memory_profile_id: args['memory-profile'] || null,
          tool_profile_id: args['tool-profile'] || null,
          model_profile_id: args['model-profile'] || null,
        },
        { requireAuth: true, prefer: 'return=representation' }
      )

      const member = Array.isArray(rows) ? rows[0] : (rows as unknown as AgentTeamMemberRow)
      consola.success('Member added to team %s.', args.team)
      consola.info('Member ID: %s', member.id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── team remove-member ────────────────────────────────────────────────────

const teamRemoveMember = defineCommand({
  meta: {
    name: 'remove-member',
    description: 'Remove a member from a team.',
  },
  args: {
    member: {
      type: 'string',
      description: 'Team Member UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRest(
        'agents',
        'team_members',
        'DELETE',
        undefined,
        {
          requireAuth: true,
          query: { id: `eq.${args.member}` },
        }
      )
      consola.success('Member %s removed.', args.member)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── team edges ────────────────────────────────────────────────────────────

const teamEdges = defineCommand({
  meta: {
    name: 'edges',
    description: 'List edges of a team graph.',
  },
  args: {
    team: { type: 'string', description: 'Team UUID', required: true },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRest<AgentTeamEdgeRow[]>(
        'agents',
        'team_edges',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select: 'id,team_id,source_member_id,target_member_id,edge_type,is_blocking',
            team_id: `eq.${args.team}`,
            order: 'created_at.asc',
          },
        }
      )

      if (!rows || rows.length === 0) {
        consola.info('No edges found for team %s.', args.team)
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['Edge', 'Source', 'Target', 'Type', 'Blocking'],
        rows.map((e) => [
          e.id.slice(0, 8) + '…',
          e.source_member_id.slice(0, 8) + '…',
          e.target_member_id.slice(0, 8) + '…',
          e.edge_type,
          e.is_blocking ? 'yes' : 'no',
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── team add-edge ─────────────────────────────────────────────────────────

const VALID_EDGE_TYPES = new Set([
  'delegates',
  'reviews',
  'reports_to',
  'shares_context',
  'handoff',
])

const teamAddEdge = defineCommand({
  meta: {
    name: 'add-edge',
    description: 'Add a typed edge between two team members.',
  },
  args: {
    team: { type: 'string', description: 'Team UUID', required: true },
    source: {
      type: 'string',
      description: 'Source team member UUID',
      required: true,
    },
    target: {
      type: 'string',
      description: 'Target team member UUID',
      required: true,
    },
    type: {
      type: 'string',
      description: 'Edge type: delegates | reviews | reports_to | shares_context | handoff',
      default: 'delegates',
    },
    blocking: {
      type: 'boolean',
      description: 'Mark edge as blocking (source waits on target)',
      default: false,
    },
  },
  async run({ args }) {
    if (!VALID_EDGE_TYPES.has(args.type)) {
      consola.error(
        'Invalid edge type "%s". Allowed: %s',
        args.type,
        Array.from(VALID_EDGE_TYPES).join(', ')
      )
      process.exitCode = 1
      return
    }
    try {
      const rows = await callRest<AgentTeamEdgeRow[]>(
        'agents',
        'team_edges',
        'POST',
        {
          team_id: args.team,
          source_member_id: args.source,
          target_member_id: args.target,
          edge_type: args.type,
          is_blocking: args.blocking,
        },
        { requireAuth: true, prefer: 'return=representation' }
      )
      const edge = Array.isArray(rows) ? rows[0] : (rows as unknown as AgentTeamEdgeRow)
      consola.success('Edge added.')
      consola.info('Edge ID: %s', edge.id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── team assign ───────────────────────────────────────────────────────────

const VALID_ASSIGNEE_KINDS = new Set(['agent', 'team'])

const teamAssign = defineCommand({
  meta: {
    name: 'assign',
    description: 'Bind a workflow to a team or agent (workflow_assignment).',
  },
  args: {
    'ai-lenser': {
      type: 'string',
      description: 'AI Lenser UUID that owns the assignment',
      required: true,
    },
    workflow: {
      type: 'string',
      description: 'Workflow UUID',
      required: true,
    },
    'assignee-kind': {
      type: 'string',
      description: 'agent | team',
      default: 'team',
    },
    'assignee-id': {
      type: 'string',
      description: 'Agent or team UUID',
      required: true,
    },
    'approval-policy': {
      type: 'string',
      description: 'JSON object',
      default: '',
    },
    'retry-policy': { type: 'string', description: 'JSON object', default: '' },
    'failure-policy': { type: 'string', description: 'JSON object', default: '' },
    'queue-policy': { type: 'string', description: 'JSON object', default: '' },
  },
  async run({ args }) {
    if (!VALID_ASSIGNEE_KINDS.has(args['assignee-kind'])) {
      consola.error(
        'Invalid assignee kind "%s". Allowed: agent, team',
        args['assignee-kind']
      )
      process.exitCode = 1
      return
    }
    try {
      const body: Record<string, unknown> = {
        ai_lenser_id: args['ai-lenser'],
        workflow_id: args.workflow,
        assignee_kind: args['assignee-kind'],
        assignee_ai_lenser_id:
          args['assignee-kind'] === 'agent' ? args['assignee-id'] : null,
        assignee_team_id:
          args['assignee-kind'] === 'team' ? args['assignee-id'] : null,
      }
      const approval = parseJsonArg(args['approval-policy'], 'approval-policy')
      const retry = parseJsonArg(args['retry-policy'], 'retry-policy')
      const failure = parseJsonArg(args['failure-policy'], 'failure-policy')
      const queue = parseJsonArg(args['queue-policy'], 'queue-policy')
      if (approval) body.approval_policy = approval
      if (retry) body.retry_policy = retry
      if (failure) body.failure_policy = failure
      if (queue) body.queue_policy = queue

      const rows = await callRest<Array<{ id: string }>>(
        'agents',
        'workflow_assignments',
        'POST',
        body,
        { requireAuth: true, prefer: 'return=representation' }
      )
      const assignment = Array.isArray(rows) ? rows[0] : rows
      consola.success('Workflow assigned.')
      consola.info('Assignment ID: %s', assignment.id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── team dispatch ─────────────────────────────────────────────────────────
//
// Manual dispatch outside CRON. Inserts a `team_runs` row tied to an
// existing assignment; the engine claims the underlying workflow run via the
// usual dispatch path. The `approval_status` defaults to 'pending' when the
// assignment's `approval_policy.requiresApproval` is true; the engine will
// resume once the owner decides.

const teamDispatch = defineCommand({
  meta: {
    name: 'dispatch',
    description: 'Manually dispatch a workflow assignment as a team run.',
  },
  args: {
    assignment: {
      type: 'string',
      description: 'Workflow assignment UUID',
      required: true,
    },
    'ai-lenser': {
      type: 'string',
      description: 'AI Lenser UUID',
      required: true,
    },
    'team-id': {
      type: 'string',
      description: 'Team UUID (when assignment targets a team)',
      default: '',
    },
    'workflow-id': {
      type: 'string',
      description: 'Workflow UUID (must match assignment)',
      required: true,
    },
    metadata: {
      type: 'string',
      description: 'JSON object passed as team_runs.metadata (e.g. inputs, gate context)',
      default: '',
    },
  },
  async run({ args }) {
    try {
      const metadata = parseJsonArg(args.metadata, 'metadata') ?? {}
      const body: Record<string, unknown> = {
        ai_lenser_id: args['ai-lenser'],
        team_id: args['team-id'] || null,
        workflow_id: args['workflow-id'],
        workflow_assignment_id: args.assignment,
        status: 'queued',
        metadata,
      }
      const rows = await callRest<Array<{ id: string; approval_status: string }>>(
        'agents',
        'team_runs',
        'POST',
        body,
        { requireAuth: true, prefer: 'return=representation' }
      )
      const run = Array.isArray(rows) ? rows[0] : rows
      consola.success('Team run queued.')
      consola.info('Team Run ID:     %s', run.id)
      consola.info('Approval status: %s', run.approval_status)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── team runs ─────────────────────────────────────────────────────────────

const teamRuns = defineCommand({
  meta: {
    name: 'runs',
    description: 'List recent team runs for an AI workspace.',
  },
  args: {
    'ai-lenser': {
      type: 'string',
      description: 'AI Lenser UUID',
      required: true,
    },
    limit: { type: 'string', description: 'Max rows (default 20)', default: '20' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRest<AgentTeamRunRow[]>(
        'agents',
        'team_runs',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select:
              'id,ai_lenser_id,team_id,workflow_id,workflow_run_id,status,approval_status,started_at,completed_at,created_at',
            ai_lenser_id: `eq.${args['ai-lenser']}`,
            order: 'created_at.desc',
            limit: args.limit,
          },
        }
      )

      if (!rows || rows.length === 0) {
        consola.info('No team runs found.')
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['Run', 'Workflow', 'Status', 'Approval', 'Created'],
        rows.map((r) => [
          r.id.slice(0, 8) + '…',
          r.workflow_id ? r.workflow_id.slice(0, 8) + '…' : '—',
          r.status,
          r.approval_status,
          new Date(r.created_at).toLocaleString(),
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── team inspect ──────────────────────────────────────────────────────────
//
// Workspace bootstrap — uses the existing `fn_get_agent_workspace_bootstrap`
// RPC for a single round-trip team-board view (teams, members, edges, runs,
// profiles, assignments).

const teamInspect = defineCommand({
  meta: {
    name: 'inspect',
    description: 'Fetch the agent workspace bootstrap for a profile handle.',
  },
  args: {
    handle: {
      type: 'positional',
      description: 'AI lenser handle',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const payload = await callRpc(
        'fn_get_agent_workspace_bootstrap',
        { p_profile_handle: args.handle },
        { requireAuth: true }
      )
      printJson(payload)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── parent ────────────────────────────────────────────────────────────────

export default defineCommand({
  meta: {
    name: 'team',
    description: 'Manage agent teams (ConnectedLenses team domain).',
  },
  subCommands: {
    list: teamList,
    create: teamCreate,
    inspect: teamInspect,
    members: teamMembers,
    'add-member': teamAddMember,
    'remove-member': teamRemoveMember,
    edges: teamEdges,
    'add-edge': teamAddEdge,
    assign: teamAssign,
    dispatch: teamDispatch,
    runs: teamRuns,
  },
})
