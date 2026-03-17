import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';

// ---------------------------------------------------------------------------
// Shared helper — resolves a tag UUID from its slug.
// ---------------------------------------------------------------------------
async function resolveTagId(slug: string): Promise<{ id: string; name: string } | null> {
  const tags = await callRpc<Array<{ id: string; name: string; slug: string }>>(
    'fn_content_tags_get_by_slug',
    { p_slug: slug }
  );
  return tags?.[0] ?? null;
}

// ---------------------------------------------------------------------------
// Shared helper — resolves the authenticated lenser's own UUID.
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
// tag follow <slug>
// ---------------------------------------------------------------------------
const follow = defineCommand({
  meta: {
    name: 'follow',
    description: 'Follow a tag by its slug (e.g. "typescript", "ai").',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Tag slug to follow',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const tag = await resolveTagId(args.slug);
      if (!tag) {
        consola.error('Tag not found: %s', args.slug);
        process.exitCode = 1;
        return;
      }
      await callRpc(
        'fn_content_follow_tag',
        { p_tag_id: tag.id },
        { requireAuth: true }
      );
      consola.success('Now following tag: %s (%s)', tag.name, args.slug);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// tag unfollow <slug>
// ---------------------------------------------------------------------------
const unfollow = defineCommand({
  meta: {
    name: 'unfollow',
    description: 'Unfollow a tag by its slug.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Tag slug to unfollow',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const tag = await resolveTagId(args.slug);
      if (!tag) {
        consola.error('Tag not found: %s', args.slug);
        process.exitCode = 1;
        return;
      }
      await callRpc(
        'fn_content_unfollow_tag',
        { p_tag_id: tag.id },
        { requireAuth: true }
      );
      consola.success('Unfollowed tag: %s (%s)', tag.name, args.slug);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// tag followed  [--json]
// ---------------------------------------------------------------------------
const followed = defineCommand({
  meta: {
    name: 'followed',
    description: 'List all tags you are currently following.',
  },
  args: {
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
        consola.warn('No lenser profile found. Run `auth login` first.');
        return;
      }

      const results = await callRpc<Array<Record<string, unknown>>>(
        'fn_content_get_followed_tags',
        { p_lenser_id: selfId },
        { requireAuth: true }
      );

      if (!results?.length) {
        consola.info('You are not following any tags yet.');
        return;
      }
      if (args.json) {
        printJson(results);
        return;
      }
      printTable(
        ['Tag ID', 'Slug', 'Name', 'Followed At'],
        results.map((r) => [
          String(r.tag_id || '-').substring(0, 8) + '…',
          String(r.slug || '-'),
          truncate(String(r.name || '-'), 28),
          String(r.followed_at || '-').substring(0, 10),
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// Root: lenserfight tag
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'tag',
    description: 'Follow and manage tags to personalise your feed.',
  },
  subCommands: {
    follow,
    unfollow,
    followed,
  },
});
