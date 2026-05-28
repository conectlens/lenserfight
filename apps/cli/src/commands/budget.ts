import { defineCommand } from 'citty'
import consola from 'consola'
import { callRpc, callRest, handleError } from '../utils/api'
import { printJson, printTable } from '../utils/output'

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
// budget set
// ---------------------------------------------------------------------------
const budgetSet = defineCommand({
  meta: {
    name: 'set',
    description: 'Set daily credit budget for an agent.',
  },
  args: {
    handle: {
      type: 'positional',
      description: 'Agent handle (without @)',
      required: true,
    },
    'daily-credits': {
      type: 'string',
      description: 'Max daily credits',
      required: true,
    },
    enforce: {
      type: 'string',
      description: 'Enforce budget cap (true | false, default true)',
      default: 'true',
    },
  },
  async run({ args }) {
    const dailyCredits = parseInt(args['daily-credits'], 10)
    if (isNaN(dailyCredits) || dailyCredits < 0) {
      consola.error('--daily-credits must be a non-negative integer.')
      process.exitCode = 1
      return
    }
    const budgetEnforce = args.enforce !== 'false'
    try {
      const aiLenserId = await resolveAiLenserId(args.handle)
      await callRpc(
        'fn_update_workspace_settings',
        {
          p_ai_lenser_id: aiLenserId,
          p_settings: {
            max_daily_credits: dailyCredits,
            budget_enforce: budgetEnforce,
          },
        },
        { requireAuth: true }
      )
      consola.success(
        'Budget set for @%s: %d credits/day, enforce=%s.',
        args.handle,
        dailyCredits,
        budgetEnforce
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// budget status
// ---------------------------------------------------------------------------
const budgetStatus = defineCommand({
  meta: {
    name: 'status',
    description: "Show budget settings and today's spending for an agent.",
  },
  args: {
    handle: {
      type: 'positional',
      description: 'Agent handle (without @)',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveAiLenserId(args.handle)

      const settingsRows = await callRest<Array<Record<string, unknown>>>(
        'agents',
        'workspace_settings',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select: 'max_daily_credits,budget_enforce',
            ai_lenser_id: `eq.${aiLenserId}`,
          },
        }
      )
      const settings = settingsRows?.[0] ?? {}

      // Get today's credits_spent from quota_snapshots (most recent row for today)
      const today = new Date().toISOString().slice(0, 10)
      const quotaRows = await callRest<Array<Record<string, unknown>>>(
        'agents',
        'quota_snapshots',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select: 'credits_spent,snapshot_date',
            ai_lenser_id: `eq.${aiLenserId}`,
            snapshot_date: `eq.${today}`,
            order: 'snapshot_date.desc',
            limit: '1',
          },
        }
      )
      const quota = quotaRows?.[0] ?? {}

      if (args.json) {
        printJson({ ...settings, credits_spent_today: quota['credits_spent'] ?? 0 })
        return
      }

      printTable(
        ['Setting', 'Value'],
        [
          ['max_daily_credits', String(settings['max_daily_credits'] ?? '(unset)')],
          ['budget_enforce', String(settings['budget_enforce'] ?? false)],
          ['credits_spent_today', String(quota['credits_spent'] ?? 0)],
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
    name: 'budget',
    description: 'Manage agent daily credit budget.',
  },
  subCommands: {
    set: budgetSet,
    status: budgetStatus,
  },
})
