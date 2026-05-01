import { defineCommand } from 'citty'
import consola from 'consola'
import { callRpc, callRest, handleError } from '../utils/api'
import { printTable } from '../utils/output'

// ---------------------------------------------------------------------------
// Shared: resolve ai_lenser_id from a @handle string
// ---------------------------------------------------------------------------
async function resolveAiLenserId(handle: string): Promise<string> {
  const rows = await callRest<Array<{ id: string }>>(
    'lensers',
    'profiles',
    'GET',
    undefined,
    {
      requireAuth: true,
      query: { select: 'id', handle: `eq.${handle}` },
    }
  )
  const profile = rows?.[0]
  if (!profile) throw new Error(`No profile found for handle @${handle}`)

  const agents = await callRest<Array<{ id: string }>>(
    'agents',
    'ai_lensers',
    'GET',
    undefined,
    {
      requireAuth: true,
      query: { select: 'id', profile_id: `eq.${profile.id}` },
    }
  )
  const agent = agents?.[0]
  if (!agent) throw new Error(`No AI agent found for @${handle}`)
  return agent.id
}

// ---------------------------------------------------------------------------
// kill-switch on
// ---------------------------------------------------------------------------
const ksOn = defineCommand({
  meta: {
    name: 'on',
    description: 'Activate the global kill switch for an agent.',
  },
  args: {
    handle: {
      type: 'positional',
      description: 'Agent handle (without @)',
      required: true,
    },
    confirm: {
      type: 'boolean',
      description: 'Required: confirm kill switch activation',
      default: false,
    },
  },
  async run({ args }) {
    if (!args.confirm) {
      consola.error('--confirm is required to activate the kill switch.')
      process.exitCode = 1
      return
    }
    try {
      const aiLenserId = await resolveAiLenserId(args.handle)
      await callRpc(
        'fn_toggle_kill_switch',
        { p_ai_lenser_id: aiLenserId, p_enabled: true },
        { requireAuth: true }
      )
      consola.warn('Kill switch ACTIVATED for @%s. All new runs are blocked.', args.handle)
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// kill-switch off
// ---------------------------------------------------------------------------
const ksOff = defineCommand({
  meta: {
    name: 'off',
    description: 'Deactivate the global kill switch for an agent.',
  },
  args: {
    handle: {
      type: 'positional',
      description: 'Agent handle (without @)',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveAiLenserId(args.handle)
      await callRpc(
        'fn_toggle_kill_switch',
        { p_ai_lenser_id: aiLenserId, p_enabled: false },
        { requireAuth: true }
      )
      consola.success('Kill switch deactivated for @%s.', args.handle)
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// kill-switch status
// ---------------------------------------------------------------------------
const ksStatus = defineCommand({
  meta: {
    name: 'status',
    description: 'Show kill switch and pause state for an agent.',
  },
  args: {
    handle: {
      type: 'positional',
      description: 'Agent handle (without @)',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveAiLenserId(args.handle)
      const rows = await callRest<Array<Record<string, unknown>>>(
        'agents',
        'workspace_settings',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select: 'global_kill_switch,agent_paused',
            ai_lenser_id: `eq.${aiLenserId}`,
          },
        }
      )
      const settings = rows?.[0]
      if (!settings) {
        consola.info('No workspace settings found for @%s.', args.handle)
        return
      }
      printTable(
        ['Setting', 'Value'],
        [
          ['global_kill_switch', String(settings['global_kill_switch'] ?? false)],
          ['agent_paused', String(settings['agent_paused'] ?? false)],
        ]
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// Root command
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'kill-switch',
    description: 'Manage the global kill switch for an agent.',
  },
  subCommands: {
    on: ksOn,
    off: ksOff,
    status: ksStatus,
  },
})
