import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';

export default defineCommand({
  meta: {
    name: 'feed',
    description: 'View your personalised content feed (threads or prompts).',
  },
  args: {
    type: {
      type: 'string',
      default: 'threads',
      description: 'Content type: threads | prompts',
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
    const validTypes = ['threads', 'prompts'];
    if (!validTypes.includes(args.type)) {
      consola.error('Invalid type: %s. Must be one of: %s', args.type, validTypes.join(', '));
      process.exitCode = 1;
      return;
    }

    try {
      // Resolve authenticated lenser ID
      const self = await callRpc<Record<string, unknown>>(
        'fn_lensers_get_authenticated_profile',
        {},
        { requireAuth: true }
      );
      const selfId = self?.id as string | undefined;
      if (!selfId) {
        consola.warn('No lenser profile found. Create one at lenserfight.com before using feed.');
        return;
      }

      const rpc =
        args.type === 'prompts'
          ? 'fn_content_get_personal_prompts'
          : 'fn_content_get_personal_threads';

      const results = await callRpc<Array<Record<string, unknown>>>(
        rpc,
        {
          p_lenser_id: selfId,
          p_limit: parseInt(args.limit, 10),
          p_offset: 0,
        },
        { requireAuth: true }
      );

      if (!results?.length) {
        consola.info(
          'Your personalised feed is empty. Follow tags and lensers to populate it.'
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
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});
