import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';

const VALID_TYPES = ['thread', 'lens'] as const;
const VALID_REASONS = [
  'spam',
  'harassment',
  'misinformation',
  'off_topic',
  'other',
] as const;

export default defineCommand({
  meta: {
    name: 'report',
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
