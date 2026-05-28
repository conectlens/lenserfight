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
// dark-launch enable
// ---------------------------------------------------------------------------
const dlEnable = defineCommand({
  meta: {
    name: 'enable',
    description: 'Enable dark launch for an agent with a given traffic percentage.',
  },
  args: {
    handle: {
      type: 'positional',
      description: 'Agent handle (without @)',
      required: true,
    },
    pct: {
      type: 'string',
      description: 'Traffic percentage to dark-launch (0-100)',
      required: true,
    },
  },
  async run({ args }) {
    const pct = parseInt(args.pct, 10)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      consola.error('--pct must be a number between 0 and 100.')
      process.exitCode = 1
      return
    }
    try {
      const aiLenserId = await resolveAiLenserId(args.handle)
      await callRpc(
        'fn_update_workspace_settings',
        {
          p_ai_lenser_id: aiLenserId,
          p_settings: { dark_launch_enabled: true, dark_launch_pct: pct },
        },
        { requireAuth: true }
      )
      consola.success('Dark launch enabled for @%s at %d%%.', args.handle, pct)
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// dark-launch disable
// ---------------------------------------------------------------------------
const dlDisable = defineCommand({
  meta: {
    name: 'disable',
    description: 'Disable dark launch for an agent.',
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
        'fn_update_workspace_settings',
        {
          p_ai_lenser_id: aiLenserId,
          p_settings: { dark_launch_enabled: false, dark_launch_pct: 0 },
        },
        { requireAuth: true }
      )
      consola.success('Dark launch disabled for @%s.', args.handle)
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// dark-launch status
// ---------------------------------------------------------------------------
const dlStatus = defineCommand({
  meta: {
    name: 'status',
    description: 'Show dark launch settings for an agent.',
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
            select: 'dark_launch_enabled,dark_launch_pct',
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
          ['dark_launch_enabled', String(settings['dark_launch_enabled'] ?? false)],
          ['dark_launch_pct', String(settings['dark_launch_pct'] ?? 0) + '%'],
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
    name: 'dark-launch',
    description: 'Manage dark launch settings for an agent.',
  },
  subCommands: {
    enable: dlEnable,
    disable: dlDisable,
    status: dlStatus,
  },
})
