import { defineCommand } from 'citty'
import consola from 'consola'
import { callRpc, callRest, handleError } from '../utils/api'
import { printJson, printTable } from '../utils/output'

// ---------------------------------------------------------------------------
// Result type for fn_get_agent_analytics_summary
// ---------------------------------------------------------------------------
interface AgentAnalyticsSummaryResult {
  cost_by_model: { model_key: string; provider: string; total_credits: number; total_tokens_in: number; total_tokens_out: number; run_count: number }[]
  cost_time_series: { period_date: string; total_credits: number }[]
  eval_quality: { period_date: string; evaluation_name: string; pass_rate: number | null; mean_score: number | null }[]
  workflow_perf: { period_date: string; workflow_title: string; p50_duration_ms: number | null; p95_duration_ms: number | null; failure_rate: number | null }[]
}

// ---------------------------------------------------------------------------
// Shared: resolve ai_lenser_id from a handle string
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
// analytics summary
// ---------------------------------------------------------------------------
const summary = defineCommand({
  meta: {
    name: 'summary',
    description: 'Show cost, quality, and workflow performance summary for an agent.',
  },
  args: {
    handle: {
      type: 'positional',
      description: 'Agent handle (without @)',
      required: true,
    },
    days: {
      type: 'string',
      description: 'Lookback window in days (7|14|30|90)',
      default: '30',
    },
    json: {
      type: 'boolean',
      description: 'Output raw JSON',
      default: false,
    },
  },
  async run({ args }) {
    const days = Number.parseInt(args.days, 10)
    if (!Number.isFinite(days) || days <= 0) {
      consola.error('Invalid --days "%s" — must be a positive integer.', args.days)
      process.exitCode = 1
      return
    }

    try {
      const aiLenserId = await resolveAiLenserId(args.handle)
      const result = await callRpc<AgentAnalyticsSummaryResult>(
        'fn_get_agent_analytics_summary',
        {
          p_ai_lenser_id: aiLenserId,
          p_days: days,
          p_model_key: null,
          p_workflow_id: null,
        },
        { requireAuth: true }
      )

      if (args.json) {
        printJson(result)
        return
      }

      consola.info('Cost by model')
      printTable(
        ['model_key', 'provider', 'total_credits', 'run_count'],
        (result.cost_by_model ?? []).map((r) => [
          r.model_key,
          r.provider,
          String(r.total_credits),
          String(r.run_count),
        ])
      )

      consola.info('Quality metrics')
      printTable(
        ['period_date', 'evaluation_name', 'pass_rate', 'mean_score'],
        (result.eval_quality ?? []).map((r) => [
          r.period_date,
          r.evaluation_name,
          r.pass_rate != null ? String(r.pass_rate) : '—',
          r.mean_score != null ? String(r.mean_score) : '—',
        ])
      )

      consola.info('Workflow performance')
      printTable(
        ['period_date', 'workflow_title', 'p50_duration_ms', 'p95_duration_ms', 'failure_rate'],
        (result.workflow_perf ?? []).map((r) => [
          r.period_date,
          r.workflow_title,
          r.p50_duration_ms != null ? String(r.p50_duration_ms) : '—',
          r.p95_duration_ms != null ? String(r.p95_duration_ms) : '—',
          r.failure_rate != null ? String(r.failure_rate) : '—',
        ])
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
    name: 'analytics',
    description: 'Agent analytics: cost, quality and performance.',
  },
  subCommands: {
    summary,
  },
})
