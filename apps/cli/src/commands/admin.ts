import { defineCommand } from 'citty'
import consola from 'consola'
import { callRpc, handleError } from '../utils/api'
import { printTable, printJson } from '../utils/output'
import { c } from '../utils/ansi'

// ---------------------------------------------------------------------------
// lf admin vote-anomalies
// ---------------------------------------------------------------------------

interface VoteAnomalyRow {
  id: string
  battle_id: string
  voter_lenser_id: string
  anomaly_type: string
  score: number
  detected_at: string
  resolved_at: string | null
}

const voteAnomalies = defineCommand({
  meta: {
    name: 'vote-anomalies',
    description: 'List vote manipulation anomalies.',
  },
  args: {
    battle: {
      type: 'string',
      description: 'Filter by battle UUID',
      default: '',
    },
    status: {
      type: 'string',
      description: 'pending | resolved | all  (default: pending)',
      default: 'pending',
    },
    json: {
      type: 'boolean',
      description: 'Output raw JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<VoteAnomalyRow[]>(
        'fn_admin_get_vote_anomalies',
        {
          p_status:    args.status || 'pending',
          p_battle_id: args.battle || null,
          p_limit:     100,
        },
        { requireAuth: true }
      )

      if (args.json) {
        printJson(rows)
        return
      }

      if (!rows.length) {
        consola.info('No anomalies found.')
        return
      }

      printTable(
        ['id', 'battle', 'voter', 'type', 'score', 'status', 'detected'],
        rows.map((r) => [
          r.id.slice(0, 8) + '…',
          r.battle_id.slice(0, 8) + '…',
          r.voter_lenser_id.slice(0, 8) + '…',
          r.anomaly_type,
          (r.score * 100).toFixed(0) + '%',
          r.resolved_at ? c.success('resolved') : c.warn('pending'),
          new Date(r.detected_at).toLocaleDateString(),
        ])
      )
      consola.info('%d anomaly/ies listed.', rows.length)
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
    name: 'admin',
    description: 'LenserFight platform administration commands.',
  },
  subCommands: {
    'vote-anomalies': voteAnomalies,
  },
})
