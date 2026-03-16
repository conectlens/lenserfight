import { defineCommand } from 'citty';
import consola from 'consola';
import { loadConfig } from '../config/project-config';

const create = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new battle in draft status.',
  },
  args: {
    title: {
      type: 'string',
      description: 'Battle title',
      required: true,
    },
    slug: {
      type: 'string',
      description: 'URL-friendly slug',
      required: true,
    },
    prompt: {
      type: 'string',
      description: 'Task prompt for contenders',
      required: true,
    },
    rubric: {
      type: 'string',
      description: 'Rubric UUID to attach (optional)',
    },
  },
  async run({ args }) {
    const config = loadConfig();

    if (!config.supabaseAnonKey) {
      consola.error(
        'supabaseAnonKey not set. Run `lenserfight init` with --anon-key.'
      );
      process.exitCode = 1;
      return;
    }

    const body: Record<string, unknown> = {
      p_title: args.title,
      p_slug: args.slug,
      p_task_prompt: args.prompt,
    };

    if (args.rubric) {
      body.p_rubric_id = args.rubric;
    }

    try {
      const res = await fetch(
        `${config.supabaseUrl}/rest/v1/rpc/fn_battles_create`,
        {
          method: 'POST',
          headers: {
            apikey: config.supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        consola.error('Failed to create battle: %s', err.message || res.statusText);
        process.exitCode = 1;
        return;
      }

      const battleId = await res.json();
      consola.success('Battle created: %s', battleId);
    } catch (err) {
      consola.error('Request failed: %s', (err as Error).message);
      process.exitCode = 1;
    }
  },
});

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List public battles.',
  },
  args: {
    limit: {
      type: 'string',
      description: 'Number of battles to list',
      default: '10',
    },
  },
  async run({ args }) {
    const config = loadConfig();

    if (!config.supabaseAnonKey) {
      consola.error(
        'supabaseAnonKey not set. Run `lenserfight init` with --anon-key.'
      );
      process.exitCode = 1;
      return;
    }

    try {
      const res = await fetch(
        `${config.supabaseUrl}/rest/v1/rpc/fn_battles_list_public`,
        {
          method: 'POST',
          headers: {
            apikey: config.supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_limit: parseInt(args.limit, 10),
            p_offset: 0,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        consola.error('Failed: %s', err.message || res.statusText);
        process.exitCode = 1;
        return;
      }

      const battles = await res.json();

      if (!Array.isArray(battles) || battles.length === 0) {
        consola.info('No public battles found.');
        return;
      }

      for (const b of battles) {
        consola.log(
          '  %s  %s  [%s]  %s',
          b.id?.substring(0, 8) || '-',
          b.status || '-',
          b.contender_count || 0,
          b.title || 'Untitled'
        );
      }
    } catch (err) {
      consola.error('Request failed: %s', (err as Error).message);
      process.exitCode = 1;
    }
  },
});

const view = defineCommand({
  meta: {
    name: 'view',
    description: 'View a battle by ID.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    const config = loadConfig();

    if (!config.supabaseAnonKey) {
      consola.error(
        'supabaseAnonKey not set. Run `lenserfight init` with --anon-key.'
      );
      process.exitCode = 1;
      return;
    }

    try {
      const res = await fetch(
        `${config.supabaseUrl}/rest/v1/rpc/fn_battles_get_public`,
        {
          method: 'POST',
          headers: {
            apikey: config.supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_battle_id: args.id }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        consola.error('Failed: %s', err.message || res.statusText);
        process.exitCode = 1;
        return;
      }

      const battle = await res.json();

      if (!battle) {
        consola.warn('Battle not found or not public.');
        return;
      }

      consola.log(JSON.stringify(battle, null, 2));
    } catch (err) {
      consola.error('Request failed: %s', (err as Error).message);
      process.exitCode = 1;
    }
  },
});

export default defineCommand({
  meta: {
    name: 'battle',
    description: 'Manage battles: create, list, view.',
  },
  subCommands: {
    create,
    list,
    view,
  },
});
