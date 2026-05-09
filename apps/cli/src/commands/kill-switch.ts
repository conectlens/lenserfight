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
            select: 'global_kill_switch,runner_paused,agent_paused',
            ai_lenser_id: `eq.${aiLenserId}`,
          },
        }
      )
      const settings = rows?.[0]
      if (!settings) {
        consola.info('No workspace settings found for @%s.', args.handle)
        return
      }
      const runnerPaused = settings['runner_paused'] ?? settings['agent_paused'] ?? false
      printTable(
        ['Setting', 'Value'],
        [
          ['global_kill_switch', String(settings['global_kill_switch'] ?? false)],
          ['runner_paused', String(runnerPaused)],
        ]
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// platform kill-switch — admin-scoped system/battle/agent/run emergency stops
// ---------------------------------------------------------------------------

const platformOn = defineCommand({
  meta: {
    name: 'on',
    description: 'Activate a platform-wide kill switch (admin only).',
  },
  args: {
    scope: {
      type: 'string',
      description: 'Scope: system | battle | agent | run',
      required: true,
    },
    target: {
      type: 'string',
      description: 'Target UUID (omit for system-wide)',
      default: '',
    },
    reason: {
      type: 'string',
      description: 'Reason for activation (required)',
      required: true,
    },
    'expires-at': {
      type: 'string',
      description: 'ISO 8601 expiry (omit = permanent until lifted)',
      default: '',
    },
    confirm: {
      type: 'boolean',
      description: 'Required: confirm activation',
      default: false,
    },
  },
  async run({ args }) {
    if (!args.confirm) {
      consola.error('--confirm is required to activate a platform kill switch.')
      process.exitCode = 1
      return
    }
    try {
      const id = await callRpc<string>(
        'fn_kill_switch_activate',
        {
          p_scope:      args.scope,
          p_target_id:  args.target || null,
          p_reason:     args.reason,
          p_expires_at: args['expires-at'] || null,
        },
        { requireAuth: true }
      )
      consola.warn('Platform kill switch ACTIVATED. ID: %s', id)
      if (args.scope === 'system') {
        consola.warn('All autonomous operations are now halted.')
      }
    } catch (err) {
      handleError(err)
    }
  },
})

const platformOff = defineCommand({
  meta: {
    name: 'off',
    description: 'Lift a platform kill switch by ID (admin only).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Kill switch UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_kill_switch_lift', { p_switch_id: args.id }, { requireAuth: true })
      consola.success('Kill switch %s lifted. Autonomous operations resume.', args.id)
    } catch (err) {
      handleError(err)
    }
  },
})

const platformList = defineCommand({
  meta: {
    name: 'list',
    description: 'List all platform kill switches (admin only).',
  },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<Array<Record<string, unknown>>>(
        'fn_kill_switch_list',
        {},
        { requireAuth: true }
      )
      if (!rows || rows.length === 0) {
        consola.info('No kill switches recorded.')
        return
      }
      if (args.json) {
        printTable(['', ''], []) // type guard
        console.log(JSON.stringify(rows, null, 2))
        return
      }
      printTable(
        ['ID', 'Scope', 'Target', 'Status', 'Reason', 'Operator'],
        rows.map((r) => [
          String(r['id'] ?? '').slice(0, 8) + '…',
          String(r['scope'] ?? ''),
          r['target_id'] ? String(r['target_id']).slice(0, 8) + '…' : 'ALL',
          r['lifted_at'] ? 'lifted' : (r['expires_at'] && new Date(r['expires_at'] as string) < new Date() ? 'expired' : 'ACTIVE'),
          String(r['reason'] ?? '').slice(0, 40),
          String(r['operator_handle'] ?? '—'),
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

const platform = defineCommand({
  meta: {
    name: 'platform',
    description: 'Manage platform-wide emergency kill switches (admin only).',
  },
  subCommands: {
    on:   platformOn,
    off:  platformOff,
    list: platformList,
  },
})

// ---------------------------------------------------------------------------
// Root command
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'kill-switch',
    description: 'Manage kill switches: per-agent (on/off/status) and platform-wide (platform on/off/list).',
  },
  subCommands: {
    on: ksOn,
    off: ksOff,
    status: ksStatus,
    platform,
  },
})
