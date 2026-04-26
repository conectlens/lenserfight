import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';

const TOKEN_SCOPES = [
  'lenses:read', 'lenses:write',
  'agents:read', 'agents:write',
  'workflows:read', 'workflows:write',
  'threads:read', 'threads:write',
  'community:read', 'community:write',
  'connectors:read', 'connectors:write',
];

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List registered connectors for your active community.',
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
      const connectors = await callRpc<Array<Record<string, unknown>>>(
        'fn_connectors_list',
        {},
        { requireAuth: true }
      );

      if (args.json) { printJson(connectors); return; }

      if (!Array.isArray(connectors) || connectors.length === 0) {
        consola.info('No connectors registered.');
        return;
      }

      printTable(
        ['Slug', 'Name', 'Scopes', 'Active', 'Created'],
        connectors.map((c) => [
          truncate(String(c.slug ?? '—'), 24),
          truncate(String(c.name ?? '—'), 32),
          truncate(Array.isArray(c.scopes) ? c.scopes.join(' ') : String(c.scopes ?? '—'), 36),
          c.is_active ? 'yes' : 'no',
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
    description: 'Show configuration and token metadata for a connector.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Connector slug',
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
      const connector = await callRpc<Record<string, unknown>>(
        'fn_connector_get',
        { p_slug: args.slug },
        { requireAuth: true }
      );

      if (!connector) { consola.warn('Connector not found: %s', args.slug); return; }

      if (args.json) { printJson(connector); return; }

      consola.info('Slug:        %s', connector.slug);
      consola.info('Name:        %s', connector.name);
      consola.info('Active:      %s', connector.is_active ? 'yes' : 'no');
      consola.info('Scopes:      %s', Array.isArray(connector.scopes) ? connector.scopes.join(', ') : '—');
      consola.info('Created:     %s', connector.created_at ? new Date(String(connector.created_at)).toLocaleDateString() : '—');
      consola.info('Last Used:   %s', connector.last_used_at ? new Date(String(connector.last_used_at)).toLocaleDateString() : 'never');
      if (connector.description) consola.info('Description: %s', connector.description);
    } catch (err) {
      handleError(err);
    }
  },
});

const add = defineCommand({
  meta: {
    name: 'add',
    description: 'Register a new connector and issue a service token.',
  },
  args: {
    name: {
      type: 'string',
      description: 'Display name for the connector',
      required: true,
    },
    slug: {
      type: 'string',
      description: 'URL-safe identifier (e.g. my-saas-prod)',
      required: true,
    },
    description: {
      type: 'string',
      description: 'Short description of the integration',
      default: '',
    },
    scopes: {
      type: 'string',
      description: `Comma-separated scopes. Available: ${TOKEN_SCOPES.join(', ')}`,
      default: 'lenses:read',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON (includes service token)',
      default: false,
    },
  },
  async run({ args }) {
    const requestedScopes = args.scopes.split(',').map((s: string) => s.trim()).filter(Boolean);
    const invalid = requestedScopes.filter((s: string) => !TOKEN_SCOPES.includes(s));
    if (invalid.length > 0) {
      consola.error('Invalid scopes: %s', invalid.join(', '));
      consola.info('Available scopes: %s', TOKEN_SCOPES.join(', '));
      process.exitCode = 1;
      return;
    }

    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_connector_create',
        {
          p_name: args.name,
          p_slug: args.slug,
          p_description: args.description || null,
          p_scopes: requestedScopes,
        },
        { requireAuth: true }
      );

      if (args.json) { printJson(result); return; }

      consola.success('Connector registered: %s', result?.slug ?? args.slug);
      if (result?.service_token) {
        consola.info('Service token (save this — it will not be shown again):');
        consola.info('%s', result.service_token);
      }
    } catch (err) {
      handleError(err);
    }
  },
});

const remove = defineCommand({
  meta: {
    name: 'remove',
    description: 'Deactivate a connector and revoke its service token.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Connector slug',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_connector_remove', { p_slug: args.slug }, { requireAuth: true });
      consola.success('Connector deactivated: %s', args.slug);
    } catch (err) {
      handleError(err);
    }
  },
});

const rotate = defineCommand({
  meta: {
    name: 'rotate',
    description: 'Revoke the current service token and issue a new one.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Connector slug',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON (includes new service token)',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_connector_rotate',
        { p_slug: args.slug },
        { requireAuth: true }
      );

      if (args.json) { printJson(result); return; }

      consola.success('Service token rotated for connector: %s', args.slug);
      if (result?.service_token) {
        consola.info('New service token (save this — it will not be shown again):');
        consola.info('%s', result.service_token);
      }
    } catch (err) {
      handleError(err);
    }
  },
});

const test = defineCommand({
  meta: {
    name: 'test',
    description: 'Verify a connector can reach the platform API.',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Connector slug',
      required: true,
    },
  },
  async run({ args }) {
    try {
      consola.start('Testing connector %s...', args.slug);
      const result = await callRpc<Record<string, unknown>>(
        'fn_connector_test',
        { p_slug: args.slug },
        { requireAuth: true }
      );

      if (result?.ok) {
        consola.success('Connector is reachable. Latency: %sms', result.latency_ms ?? '—');
      } else {
        consola.warn('Connector test returned unexpected result.');
        printJson(result);
      }
    } catch (err) {
      handleError(err);
    }
  },
});

export default defineCommand({
  meta: {
    name: 'connectors',
    description: 'Manage service connectors and tokens: list, view, add, remove, rotate, test.',
  },
  subCommands: {
    list,
    view,
    add,
    remove,
    rotate,
    test,
  },
});
