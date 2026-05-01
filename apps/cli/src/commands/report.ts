import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, callRest, handleError } from '../utils/api';
import { printTable } from '../utils/output';

const VALID_TYPES = ['thread', 'lens'] as const;
const VALID_REASONS = [
  'spam',
  'harassment',
  'misinformation',
  'off_topic',
  'other',
] as const;

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
// report content (legacy flat usage: lenserfight report --type --id --reason)
// ---------------------------------------------------------------------------
const content = defineCommand({
  meta: {
    name: 'content',
    description: 'Report a piece of content for moderation review.',
  },
  args: {
    type: {
      type: 'string',
      required: true,
      description: 'Content type: thread | lens',
    },
    id: {
      type: 'string',
      required: true,
      description: 'UUID of the content to report',
    },
    reason: {
      type: 'string',
      required: true,
      description: 'Reason: spam | harassment | misinformation | off_topic | other',
    },
  },
  async run({ args }) {
    if (!(VALID_TYPES as readonly string[]).includes(args.type)) {
      consola.error(
        'Invalid type: %s. Must be one of: %s',
        args.type,
        VALID_TYPES.join(', ')
      );
      process.exitCode = 1;
      return;
    }

    if (!(VALID_REASONS as readonly string[]).includes(args.reason)) {
      consola.error(
        'Invalid reason: %s. Must be one of: %s',
        args.reason,
        VALID_REASONS.join(', ')
      );
      process.exitCode = 1;
      return;
    }

    try {
      const result = await callRpc<{ reported: boolean }>(
        'fn_content_report',
        {
          p_target_type: args.type,
          p_target_id: args.id,
          p_reason: args.reason,
        },
        { requireAuth: true }
      );

      if (result?.reported) {
        consola.success('Content reported successfully.');
      } else {
        consola.info('You have already reported this content.');
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// report list <agent-handle>
// ---------------------------------------------------------------------------
const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List run reports for an agent.',
  },
  args: {
    handle: {
      type: 'positional',
      description: 'Agent handle (without @)',
      required: true,
    },
    limit: {
      type: 'string',
      description: 'Max rows (default 20)',
      default: '20',
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
      const rows = await callRest<Array<Record<string, unknown>>>(
        'agents',
        'run_reports',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select: 'id,title,outcome,total_steps,total_cost_estimate,evaluation_score,created_at',
            ai_lenser_id: `eq.${aiLenserId}`,
            order: 'created_at.desc',
            limit: args.limit,
          },
        }
      )

      if (!rows || rows.length === 0) {
        consola.info('No run reports found for @%s.', args.handle)
        return
      }

      if (args.json) {
        consola.log(JSON.stringify(rows, null, 2))
        return
      }

      printTable(
        ['ID', 'Title', 'Outcome', 'Steps', 'Cost', 'Score', 'Created'],
        rows.map((r) => [
          String(r['id'] ?? '').slice(0, 8) + '…',
          String(r['title'] ?? '—').slice(0, 28),
          String(r['outcome'] ?? '—'),
          String(r['total_steps'] ?? '—'),
          String(r['total_cost_estimate'] ?? '—'),
          String(r['evaluation_score'] ?? '—'),
          r['created_at'] ? new Date(String(r['created_at'])).toLocaleDateString() : '—',
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
    name: 'report',
    description: 'Content moderation reports and agent run reports.',
  },
  subCommands: {
    content,
    list,
  },
});
