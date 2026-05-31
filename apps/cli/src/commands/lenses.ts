import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';

const browse = defineCommand({
  meta: {
    name: 'lenses',
    description: 'List public lenses.',
  },
  args: {
    sort: {
      type: 'string',
      description: 'Sort order: date | popularity | trending',
      default: 'date',
    },
    tag: {
      type: 'string',
      description: 'Filter by tag slug',
      default: '',
    },
    author: {
      type: 'string',
      description: 'Filter by author username',
      default: '',
    },
    community: {
      type: 'string',
      description: 'Filter by community slug',
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
    const VALID_SORTS = ['date', 'popularity', 'trending'];
    if (!VALID_SORTS.includes(args.sort)) {
      consola.error('Invalid --sort value "%s". Must be one of: %s', args.sort, VALID_SORTS.join(', '));
      process.exitCode = 1;
      return;
    }

    try {
      const lenses = await callRpc<Array<Record<string, unknown>>>(
        'fn_lenses_browse',
        {
          p_sort: args.sort,
          p_tag: args.tag || null,
          p_author: args.author || null,
          p_community: args.community || null,
          p_limit: parseInt(String(args.limit), 10),
          p_offset: parseInt(String(args.offset), 10),
        },
        {}
      );

      if (args.json) { printJson(lenses); return; }

      if (!Array.isArray(lenses) || lenses.length === 0) {
        consola.info('No lenses found.');
        return;
      }

      printTable(
        ['Slug', 'Title', 'Author', 'Stars', 'Published'],
        lenses.map((l) => [
          truncate(String(l.slug ?? '—'), 30),
          truncate(String(l.title ?? '—'), 40),
          String(l.author_username ?? '—'),
          String(l.star_count ?? 0),
          l.published_at ? new Date(String(l.published_at)).toLocaleDateString() : '—',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

const search = defineCommand({
  meta: {
    name: 'search',
    description: 'Full-text search across public lenses.',
  },
  args: {
    query: {
      type: 'positional',
      description: 'Search query',
      required: true,
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
      const results = await callRpc<Array<Record<string, unknown>>>(
        'fn_lenses_search',
        {
          p_query: args.query,
          p_tag: args.tag || null,
          p_limit: parseInt(String(args.limit), 10),
          p_offset: parseInt(String(args.offset), 10),
        },
        {}
      );

      if (args.json) { printJson(results); return; }

      if (!Array.isArray(results) || results.length === 0) {
        consola.info('No lenses found for "%s".', args.query);
        return;
      }

      printTable(
        ['Slug', 'Title', 'Author', 'Stars'],
        results.map((l) => [
          truncate(String(l.slug ?? '—'), 30),
          truncate(String(l.title ?? '—'), 40),
          String(l.author_username ?? '—'),
          String(l.star_count ?? 0),
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
    description: 'Show detailed metadata for a public lens.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Lens slug or ID',
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
      const lens = await callRpc<Record<string, unknown>>(
        'fn_lens_get',
        { p_slug: args.slug },
        {}
      );

      if (args.json) { printJson(lens ?? null); return; }

      if (!lens) { consola.warn('Lens not found: %s', args.slug); return; }

      consola.info('Slug:        %s', lens.slug);
      consola.info('Title:       %s', lens.title);
      consola.info('Author:      %s', lens.author_username);
      consola.info('Stars:       %s', lens.star_count ?? 0);
      consola.info('Tags:        %s', Array.isArray(lens.tags) ? lens.tags.join(', ') : '—');
      consola.info('Published:   %s', lens.published_at ? new Date(String(lens.published_at)).toLocaleDateString() : '—');
      if (lens.description) consola.info('Description: %s', lens.description);
    } catch (err) {
      handleError(err);
    }
  },
});

const fork = defineCommand({
  meta: {
    name: 'fork',
    description: 'Clone a public lens into your account.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Lens slug or ID to fork',
      required: true,
    },
    name: {
      type: 'string',
      description: 'Override the forked lens title',
      default: '',
    },
  },
  async run({ args }) {
    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_lens_fork',
        { p_slug: args.slug, p_name: args.name || null },
        { requireAuth: true }
      );
      consola.success('Lens forked: %s', result?.slug ?? result?.id ?? '');
    } catch (err) {
      handleError(err);
    }
  },
});

const use = defineCommand({
  meta: {
    name: 'use',
    description: 'Execute a public lens directly.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Lens slug or ID',
      required: true,
    },
    input: {
      type: 'string',
      description: 'Input text to pass to the lens',
      default: '',
    },
    ollama: {
      type: 'boolean',
      description: 'Use local Ollama backend',
      default: false,
    },
    model: {
      type: 'string',
      description: 'Model name override',
      default: '',
    },
    byok: {
      type: 'string',
      description: 'Bring-your-own API key',
      default: '',
    },
    provider: {
      type: 'string',
      description: 'Provider override (openai, anthropic, google, etc.)',
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
      consola.start('Executing lens %s...', args.slug);
      const result = await callRpc<Record<string, unknown>>(
        'fn_lens_execute',
        {
          p_slug: args.slug,
          p_input: args.input || null,
          p_ollama: args.ollama,
          p_model: args.model || null,
          p_byok: args.byok || null,
          p_provider: args.provider || null,
        },
        { requireAuth: true }
      );

      if (args.json) { printJson(result); return; }

      if (result?.output) consola.info(String(result.output));
      else consola.success('Done.');
    } catch (err) {
      handleError(err);
    }
  },
});

const trending = defineCommand({
  meta: {
    name: 'trending',
    description: 'Show top lenses by 7-day hot score.',
  },
  args: {
    limit: {
      type: 'string',
      description: 'Max results (default 10)',
      default: '10',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const lenses = await callRpc<Array<Record<string, unknown>>>(
        'fn_lenses_trending',
        { p_limit: parseInt(String(args.limit), 10) },
        {}
      );

      if (args.json) { printJson(lenses); return; }

      if (!Array.isArray(lenses) || lenses.length === 0) {
        consola.info('No trending lenses found.');
        return;
      }

      printTable(
        ['#', 'Slug', 'Title', 'Author', 'Score'],
        lenses.map((l, i) => [
          String(i + 1),
          truncate(String(l.slug ?? '—'), 28),
          truncate(String(l.title ?? '—'), 38),
          String(l.author_username ?? '—'),
          String(l.hot_score ?? '—'),
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

const starred = defineCommand({
  meta: {
    name: 'starred',
    description: 'List your starred lenses.',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const lenses = await callRpc<Array<Record<string, unknown>>>(
        'fn_lenses_starred',
        {},
        { requireAuth: true }
      );

      if (args.json) { printJson(lenses); return; }

      if (!Array.isArray(lenses) || lenses.length === 0) {
        consola.info('No starred lenses.');
        return;
      }

      printTable(
        ['Slug', 'Title', 'Author', 'Starred At'],
        lenses.map((l) => [
          truncate(String(l.slug ?? '—'), 30),
          truncate(String(l.title ?? '—'), 40),
          String(l.author_username ?? '—'),
          l.starred_at ? new Date(String(l.starred_at)).toLocaleDateString() : '—',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

const star = defineCommand({
  meta: {
    name: 'star',
    description: 'Star or unstar a public lens.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Lens slug or ID',
      required: true,
    },
    unstar: {
      type: 'boolean',
      description: 'Remove star instead of adding',
      default: false,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_lens_star',
        { p_slug: args.slug, p_unstar: args.unstar },
        { requireAuth: true }
      );
      consola.success(args.unstar ? 'Unstarred: %s' : 'Starred: %s', args.slug);
    } catch (err) {
      handleError(err);
    }
  },
});

export default defineCommand({
  meta: {
    name: 'lenses',
    description: 'Discover and use public lenses: browse, search, view, fork, use, trending, starred, star.',
  },
  subCommands: {
    search,
    view,
    fork,
    use,
    trending,
    starred,
    star,
  },
  // Default (no subcommand) → browse
  run: browse.run,
  args: browse.args,
});
