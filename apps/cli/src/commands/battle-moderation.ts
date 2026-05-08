import { defineCommand } from 'citty'
import consola from 'consola'
import { callRpc, handleError } from '../utils/api'
import { printJson, printTable, truncate } from '../utils/output'

// Mirrors the row shape returned by public.fn_get_moderation_decisions_for_owner.
// The CLI only renders display fields — keep the type narrow.
interface ModerationDecisionRow {
  decision_id: string
  occurred_at: string
  target_entity_id: string
  decision_type: string
  reason: string | null
  is_ai_moderated: boolean
  battle_id: string | null
  battle_title: string | null
  battle_slug: string | null
  ai_confidence: number | null
}

const VALID_LIST_STATUSES = new Set([
  'flagged',
  'approved',
  'rejected',
  'removed',
  'restored',
  'warned',
])

const VALID_OVERRIDE_DECISIONS = new Set([
  'approved',
  'rejected',
  'removed',
  'restored',
])

// ─── battle-moderation list ────────────────────────────────────────────────

const moderationList = defineCommand({
  meta: {
    name: 'list',
    description: 'List moderation decisions for battles owned by the active workspace.',
  },
  args: {
    status: {
      type: 'string',
      description:
        'Filter by decision_type (flagged | approved | rejected | removed | restored | warned).',
      default: '',
    },
    limit: {
      type: 'string',
      description: 'Max rows to return (default 50).',
      default: '50',
    },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    if (args.status && !VALID_LIST_STATUSES.has(args.status)) {
      consola.error(
        'Invalid --status "%s". Allowed: %s',
        args.status,
        Array.from(VALID_LIST_STATUSES).join(', ')
      )
      process.exitCode = 1
      return
    }

    const limit = Number.parseInt(args.limit, 10)
    if (!Number.isFinite(limit) || limit <= 0) {
      consola.error('Invalid --limit "%s" — must be a positive integer.', args.limit)
      process.exitCode = 1
      return
    }

    try {
      const rows = await callRpc<ModerationDecisionRow[]>(
        'fn_get_moderation_decisions_for_owner',
        {
          p_status: args.status || null,
          p_limit: limit,
        },
        { requireAuth: true }
      )

      if (!rows || rows.length === 0) {
        consola.info('No moderation decisions found.')
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['Decision ID', 'Battle', 'Type', 'AI?', 'Confidence', 'Occurred At'],
        rows.map((r) => [
          r.decision_id.slice(0, 8) + '…',
          truncate(r.battle_title || r.battle_id || '—', 28),
          r.decision_type,
          r.is_ai_moderated ? 'yes' : 'no',
          r.ai_confidence !== null && r.ai_confidence !== undefined
            ? Number(r.ai_confidence).toFixed(2)
            : '—',
          new Date(r.occurred_at).toLocaleString(),
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── battle-moderation override ────────────────────────────────────────────

const moderationOverride = defineCommand({
  meta: {
    name: 'override',
    description: 'Override a prior moderation decision (e.g. restore an AI-removed battle).',
  },
  args: {
    'decision-id': {
      type: 'positional',
      description: 'Moderation decision UUID to override',
      required: true,
    },
    decision: {
      type: 'string',
      description:
        'New decision type: approved | rejected | removed | restored',
      required: true,
    },
    reason: {
      type: 'string',
      description: 'Reason for the override (audit trail)',
      required: true,
    },
  },
  async run({ args }) {
    if (!VALID_OVERRIDE_DECISIONS.has(args.decision)) {
      consola.error(
        'Invalid --decision "%s". Allowed: %s',
        args.decision,
        Array.from(VALID_OVERRIDE_DECISIONS).join(', ')
      )
      process.exitCode = 1
      return
    }

    try {
      await callRpc(
        'fn_decide_moderation_override',
        {
          p_decision_id: args['decision-id'],
          p_override_decision_type: args.decision,
          p_reason: args.reason,
        },
        { requireAuth: true }
      )
      consola.success(
        'Moderation decision %s overridden to %s.',
        args['decision-id'],
        args.decision
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── parent ────────────────────────────────────────────────────────────────

export default defineCommand({
  meta: {
    name: 'battle-moderation',
    description: 'Inspect and override moderation decisions on owned battles.',
  },
  subCommands: {
    list: moderationList,
    override: moderationOverride,
  },
})
