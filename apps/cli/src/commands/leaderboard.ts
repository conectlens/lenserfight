import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';

const VALID_PERIODS = ['weekly', 'monthly', 'all_time'] as const;

export default defineCommand({
  meta: {
    name: 'leaderboard',
    description: 'Show the lenser activity leaderboard ranked by engagement score.',
  },
  args: {
    period: {
      type: 'string',
      default: 'all_time',
      description: 'Time window: weekly | monthly | all_time',
    },
    limit: {
      type: 'string',
      default: '20',
      description: 'Number of entries to show',
    },
    json: {
      type: 'boolean',
      default: false,
      description: 'Output as JSON',
    },
  },
  async run({ args }) {
    if (!(VALID_PERIODS as readonly string[]).includes(args.period)) {
      consola.error(
        'Invalid period: %s. Must be one of: %s',
        args.period,
        VALID_PERIODS.join(', ')
      );
      process.exitCode = 1;
      return;
    }

    const limit = parseInt(args.limit, 10);
    if (!Number.isFinite(limit) || limit < 1) {
      consola.error('Invalid --limit: %s. Must be a positive integer.', args.limit);
      process.exitCode = 1;
      return;
    }

    try {
      const results = await callRpc<Array<Record<string, unknown>>>(
        'fn_lensers_get_leaderboard',
        {
          p_period: args.period,
          p_limit: limit,
        }
        // No auth required — public endpoint
      );

      if (!results?.length) {
        consola.info('No leaderboard data for period: %s', args.period);
        return;
      }

      if (args.json) {
        printJson(results);
        return;
      }

      const periodLabel =
        args.period === 'weekly'
          ? 'This Week'
          : args.period === 'monthly'
          ? 'This Month'
          : 'All Time';

      consola.info('Leaderboard — %s', periodLabel);
      printTable(
        ['Rank', 'Handle', 'Display Name', 'XP', 'Level', 'Score'],
        results.map((r) => [
          String(r.rank || '-'),
          String(r.handle || '-'),
          truncate(String(r.display_name || '-'), 24),
          String(r.total_xp ?? 0),
          String(r.current_level ?? '-'),
          typeof r.lenser_score === 'number' ? r.lenser_score.toFixed(2) : '-',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});
