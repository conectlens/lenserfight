import { defineCommand } from 'citty'
import consola from 'consola'
import {
  clearAgentWorkspaceContext,
  getAgentWorkspaceContext,
  resolveAgentIdentifier,
  setAgentWorkspaceContext,
} from '../../lib/agent-workspace-context'
import { getActionLogs, killAgentWorkers } from '../../lib/data-services'
import { resolveAiLenserIdFromIdentifier } from '../../lib/lenser-catalog'
import { assertSafe } from '../../lib/safety'
import { callRpc, handleError } from '../../utils/api'
import { A, sym } from '../../utils/ansi'
import { printJson, printTable, truncate } from '../../utils/output'
import { printAgentWorkspaceOperations } from './workspace-ops'

async function resolveRequiredAgent(arg?: string): Promise<string> {
  const id = resolveAgentIdentifier(arg)
  if (!id) {
    throw new Error('No agent selected. Run `lf agents use <handle|uuid>` first or pass an id.')
  }
  return resolveAiLenserIdFromIdentifier(id)
}

async function loadSubCommand(
  mod: { subCommands?: Record<string, unknown> } | undefined,
  name: string,
): Promise<{ run?: (c: unknown) => Promise<void> } | undefined> {
  const sub = mod?.subCommands?.[name]
  const cmd = typeof sub === 'function' ? await (sub as () => Promise<unknown>)() : sub
  return cmd as { run?: (c: unknown) => Promise<void> } | undefined
}

async function runTeamSub(sub: string, args: Record<string, unknown>): Promise<void> {
  const teamMod = await import('../team')
  const cmd = await loadSubCommand(teamMod.default as { subCommands?: Record<string, unknown> }, sub)
  await cmd?.run?.({
    args,
    cmd: {},
    rawArgs: [],
  })
}

const use = defineCommand({
  meta: {
    name: 'use',
    description: 'Select an agent as your CLI workspace context (colors dashboard + default args).',
  },
  args: {
    agent: { type: 'positional', description: 'Agent handle or UUID', required: true },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveAiLenserIdFromIdentifier(args.agent)
      const profile = await callRpc<Record<string, unknown>>(
        'fn_get_agent_profile',
        { p_ai_lenser_id: aiLenserId },
        { requireAuth: true },
      )
      const handle = String(profile?.handle ?? args.agent).replace(/^@/, '')
      const displayName = String(profile?.display_name ?? handle)
      const ctx = setAgentWorkspaceContext({ aiLenserId, handle, displayName })

      if (args.json) {
        printJson(ctx)
        return
      }

      consola.success('Agent workspace active: %s%s%s', A.brightGreen, `@${handle}`, A.reset)
      consola.info('ID: %s', aiLenserId)
      consola.info('Subcommands without an explicit id will target this agent.')
      printAgentWorkspaceOperations(ctx)
    } catch (err) {
      handleError(err)
    }
  },
})

const clear = defineCommand({
  meta: { name: 'clear', description: 'Clear the active agent workspace selection.' },
  async run() {
    clearAgentWorkspaceContext()
    consola.info('Agent workspace cleared.')
  },
})

const context = defineCommand({
  meta: { name: 'context', description: 'Show the active agent workspace selection.' },
  args: { json: { type: 'boolean', default: false } },
  async run({ args }) {
    const ctx = getAgentWorkspaceContext()
    if (!ctx) {
      consola.info('No agent workspace selected. Run `lf agents use <handle>`.')
      return
    }
    if (args.json) {
      printJson(ctx)
      return
    }
    printTable(
      ['Field', 'Value'],
      [
        ['Handle', `@${ctx.handle}`],
        ['Display', ctx.displayName],
        ['AI Lenser ID', ctx.aiLenserId],
        ['Selected', ctx.selectedAt ? new Date(ctx.selectedAt).toLocaleString() : '—'],
      ],
    )
    printAgentWorkspaceOperations(ctx)
  },
})

const ops = defineCommand({
  meta: { name: 'ops', description: 'Show workspace operations for the selected agent.' },
  args: { json: { type: 'boolean', default: false } },
  async run({ args }) {
    const ctx = getAgentWorkspaceContext()
    if (!ctx) {
      consola.info('No agent workspace selected. Run `lf agents use <handle>`.')
      return
    }
    if (args.json) {
      const { AGENT_WORKSPACE_OPERATIONS } = await import('./workspace-ops')
      printJson({ context: ctx, operations: AGENT_WORKSPACE_OPERATIONS })
      return
    }
    printAgentWorkspaceOperations(ctx)
  },
})

const list = defineCommand({
  meta: { name: 'list', description: 'List your AI agents.' },
  async run(ctx) {
    const lenser = await import('../lenser')
    const aiCmd = await loadSubCommand(lenser.default as { subCommands?: Record<string, unknown> }, 'ai')
    const listCmd = await loadSubCommand(
      aiCmd as { subCommands?: Record<string, unknown> } | undefined,
      'list',
    )
    return listCmd?.run?.(ctx)
  },
})

const get = defineCommand({
  meta: {
    name: 'get',
    description: 'Get agent profile and workspace settings (uses workspace selection when id omitted).',
  },
  args: {
    id: { type: 'positional', description: 'Agent handle or UUID', required: false },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveRequiredAgent(args.id)
      const identifier = args.id ?? getAgentWorkspaceContext()?.handle ?? aiLenserId
      const lenser = await import('../lenser')
      const aiCmd = await loadSubCommand(lenser.default as { subCommands?: Record<string, unknown> }, 'ai')
      const viewCmd = await loadSubCommand(
        aiCmd as { subCommands?: Record<string, unknown> } | undefined,
        'view',
      )
      await viewCmd?.run?.({ args: { id: identifier, json: args.json }, cmd: {}, rawArgs: [] })
    } catch (err) {
      handleError(err)
    }
  },
})

const create = defineCommand({
  meta: { name: 'create', description: 'Connect / register a new AI agent.' },
  async run(ctx) {
    const lenser = await import('../lenser')
    const aiCmd = await loadSubCommand(lenser.default as { subCommands?: Record<string, unknown> }, 'ai')
    const connectCmd = await loadSubCommand(
      aiCmd as { subCommands?: Record<string, unknown> } | undefined,
      'connect',
    )
    return connectCmd?.run?.(ctx)
  },
})

const stop = defineCommand({
  meta: { name: 'stop', description: 'Pause an agent (block new runs).' },
  args: {
    id: { type: 'positional', description: 'Agent handle or UUID', required: false },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveRequiredAgent(args.id)
      const ctx = getAgentWorkspaceContext()
      const handle = args.id ?? ctx?.handle ?? aiLenserId
      await callRpc('fn_pause_agent', { p_ai_lenser_id: aiLenserId }, { requireAuth: true })
      consola.success('Agent %s paused.', handle.startsWith('@') ? handle : `@${handle}`)
    } catch (err) {
      handleError(err)
    }
  },
})

const resume = defineCommand({
  meta: { name: 'resume', description: 'Resume a paused agent.' },
  args: {
    id: { type: 'positional', description: 'Agent handle or UUID', required: false },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveRequiredAgent(args.id)
      const ctx = getAgentWorkspaceContext()
      const handle = args.id ?? ctx?.handle ?? aiLenserId
      await callRpc('fn_resume_agent', { p_ai_lenser_id: aiLenserId }, { requireAuth: true })
      consola.success('Agent %s resumed.', handle.startsWith('@') ? handle : `@${handle}`)
    } catch (err) {
      handleError(err)
    }
  },
})

const kill = defineCommand({
  meta: {
    name: 'kill',
    description:
      'Emergency: cancel all active team runs, enable kill switch, and pause the agent.',
  },
  args: {
    id: { type: 'positional', description: 'Agent handle or UUID', required: false },
    confirm: {
      type: 'boolean',
      description: 'Required: confirm emergency kill of all workers',
      default: false,
    },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveRequiredAgent(args.id)
      const ctx = getAgentWorkspaceContext()
      const handle = (args.id ?? ctx?.handle ?? aiLenserId).replace(/^@/, '')

      await assertSafe({
        risk: 'HIGH',
        reversibility: 'REVERSIBLE',
        confirmationPolicy: 'FLAG',
        forceFlag: '--confirm',
        hasForce: args.confirm,
        description: `Emergency kill for @${handle}: cancel queued/running/blocked team runs, activate kill switch, and pause the agent.`,
        affectedResources: [{ type: 'agent', name: `@${handle}`, scope: 'remote' }],
        rollbackAvailable: true,
        notes: [
          'Resume with: lf agents resume && lf kill-switch off @' + handle,
          'Does not delete schedules or the agent record.',
        ],
      })

      const result = await killAgentWorkers(aiLenserId)

      if (args.json) {
        printJson({ handle: `@${handle}`, aiLenserId, ...result })
        return
      }

      consola.warn(
        'Emergency kill completed for %s%s%s.',
        A.brightRed,
        `@${handle}`,
        A.reset,
      )
      consola.info('Cancelled team runs: %d', result.cancelledCount)
      if (result.cancelledRunIds.length > 0) {
        for (const id of result.cancelledRunIds) {
          consola.info('  %s', id)
        }
      }
      consola.info('Kill switch: ON')
      consola.info('Agent: paused')
      consola.info('Recover with: lf kill-switch off @%s && lf agents resume', handle)
    } catch (err) {
      handleError(err)
    }
  },
})

const del = defineCommand({
  meta: { name: 'delete', description: 'Delete an agent (lifecycle tombstone when referenced).' },
  args: {
    id: { type: 'positional', description: 'Agent handle or UUID', required: false },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveRequiredAgent(args.id)
      const lenser = await import('../lenser')
      const aiCmd = await loadSubCommand(lenser.default as { subCommands?: Record<string, unknown> }, 'ai')
      const cmd = await loadSubCommand(
        aiCmd as { subCommands?: Record<string, unknown> } | undefined,
        'delete',
      )
      await cmd?.run?.({ args: { id: aiLenserId, json: args.json }, cmd: {}, rawArgs: [] })
      const active = getAgentWorkspaceContext()
      if (active?.aiLenserId === aiLenserId) clearAgentWorkspaceContext()
    } catch (err) {
      handleError(err)
    }
  },
})

const logs = defineCommand({
  meta: { name: 'logs', description: 'Show recent action logs for the workspace agent.' },
  args: {
    id: { type: 'positional', description: 'Agent UUID', required: false },
    limit: { type: 'string', default: '25' },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveRequiredAgent(args.id)
      const limit = Math.min(Math.max(parseInt(args.limit, 10) || 25, 1), 100)
      const rows = await getActionLogs(aiLenserId, limit)
      if (rows.length === 0) {
        consola.info('No action logs for this agent.')
        return
      }
      if (args.json) {
        printJson(rows)
        return
      }
      printTable(
        ['When', 'Action', 'Result', 'Context'],
        rows.map((r) => [
          r.occurred_at ? new Date(r.occurred_at).toLocaleString() : '—',
          r.action_type,
          r.result,
          truncate(`${r.context_ref_type ?? ''}:${r.context_ref_id ?? ''}`, 28),
        ]),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

const runs = defineCommand({
  meta: { name: 'runs', description: 'List recent team runs for the workspace agent.' },
  args: {
    id: { type: 'positional', description: 'Agent handle or UUID', required: false },
    limit: { type: 'string', default: '20' },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveRequiredAgent(args.id)
      await runTeamSub('runs', {
        'ai-lenser': aiLenserId,
        limit: args.limit,
        json: args.json,
      })
    } catch (err) {
      handleError(err)
    }
  },
})

const inspect = defineCommand({
  meta: { name: 'inspect', description: 'Workspace bootstrap (teams, members, edges, runs).' },
  args: {
    handle: { type: 'positional', description: 'Agent handle', required: false },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const ctx = getAgentWorkspaceContext()
      const handle = (args.handle ?? ctx?.handle)?.replace(/^@/, '')
      if (!handle) {
        throw new Error('No agent selected. Run `lf agents use <handle>` or pass a handle.')
      }
      await runTeamSub('inspect', { handle, json: args.json })
    } catch (err) {
      handleError(err)
    }
  },
})

const dispatch = defineCommand({
  meta: { name: 'dispatch', description: 'Dispatch a workflow assignment as a team run.' },
  args: {
    assignment: { type: 'string', description: 'Workflow assignment UUID', required: true },
    'workflow-id': { type: 'string', description: 'Workflow UUID', required: true },
    id: { type: 'positional', description: 'Agent handle or UUID', required: false },
    'team-id': { type: 'string', default: '' },
    metadata: { type: 'string', default: '' },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveRequiredAgent(args.id)
      await runTeamSub('dispatch', {
        assignment: args.assignment,
        'workflow-id': args['workflow-id'],
        'ai-lenser': aiLenserId,
        'team-id': args['team-id'],
        metadata: args.metadata,
      })
    } catch (err) {
      handleError(err)
    }
  },
})

const schedule = defineCommand({
  meta: { name: 'schedule', description: 'List workflow schedules (optionally filter by workflow).' },
  args: {
    workflow: { type: 'string', default: '' },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const scheduleMod = await import('../schedule')
      const listCmd = await loadSubCommand(scheduleMod.default as { subCommands?: Record<string, unknown> }, 'list')
      await listCmd?.run?.({
        args: { workflow: args.workflow, json: args.json },
        cmd: {},
        rawArgs: [],
      })
    } catch (err) {
      handleError(err)
    }
  },
})

const team = defineCommand({
  meta: { name: 'team', description: 'Manage teams for the workspace agent.' },
  subCommands: {
    list: defineCommand({
      meta: { name: 'list', description: 'List teams for the workspace agent.' },
      args: { json: { type: 'boolean', default: false } },
      async run({ args }) {
        try {
          const aiLenserId = await resolveRequiredAgent()
          await runTeamSub('list', { 'ai-lenser': aiLenserId, json: args.json })
        } catch (err) {
          handleError(err)
        }
      },
    }),
    inspect: defineCommand({
      meta: { name: 'inspect', description: 'Workspace bootstrap for the selected agent.' },
      args: { json: { type: 'boolean', default: false } },
      async run({ args }) {
        try {
          const ctx = getAgentWorkspaceContext()
          if (!ctx?.handle) throw new Error('No agent workspace selected.')
          await runTeamSub('inspect', { handle: ctx.handle, json: args.json })
        } catch (err) {
          handleError(err)
        }
      },
    }),
    members: defineCommand({
      meta: { name: 'members', description: 'List members of a team.' },
      args: {
        team: { type: 'string', description: 'Team UUID', required: true },
        json: { type: 'boolean', default: false },
      },
      async run({ args }) {
        try {
          await runTeamSub('members', { team: args.team, json: args.json })
        } catch (err) {
          handleError(err)
        }
      },
    }),
    dispatch: defineCommand({
      meta: { name: 'dispatch', description: 'Dispatch a workflow assignment.' },
      args: {
        assignment: { type: 'string', required: true },
        'workflow-id': { type: 'string', required: true },
        'team-id': { type: 'string', default: '' },
        metadata: { type: 'string', default: '' },
      },
      async run({ args }) {
        try {
          const aiLenserId = await resolveRequiredAgent()
          await runTeamSub('dispatch', {
            assignment: args.assignment,
            'workflow-id': args['workflow-id'],
            'ai-lenser': aiLenserId,
            'team-id': args['team-id'],
            metadata: args.metadata,
          })
        } catch (err) {
          handleError(err)
        }
      },
    }),
    runs: defineCommand({
      meta: { name: 'runs', description: 'List team runs for the workspace agent.' },
      args: {
        limit: { type: 'string', default: '20' },
        json: { type: 'boolean', default: false },
      },
      async run({ args }) {
        try {
          const aiLenserId = await resolveRequiredAgent()
          await runTeamSub('runs', {
            'ai-lenser': aiLenserId,
            limit: args.limit,
            json: args.json,
          })
        } catch (err) {
          handleError(err)
        }
      },
    }),
    conversation: defineCommand({
      meta: { name: 'conversation', description: 'Show team run conversation.' },
      args: {
        'run-id': { type: 'positional', description: 'Team run UUID', required: true },
        limit: { type: 'string', default: '100' },
        json: { type: 'boolean', default: false },
      },
      async run({ args }) {
        try {
          await runTeamSub('conversation', {
            'run-id': args['run-id'],
            limit: args.limit,
            json: args.json,
          })
        } catch (err) {
          handleError(err)
        }
      },
    }),
    assign: defineCommand({
      meta: { name: 'assign', description: 'Assign a workflow to a team or agent.' },
      args: {
        workflow: { type: 'string', required: true },
        'assignee-kind': { type: 'string', default: 'team' },
        'assignee-id': { type: 'string', required: true },
        'approval-policy': { type: 'string', default: '' },
        json: { type: 'boolean', default: false },
      },
      async run({ args }) {
        try {
          const aiLenserId = await resolveRequiredAgent()
          await runTeamSub('assign', {
            'ai-lenser': aiLenserId,
            workflow: args.workflow,
            'assignee-kind': args['assignee-kind'],
            'assignee-id': args['assignee-id'],
            'approval-policy': args['approval-policy'],
          })
        } catch (err) {
          handleError(err)
        }
      },
    }),
  },
})

export default defineCommand({
  meta: {
    name: 'agents',
    description:
      'Agent workspace: select, execute, schedule, memory, team, pause, kill, logs, and approvals.',
  },
  subCommands: {
    use,
    clear,
    context,
    ops,
    list,
    get,
    create,
    stop,
    resume,
    kill,
    delete: del,
    logs,
    runs,
    inspect,
    dispatch,
    schedule,
    team,
    memory: (() => {
      const memoryProfiles = defineCommand({
        meta: { name: 'profiles', description: 'List memory profiles (default).' },
        args: { json: { type: 'boolean', default: false } },
        async run({ args }) {
          try {
            const aiLenserId = await resolveRequiredAgent()
            const memory = await import('../memory')
            const cmd = await loadSubCommand(
              memory.default as { subCommands?: Record<string, unknown> },
              'list-profiles',
            )
            await cmd?.run?.({
              args: { agent: aiLenserId, json: args.json },
              cmd: {},
              rawArgs: [],
            })
          } catch (err) {
            handleError(err)
          }
        },
      })

      const memoryList = defineCommand({
        meta: { name: 'list', description: 'List memory entries.' },
        args: { json: { type: 'boolean', default: false } },
        async run({ args }) {
          try {
            const aiLenserId = await resolveRequiredAgent()
            const memory = await import('../memory')
            const cmd = await loadSubCommand(
              memory.default as { subCommands?: Record<string, unknown> },
              'list-entries',
            )
            await cmd?.run?.({
              args: { agent: aiLenserId, json: args.json },
              cmd: {},
              rawArgs: [],
            })
          } catch (err) {
            handleError(err)
          }
        },
      })

      const memorySearch = defineCommand({
        meta: { name: 'search', description: 'Search agent memory.' },
        args: {
          query: { type: 'positional', description: 'Search query', required: true },
          profile: { type: 'string', default: '' },
          limit: { type: 'string', default: '20' },
          json: { type: 'boolean', default: false },
        },
        async run({ args }) {
          try {
            const memory = await import('../memory')
            const cmd = await loadSubCommand(
              memory.default as { subCommands?: Record<string, unknown> },
              'search',
            )
            await cmd?.run?.({
              args: {
                query: args.query,
                profile: args.profile,
                limit: args.limit,
                json: args.json,
              },
              cmd: {},
              rawArgs: [],
            })
          } catch (err) {
            handleError(err)
          }
        },
      })

      return defineCommand({
        meta: { name: 'memory', description: 'Memory profiles and entries for the workspace agent.' },
        subCommands: {
          profiles: memoryProfiles,
          list: memoryList,
          search: memorySearch,
        },
        async run(ctx) {
          return memoryProfiles.run(ctx)
        },
      })
    })(),
    approvals: defineCommand({
      meta: { name: 'approvals', description: 'List pending approvals for the workspace agent.' },
      args: { json: { type: 'boolean', default: false } },
      async run({ args }) {
        try {
          const aiLenserId = await resolveRequiredAgent()
          const approval = await import('../approval')
          const cmd = await loadSubCommand(
            approval.default as { subCommands?: Record<string, unknown> },
            'list',
          )
          await cmd?.run?.({
            args: { 'ai-lenser': aiLenserId, json: args.json },
            cmd: {},
            rawArgs: [],
          })
        } catch (err) {
          handleError(err)
        }
      },
    }),
  },
})

export function formatAgentWorkspaceBanner(): string | null {
  const ctx = getAgentWorkspaceContext()
  if (!ctx) return null
  return (
    `${A.bgGreen}${A.black}${A.bold} ${sym.fight} AGENT WORKSPACE ${A.reset}  ` +
    `${A.brightGreen}${A.bold}@${ctx.handle}${A.reset}  ` +
    `${A.dim}${ctx.displayName}${A.reset}  ` +
    `${A.gray}${ctx.aiLenserId.slice(0, 8)}…${A.reset}`
  )
}

export { AGENT_WORKSPACE_OPERATIONS, printAgentWorkspaceOperations } from './workspace-ops'
