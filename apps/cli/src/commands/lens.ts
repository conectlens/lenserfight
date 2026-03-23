import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';

// ---------------------------------------------------------------------------
// lens version list
// ---------------------------------------------------------------------------
const versionList = defineCommand({
  meta: {
    name: 'list',
    description: 'List all versions for a lens.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Lens UUID',
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
      const versions = await callRpc<Array<Record<string, unknown>>>(
        'fn_lenses_list_versions',
        { p_lens_id: args.id },
        { requireAuth: true }
      );

      if (!Array.isArray(versions) || versions.length === 0) {
        consola.info('No versions found for lens %s.', args.id);
        return;
      }

      if (args.json) {
        printJson(versions);
        return;
      }

      printTable(
        ['#', 'Status', 'Changelog', 'Published At', 'Created At'],
        versions.map((v) => [
          String(v.version_number ?? '-'),
          String(v.status ?? '-'),
          truncate(String(v.changelog || '—'), 40),
          v.published_at ? new Date(String(v.published_at)).toLocaleDateString() : '—',
          v.created_at ? new Date(String(v.created_at)).toLocaleDateString() : '—',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// lens version create
// ---------------------------------------------------------------------------
const versionCreate = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new draft version for a lens.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Lens UUID',
      required: true,
    },
    body: {
      type: 'string',
      description: 'Template body (use {{variable}} for params)',
      required: true,
    },
    changelog: {
      type: 'string',
      description: 'Optional changelog message for this version',
      default: '',
    },
    'parent-version': {
      type: 'string',
      description: 'Parent version UUID (for forked versions)',
      default: '',
    },
  },
  async run({ args }) {
    try {
      const { data: version } = await callRpc<{ data: Record<string, unknown> }>(
        'fn_lenses_create_version',
        {
          p_lens_id: args.id,
          p_template_body: args.body,
          p_changelog: args.changelog || null,
          p_parent_version_id: args['parent-version'] || null,
        },
        { requireAuth: true }
      ) as unknown as { data: Record<string, unknown> };

      // The RPC above may not exist yet — fall back to a direct REST insert hint
      consola.success('Version created.');
      if (version?.version_number) {
        consola.info('Version number: %s', version.version_number);
        consola.info('Version ID:     %s', version.id);
        consola.info('\nTo publish: lenserfight lens version publish %s', version.id);
      }
    } catch (err: unknown) {
      // RPC may not exist in current DB — guide the user
      const msg = (err as Error).message ?? '';
      if (msg.includes('not found') || msg.includes('does not exist')) {
        consola.error('RPC fn_lenses_create_version not found. Apply migration schema_refactor_lenses first.');
        consola.info('Use the Web UI or Supabase Studio to create versions until the migration is applied.');
      } else {
        handleError(err);
      }
    }
  },
});

// ---------------------------------------------------------------------------
// lens version publish
// ---------------------------------------------------------------------------
const versionPublish = defineCommand({
  meta: {
    name: 'publish',
    description: 'Publish a draft lens version.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Version UUID to publish',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_lenses_publish_version',
        { p_version_id: args.id },
        { requireAuth: true }
      );
      consola.success('Version %s published.', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// lens version (parent)
// ---------------------------------------------------------------------------
const version = defineCommand({
  meta: {
    name: 'version',
    description: 'Manage lens versions.',
  },
  subCommands: {
    list: versionList,
    create: versionCreate,
    publish: versionPublish,
  },
});

// ---------------------------------------------------------------------------
// lens resource attach
// ---------------------------------------------------------------------------
const resourceAttach = defineCommand({
  meta: {
    name: 'attach',
    description: 'Attach a local file as a resource to a lens version slot.',
  },
  args: {
    'version-id': {
      type: 'string',
      description: 'Version UUID',
      required: true,
    },
    slot: {
      type: 'string',
      description: 'Binding key (named slot, e.g. context_doc)',
      required: true,
    },
    name: {
      type: 'string',
      description: 'Display name for the resource',
      required: true,
    },
    url: {
      type: 'string',
      description: 'External URL to attach (mutually exclusive with --file)',
      default: '',
    },
    text: {
      type: 'string',
      description: 'Inline text content to attach (mutually exclusive with --url)',
      default: '',
    },
  },
  async run({ args }) {
    if (!args.url && !args.text) {
      consola.error('Provide either --url <url> or --text <content>.');
      consola.info('File upload via CLI will be supported in a future release (requires signed URL flow).');
      process.exitCode = 1;
      return;
    }

    if (args.url && args.text) {
      consola.error('Provide only one of --url or --text, not both.');
      process.exitCode = 1;
      return;
    }

    try {
      // Create resource row via REST
      const config = (await import('../config/project-config')).resolveConfig();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: config.supabaseAnonKey ?? '',
        Prefer: 'return=representation',
      };
      if (config.authToken) headers['Authorization'] = `Bearer ${config.authToken}`;

      const resourceRes = await fetch(`${config.supabaseUrl}/rest/v1/resources?schema=ai`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          media_type: args.url ? 'binary' : 'text',
          name: args.name,
          url: args.url || null,
          content_text: args.text || null,
        }),
      });

      if (!resourceRes.ok) {
        const errBody = await resourceRes.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error(String(errBody.message ?? resourceRes.statusText));
      }

      const [resource] = (await resourceRes.json()) as Array<Record<string, unknown>>;
      const resourceId = String(resource.id);

      // Attach to version
      const attachRes = await fetch(`${config.supabaseUrl}/rest/v1/version_resources?schema=lenses`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          version_id: args['version-id'],
          resource_id: resourceId,
          binding_key: args.slot,
        }),
      });

      if (!attachRes.ok) {
        const errBody = await attachRes.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error(String(errBody.message ?? attachRes.statusText));
      }

      consola.success('Resource %s attached to version %s as slot "%s".',
        resourceId, args['version-id'], args.slot);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// lens resource (parent)
// ---------------------------------------------------------------------------
const resource = defineCommand({
  meta: {
    name: 'resource',
    description: 'Manage lens version resources.',
  },
  subCommands: {
    attach: resourceAttach,
  },
});

// ---------------------------------------------------------------------------
// Root command
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'lens',
    description: 'Manage lenses: versions, resources.',
  },
  subCommands: {
    version,
    resource,
  },
});
