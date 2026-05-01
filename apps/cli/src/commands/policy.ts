import { defineCommand } from 'citty'
import consola from 'consola'
import { callRest, handleError } from '../utils/api'
import { printJson, printTable, truncate } from '../utils/output'

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
// policy log
// ---------------------------------------------------------------------------
const policyLog = defineCommand({
  meta: {
    name: 'log',
    description: 'Show policy evaluation log for an agent.',
  },
  args: {
    handle: {
      type: 'positional',
      description: 'Agent handle (without @)',
      required: true,
    },
    limit: {
      type: 'string',
      description: 'Max rows to return (default 20)',
      default: '20',
    },
    verdict: {
      type: 'string',
      description: 'Filter by verdict: allow | deny | pause | require_approval',
      default: '',
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
      const query: Record<string, string | number | boolean> = {
        select: 'id,ai_lenser_id,policy_type,verdict,reason,workflow_id,evaluated_at',
        ai_lenser_id: `eq.${aiLenserId}`,
        order: 'evaluated_at.desc',
        limit: args.limit,
      }
      if (args.verdict) query['verdict'] = `eq.${args.verdict}`

      const rows = await callRest<Array<Record<string, unknown>>>(
        'agents',
        'policy_evaluations',
        'GET',
        undefined,
        { requireAuth: true, query }
      )

      if (!rows || rows.length === 0) {
        consola.info('No policy evaluations found for @%s.', args.handle)
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['Policy Type', 'Verdict', 'Reason', 'Evaluated At'],
        rows.map((r) => [
          String(r['policy_type'] ?? '—'),
          String(r['verdict'] ?? '—'),
          truncate(String(r['reason'] ?? '—'), 40),
          r['evaluated_at'] ? new Date(String(r['evaluated_at'])).toLocaleString() : '—',
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// policy stats
// ---------------------------------------------------------------------------

const PERIOD_MAP: Record<string, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

const policyStats = defineCommand({
  meta: {
    name: 'stats',
    description: 'Show policy evaluation counts grouped by verdict and policy type.',
  },
  args: {
    handle: {
      type: 'positional',
      description: 'Agent handle (without @)',
      required: true,
    },
    period: {
      type: 'string',
      description: 'Time window: 24h | 7d | 30d (default 24h)',
      default: '24h',
    },
  },
  async run({ args }) {
    const ms = PERIOD_MAP[args.period]
    if (!ms) {
      consola.error('--period must be one of: %s', Object.keys(PERIOD_MAP).join(', '))
      process.exitCode = 1
      return
    }
    try {
      const aiLenserId = await resolveAiLenserId(args.handle)
      const since = new Date(Date.now() - ms).toISOString()

      const rows = await callRest<Array<Record<string, unknown>>>(
        'agents',
        'policy_evaluations',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select: 'policy_type,verdict',
            ai_lenser_id: `eq.${aiLenserId}`,
            evaluated_at: `gte.${since}`,
          },
        }
      )

      if (!rows || rows.length === 0) {
        consola.info('No policy evaluations in the last %s for @%s.', args.period, args.handle)
        return
      }

      // Group client-side
      const counts = new Map<string, number>()
      for (const row of rows) {
        const key = `${row['policy_type'] ?? 'unknown'}|${row['verdict'] ?? 'unknown'}`
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }

      printTable(
        ['Policy Type', 'Verdict', 'Count'],
        Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([key, count]) => {
            const [policyType, verdict] = key.split('|')
            return [policyType, verdict, String(count)]
          })
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
    name: 'policy',
    description: 'Inspect agent policy evaluations.',
  },
  subCommands: {
    log: policyLog,
    stats: policyStats,
  },
})
