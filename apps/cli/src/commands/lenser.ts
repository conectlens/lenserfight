import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';

// ---------------------------------------------------------------------------
// Shared helper — resolves the authenticated lenser's own UUID.
// Used by commands that require the caller's lenser_id (not auth.uid directly).
// ---------------------------------------------------------------------------
async function resolveSelfId(): Promise<string | null> {
  const self = await callRpc<Record<string, unknown>>(
    'fn_lensers_get_authenticated_profile',
    {},
    { requireAuth: true }
  );
  return (self?.id as string) ?? null;
}

// ---------------------------------------------------------------------------
// lenser follow <lenser-id>
// ---------------------------------------------------------------------------
const follow = defineCommand({
  meta: {
    name: 'follow',
    description: 'Follow a lenser by their UUID.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Lenser UUID to follow. Find IDs via `lenser followers` or `lenser following`.',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_lensers_follow',
        { p_following_id: args.id },
        { requireAuth: true }
      );
      consola.success('Now following lenser: %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// lenser unfollow <lenser-id>
// ---------------------------------------------------------------------------
const unfollow = defineCommand({
  meta: {
    name: 'unfollow',
    description: 'Unfollow a lenser by their UUID.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Lenser UUID to unfollow.',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_lensers_unfollow',
        { p_following_id: args.id },
        { requireAuth: true }
      );
      consola.success('Unfollowed lenser: %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// lenser followers  [--id <uuid>] [--limit N] [--json]
// ---------------------------------------------------------------------------
const followers = defineCommand({
  meta: {
    name: 'followers',
    description: 'List followers of a lenser. Defaults to your own profile.',
  },
  args: {
    id: {
      type: 'string',
      description: 'Lenser UUID (defaults to your authenticated lenser)',
    },
    limit: {
      type: 'string',
      default: '20',
      description: 'Number of results to return',
    },
    json: {
      type: 'boolean',
      default: false,
      description: 'Output as JSON',
    },
  },
  async run({ args }) {
    try {
      const lenserId = args.id || (await resolveSelfId());
      if (!lenserId) {
        consola.warn('No lenser profile found. Run `auth login` first.');
        return;
      }

      const results = await callRpc<Array<Record<string, unknown>>>(
        'fn_lensers_get_follows',
        {
          p_lenser_id: lenserId,
          p_type: 'followers',
          p_limit: parseInt(args.limit, 10),
          p_offset: 0,
        },
        { requireAuth: true }
      );

      if (!results?.length) {
        consola.info('No followers found.');
        return;
      }
      if (args.json) {
        printJson(results);
        return;
      }
      printTable(
        ['ID', 'Handle', 'Display Name', 'Following Back'],
        results.map((r) => [
          String(r.lenser_id || '-').substring(0, 8) + '…',
          String(r.handle || '-'),
          truncate(String(r.display_name || '-'), 28),
          r.is_following ? 'Yes' : 'No',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// lenser following  [--id <uuid>] [--limit N] [--json]
// ---------------------------------------------------------------------------
const following = defineCommand({
  meta: {
    name: 'following',
    description: 'List lensers that a user follows. Defaults to your own profile.',
  },
  args: {
    id: {
      type: 'string',
      description: 'Lenser UUID (defaults to your authenticated lenser)',
    },
    limit: {
      type: 'string',
      default: '20',
      description: 'Number of results to return',
    },
    json: {
      type: 'boolean',
      default: false,
      description: 'Output as JSON',
    },
  },
  async run({ args }) {
    try {
      const lenserId = args.id || (await resolveSelfId());
      if (!lenserId) {
        consola.warn('No lenser profile found. Run `auth login` first.');
        return;
      }

      const results = await callRpc<Array<Record<string, unknown>>>(
        'fn_lensers_get_follows',
        {
          p_lenser_id: lenserId,
          p_type: 'following',
          p_limit: parseInt(args.limit, 10),
          p_offset: 0,
        },
        { requireAuth: true }
      );

      if (!results?.length) {
        consola.info('Not following anyone yet.');
        return;
      }
      if (args.json) {
        printJson(results);
        return;
      }
      printTable(
        ['ID', 'Handle', 'Display Name', 'Follows You'],
        results.map((r) => [
          String(r.lenser_id || '-').substring(0, 8) + '…',
          String(r.handle || '-'),
          truncate(String(r.display_name || '-'), 28),
          r.is_following ? 'Yes' : 'No',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// lenser suggested  [--limit N] [--json]
// ---------------------------------------------------------------------------
const suggested = defineCommand({
  meta: {
    name: 'suggested',
    description: 'Show lensers you might want to follow, ranked by tag overlap.',
  },
  args: {
    limit: {
      type: 'string',
      default: '10',
      description: 'Number of suggestions to return',
    },
    json: {
      type: 'boolean',
      default: false,
      description: 'Output as JSON',
    },
  },
  async run({ args }) {
    try {
      const selfId = await resolveSelfId();
      if (!selfId) {
        consola.warn('No lenser profile found. Create one at lenserfight.com first.');
        return;
      }

      const results = await callRpc<Array<Record<string, unknown>>>(
        'fn_lensers_get_suggested',
        {
          p_lenser_id: selfId,
          p_limit: parseInt(args.limit, 10),
        },
        { requireAuth: true }
      );

      if (!results?.length) {
        consola.info('No suggestions available yet — follow some tags to improve suggestions.');
        return;
      }
      if (args.json) {
        printJson(results);
        return;
      }
      printTable(
        ['ID', 'Handle', 'Display Name', 'Score'],
        results.map((r) => [
          String(r.lenser_id || '-').substring(0, 8) + '…',
          String(r.handle || '-'),
          truncate(String(r.display_name || '-'), 28),
          typeof r.lenser_score === 'number' ? r.lenser_score.toFixed(2) : '-',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// Root: lenserfight lenser
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'lenser',
    description: 'Manage lenser follows, followers, and suggestions.',
  },
  subCommands: {
    follow,
    unfollow,
    followers,
    following,
    suggested,
  },
});
