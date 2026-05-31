import { defineCommand } from 'citty';
import consola from 'consola';
import { getPersonalContentFeed, isContentFeedType } from '../lib/data-services';
import { handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';

export default defineCommand({
  meta: {
    name: 'feed',
    description: 'View your personalised content feed (threads or lenses).',
  },
  args: {
    type: {
      type: 'string',
      default: 'threads',
      description: 'Content type: threads | lenses (alias: prompts)',
    },
    limit: {
      type: 'string',
      default: '10',
      description: 'Number of items to show',
    },
    json: {
      type: 'boolean',
      default: false,
      description: 'Output as JSON',
    },
  },
  async run({ args }) {
    if (!isContentFeedType(args.type)) {
      consola.error(
        'Invalid type: %s. Must be one of: threads, lenses, prompts',
        args.type,
      );
      process.exitCode = 1;
      return;
    }

    const limit = parseInt(args.limit, 10)
    if (!Number.isFinite(limit) || limit < 1) {
      consola.error('Invalid --limit: %s. Must be a positive integer.', args.limit)
      process.exitCode = 1
      return
    }

    try {
      const results = await getPersonalContentFeed(args.type, limit)

      if (!results.length) {
        consola.info(
          'Your personalised feed is empty. Follow tags and lensers to populate it.',
        );
        return;
      }

      if (args.json) {
        printJson(results);
        return;
      }

      printTable(
        ['ID', 'Title', 'Score', 'Language'],
        results.map((r) => [
          String(r.id || '-').substring(0, 8) + '…',
          truncate(String(r.title || '(no title)'), 38),
          typeof r.personal_score === 'number' ? r.personal_score.toFixed(3) : '-',
          String(r.primary_language || '-'),
        ]),
      );
    } catch (err) {
      handleError(err);
    }
  },
});
