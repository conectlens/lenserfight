import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';

export default defineCommand({
  meta: {
    name: 'connect',
    description: 'Subscribe to, disconnect from, list, or sync public lenses and workflows.',
  },
  args: {
    target: {
      type: 'positional',
      description: 'Lens or workflow slug to connect (omit when using --list or --sync)',
      required: false,
    },
    disconnect: {
      type: 'string',
      description: 'Disconnect from a lens or workflow slug',
      default: '',
    },
    list: {
      type: 'boolean',
      description: 'List all connected lenses and workflows',
      default: false,
    },
    sync: {
      type: 'boolean',
      description: 'Pull latest versions for all connected lenses and workflows',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON (with --list)',
      default: false,
    },
  },
  async run({ args }) {
    // --list
    if (args.list) {
      try {
        const connections = await callRpc<Array<Record<string, unknown>>>(
          'fn_connections_list',
          {},
          { requireAuth: true }
        );

        if (args.json) { printJson(connections); return; }

        if (!Array.isArray(connections) || connections.length === 0) {
          consola.info('No connections. Run: lenserfight connect <lens-slug>');
          return;
        }

        printTable(
          ['Slug', 'Type', 'Version', 'Connected'],
          connections.map((c) => [
            truncate(String(c.slug ?? '—'), 32),
            String(c.resource_type ?? '—'),
            String(c.version ?? '—'),
            c.connected_at ? new Date(String(c.connected_at)).toLocaleDateString() : '—',
          ])
        );
      } catch (err) {
        handleError(err);
      }
      return;
    }

    // --sync
    if (args.sync) {
      try {
        consola.start('Syncing connections...');
        const result = await callRpc<Record<string, unknown>>(
          'fn_connections_sync',
          {},
          { requireAuth: true }
        );
        consola.success('Synced %s connection(s).', result?.synced ?? '?');
      } catch (err) {
        handleError(err);
      }
      return;
    }

    // --disconnect <slug>
    if (args.disconnect) {
      try {
        await callRpc(
          'fn_lens_disconnect',
          { p_slug: args.disconnect },
          { requireAuth: true }
        );
        consola.success('Disconnected from: %s', args.disconnect);
      } catch (err) {
        handleError(err);
      }
      return;
    }

    // connect <target>
    if (!args.target) {
      consola.error('Provide a lens slug, or use --list / --sync / --disconnect <slug>.');
      process.exitCode = 1;
      return;
    }

    try {
      await callRpc(
        'fn_lens_connect',
        { p_slug: args.target },
        { requireAuth: true }
      );
      consola.success('Connected to: %s', args.target);
      consola.info('Run `lenserfight connect --list` to see all connections.');
    } catch (err) {
      handleError(err);
    }
  },
});
