import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';
import { loadUserConfig, saveUserConfig } from '../config/project-config';

const list = defineCommand({
  meta: {
    name: 'communities',
    description: 'List public communities.',
  },
  args: {
    query: {
      type: 'string',
      description: 'Search query',
      default: '',
    },
    sort: {
      type: 'string',
      description: 'Sort order: date | members | activity',
      default: 'date',
    },
    tag: {
      type: 'string',
      description: 'Filter by tag slug',
      default: '',
    },
    limit: {
      type: 'string',
      description: 'Max results (default 20)',
      default: '20',
    },
    offset: {
      type: 'string',
      description: 'Pagination offset',
      default: '0',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const communities = await callRpc<Array<Record<string, unknown>>>(
        'fn_communities_list',
        {
          p_query: args.query || null,
          p_sort: args.sort,
          p_tag: args.tag || null,
          p_limit: parseInt(String(args.limit), 10),
          p_offset: parseInt(String(args.offset), 10),
        },
        {}
      );

      if (args.json) { printJson(communities); return; }

      if (!Array.isArray(communities) || communities.length === 0) {
        consola.info('No communities found.');
        return;
      }

      printTable(
        ['Slug', 'Name', 'Members', 'Private', 'Created'],
        communities.map((c) => [
          truncate(String(c.slug ?? '—'), 28),
          truncate(String(c.name ?? '—'), 36),
          String(c.member_count ?? 0),
          c.is_private ? 'yes' : 'no',
          c.created_at ? new Date(String(c.created_at)).toLocaleDateString() : '—',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

const view = defineCommand({
  meta: {
    name: 'view',
    description: 'Show detailed metadata for a community.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Community slug',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const community = await callRpc<Record<string, unknown>>(
        'fn_community_get',
        { p_slug: args.slug },
        {}
      );

      if (!community) { consola.warn('Community not found: %s', args.slug); return; }

      if (args.json) { printJson(community); return; }

      consola.info('Slug:        %s', community.slug);
      consola.info('Name:        %s', community.name);
      consola.info('Members:     %s', community.member_count ?? 0);
      consola.info('Private:     %s', community.is_private ? 'yes' : 'no');
      consola.info('Created:     %s', community.created_at ? new Date(String(community.created_at)).toLocaleDateString() : '—');
      if (community.description) consola.info('Description: %s', community.description);
      if (community.contact) consola.info('Contact:     %s', community.contact);
    } catch (err) {
      handleError(err);
    }
  },
});

const create = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new community.',
  },
  args: {
    name: {
      type: 'string',
      description: 'Community display name',
      required: true,
    },
    slug: {
      type: 'string',
      description: 'URL-safe slug (e.g. my-community)',
      required: true,
    },
    description: {
      type: 'string',
      description: 'Short description',
      default: '',
    },
    private: {
      type: 'boolean',
      description: 'Make this community private (invite-only)',
      default: false,
    },
    contact: {
      type: 'string',
      description: 'Contact email or URL',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const community = await callRpc<Record<string, unknown>>(
        'fn_community_create',
        {
          p_name: args.name,
          p_slug: args.slug,
          p_description: args.description || null,
          p_is_private: args.private,
          p_contact: args.contact || null,
        },
        { requireAuth: true }
      );

      if (args.json) { printJson(community); return; }

      consola.success('Community created: %s', community?.slug ?? args.slug);
    } catch (err) {
      handleError(err);
    }
  },
});

const update = defineCommand({
  meta: {
    name: 'update',
    description: 'Update community metadata.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Community slug',
      required: true,
    },
    name: {
      type: 'string',
      description: 'New display name',
      default: '',
    },
    description: {
      type: 'string',
      description: 'New description',
      default: '',
    },
    private: {
      type: 'boolean',
      description: 'Set private flag',
      default: false,
    },
    contact: {
      type: 'string',
      description: 'New contact email or URL',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const community = await callRpc<Record<string, unknown>>(
        'fn_community_update',
        {
          p_slug: args.slug,
          p_name: args.name || null,
          p_description: args.description || null,
          p_is_private: args.private,
          p_contact: args.contact || null,
        },
        { requireAuth: true }
      );

      if (args.json) { printJson(community); return; }

      consola.success('Community updated: %s', args.slug);
    } catch (err) {
      handleError(err);
    }
  },
});

const del = defineCommand({
  meta: {
    name: 'delete',
    description: 'Permanently delete a community.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Community slug',
      required: true,
    },
    confirm: {
      type: 'boolean',
      description: 'Skip confirmation prompt',
      default: false,
    },
  },
  async run({ args }) {
    if (!args.confirm) {
      consola.warn('This will permanently delete community "%s" and all its data.', args.slug);
      consola.info('Re-run with --confirm to proceed.');
      return;
    }

    try {
      await callRpc('fn_community_delete', { p_slug: args.slug }, { requireAuth: true });
      consola.success('Community deleted: %s', args.slug);
    } catch (err) {
      handleError(err);
    }
  },
});

const join = defineCommand({
  meta: {
    name: 'join',
    description: 'Join a public community.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Community slug',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_community_join', { p_slug: args.slug }, { requireAuth: true });
      consola.success('Joined community: %s', args.slug);
    } catch (err) {
      handleError(err);
    }
  },
});

const leave = defineCommand({
  meta: {
    name: 'leave',
    description: 'Leave a community.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Community slug',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_community_leave', { p_slug: args.slug }, { requireAuth: true });
      consola.success('Left community: %s', args.slug);
    } catch (err) {
      handleError(err);
    }
  },
});

const switchCtx = defineCommand({
  meta: {
    name: 'switch',
    description: 'Set the active community context for subsequent commands.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Community slug',
      required: true,
    },
  },
  async run({ args }) {
    try {
      // Verify the community exists before saving context
      const community = await callRpc<Record<string, unknown>>(
        'fn_community_get',
        { p_slug: args.slug },
        { requireAuth: true }
      );

      if (!community) {
        consola.error('Community not found or you are not a member: %s', args.slug);
        process.exitCode = 1;
        return;
      }

      saveUserConfig({ communitySlug: args.slug });
      consola.success('Active community set to: %s', args.slug);
    } catch (err) {
      handleError(err);
    }
  },
});

const members = defineCommand({
  meta: {
    name: 'members',
    description: 'List members of a community.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Community slug',
      required: true,
    },
    role: {
      type: 'string',
      description: 'Filter by role: owner | admin | moderator | member',
      default: '',
    },
    limit: {
      type: 'string',
      description: 'Max results (default 50)',
      default: '50',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const memberList = await callRpc<Array<Record<string, unknown>>>(
        'fn_community_members',
        {
          p_slug: args.slug,
          p_role: args.role || null,
          p_limit: parseInt(String(args.limit), 10),
        },
        { requireAuth: true }
      );

      if (args.json) { printJson(memberList); return; }

      if (!Array.isArray(memberList) || memberList.length === 0) {
        consola.info('No members found.');
        return;
      }

      printTable(
        ['Username', 'Role', 'Joined'],
        memberList.map((m) => [
          String(m.username ?? '—'),
          String(m.role ?? '—'),
          m.joined_at ? new Date(String(m.joined_at)).toLocaleDateString() : '—',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

function makeResourceLister(resourceType: 'lenses' | 'agents' | 'workflows') {
  const rpcName = `fn_community_${resourceType}` as const;
  return defineCommand({
    meta: {
      name: resourceType,
      description: `List ${resourceType} published by a community.`,
    },
    args: {
      slug: {
        type: 'positional',
        description: 'Community slug',
        required: true,
      },
      json: {
        type: 'boolean',
        description: 'Output as JSON',
        default: false,
      },
    },
    async run({ args }) {
      try {
        const items = await callRpc<Array<Record<string, unknown>>>(
          rpcName,
          { p_slug: args.slug },
          {}
        );

        if (args.json) { printJson(items); return; }

        if (!Array.isArray(items) || items.length === 0) {
          consola.info('No %s found for community %s.', resourceType, args.slug);
          return;
        }

        printTable(
          ['Slug', 'Title', 'Published'],
          items.map((item) => [
            truncate(String(item.slug ?? '—'), 30),
            truncate(String(item.title ?? item.name ?? '—'), 40),
            item.published_at ? new Date(String(item.published_at)).toLocaleDateString() : '—',
          ])
        );
      } catch (err) {
        handleError(err);
      }
    },
  });
}

// Reads active community from user config
export function getActiveCommunity(): string | undefined {
  const cfg = loadUserConfig();
  return (cfg as Record<string, unknown>).communitySlug as string | undefined;
}

export default defineCommand({
  meta: {
    name: 'communities',
    description: 'Manage communities: list, view, create, update, delete, join, leave, switch, members, lenses, agents, workflows.',
  },
  subCommands: {
    view,
    create,
    update,
    delete: del,
    join,
    leave,
    switch: switchCtx,
    members,
    lenses: makeResourceLister('lenses'),
    agents: makeResourceLister('agents'),
    workflows: makeResourceLister('workflows'),
  },
  // Default (no subcommand) → list
  run: list.run,
  args: list.args,
});
