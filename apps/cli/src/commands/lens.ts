import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { markJourneyStep } from '../lib/onboarding/journey';
import { printTable, printJson, truncate } from '../utils/output';
import { makeLifecycleCommand } from '../utils/lifecycle';

const MIN_TEMPLATE_LENGTH = 50;
const VALID_VISIBILITY = ['public', 'community', 'private'] as const;
type Visibility = (typeof VALID_VISIBILITY)[number];

// ---------------------------------------------------------------------------
// lens create
// ---------------------------------------------------------------------------
const lensCreate = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new lens with its initial draft version.',
  },
  args: {
    title: {
      type: 'string',
      description: 'Lens title',
      required: true,
    },
    body: {
      type: 'string',
      description: 'Inline template body (mutually exclusive with --from-file)',
      default: '',
    },
    'from-file': {
      type: 'string',
      description: 'Path to a file containing the template body',
      default: '',
    },
    description: {
      type: 'string',
      description: 'Lens description',
      default: '',
    },
    visibility: {
      type: 'string',
      description: `Visibility: ${VALID_VISIBILITY.join(' | ')}`,
      default: 'public',
    },
    language: {
      type: 'string',
      description: 'Original language code (BCP-47, e.g. en, tr)',
      default: 'en',
    },
    json: {
      type: 'boolean',
      description: 'Output the new lens ID as JSON',
      default: false,
    },
  },
  async run({ args }) {
    if (!VALID_VISIBILITY.includes(args.visibility as Visibility)) {
      consola.error(
        'Invalid --visibility "%s". Must be one of: %s',
        args.visibility,
        VALID_VISIBILITY.join(', ')
      );
      process.exitCode = 1;
      return;
    }

    if (args.body && args['from-file']) {
      consola.error('Provide only one of --body or --from-file, not both.');
      process.exitCode = 1;
      return;
    }

    let templateBody = args.body;
    if (args['from-file']) {
      const filePath = resolve(args['from-file'].replace(/^~/, process.env['HOME'] ?? ''));
      if (!existsSync(filePath)) {
        consola.error('File not found: %s', filePath);
        process.exitCode = 1;
        return;
      }
      templateBody = readFileSync(filePath, 'utf-8');
    }

    if (!templateBody) {
      consola.error('Provide a template body via --body <text> or --from-file <path>.');
      process.exitCode = 1;
      return;
    }

    if (templateBody.trim().length < MIN_TEMPLATE_LENGTH) {
      consola.error(
        'Template body must be at least %d characters (got %d).',
        MIN_TEMPLATE_LENGTH,
        templateBody.trim().length
      );
      process.exitCode = 1;
      return;
    }

    try {
      const lensId = await callRpc<string>(
        'fn_create_lens',
        {
          p_visibility: args.visibility,
          p_template_body: templateBody,
          p_title: args.title,
          p_description: args.description || null,
          p_language_code: args.language,
          p_params: [],
          p_tag_ids: [],
          p_parent_lens_id: null,
          p_forked_from_execution_id: null,
        },
        { requireAuth: true }
      );

      await markJourneyStep('lens_created', true);

      if (args.json) {
        printJson({ id: lensId });
        return;
      }

      consola.success('Lens created.');
      consola.info('Lens ID: %s', lensId);
      consola.info('\nNext: lf lens version list %s', lensId);
    } catch (err) {
      handleError(err);
    }
  },
});

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
    if (args.body.trim().length < MIN_TEMPLATE_LENGTH) {
      consola.error(
        'Template body must be at least %d characters (got %d).',
        MIN_TEMPLATE_LENGTH,
        args.body.trim().length
      );
      process.exitCode = 1;
      return;
    }

    try {
      const version = await callRpc<Record<string, unknown>>(
        'fn_lenses_create_version',
        {
          p_lens_id: args.id,
          p_template_body: args.body,
          p_changelog: args.changelog || null,
          p_parent_version_id: args['parent-version'] || null,
        },
        { requireAuth: true }
      );

      consola.success('Version created.');
      if (version?.version_number) {
        consola.info('Version number: %s', version.version_number);
        consola.info('Version ID:     %s', version.id);
        consola.info('\nTo publish: lenserfight lens version publish %s', version.id);
      }
    } catch (err) {
      handleError(err);
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
// lens import
// ---------------------------------------------------------------------------
interface LocalLensFile {
  id?: string;
  title?: string;
  description?: string;
  template_body?: string;
  body?: string;
  visibility?: string;
}

type ImportStatus = 'imported' | 'skipped' | 'failed';

interface ImportResult {
  file: string;
  status: ImportStatus;
  lensId?: string;
  reason?: string;
}

const lensImport = defineCommand({
  meta: {
    name: 'import',
    description: 'Import lenses from a local directory into Supabase (e.g. after migrating from file mode).',
  },
  args: {
    from: {
      type: 'string',
      description: 'Directory containing lens JSON files (e.g. ~/.lenserfight/lenses/)',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output results as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const dir = resolve(args.from.replace(/^~/, process.env['HOME'] ?? ''));
    let files: string[];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    } catch {
      consola.error('Cannot read directory: %s', dir);
      process.exitCode = 1;
      return;
    }

    if (files.length === 0) {
      consola.info('No JSON files found in %s', dir);
      return;
    }

    const { resolveConfig } = await import('../config/project-config');
    const config = resolveConfig();

    const authHeader = config.apiKey
      ? config.apiKey
      : config.developerToken ?? config.authToken;

    if (!authHeader) {
      consola.error('Authentication required. Run `lf auth login` or set LENSERFIGHT_API_KEY.');
      process.exitCode = 1;
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: config.supabaseAnonKey ?? '',
      Authorization: `Bearer ${authHeader}`,
      Prefer: 'return=representation',
    };

    const results: ImportResult[] = [];

    for (const file of files) {
      const filePath = resolve(dir, file);
      let lens: LocalLensFile;
      try {
        lens = JSON.parse(readFileSync(filePath, 'utf-8')) as LocalLensFile;
      } catch {
        results.push({ file, status: 'failed', reason: 'invalid JSON' });
        continue;
      }

      if (!lens.title) {
        results.push({ file, status: 'skipped', reason: 'missing title' });
        continue;
      }

      const templateBody = lens.template_body ?? lens.body;

      try {
        // 1. Create the lens record
        const lensRes = await fetch(
          `${config.supabaseUrl}/rest/v1/lenses?schema=lenses`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              visibility: lens.visibility ?? 'public',
            }),
          }
        );

        if (!lensRes.ok) {
          const err = await lensRes.json().catch(() => ({})) as Record<string, unknown>;
          results.push({ file, status: 'failed', reason: String(err['message'] ?? lensRes.statusText) });
          continue;
        }

        const [lensRow] = (await lensRes.json()) as Array<Record<string, unknown>>;
        const lensId = String(lensRow['id']);

        // 2. Create entity translation (title + description)
        const transRes = await fetch(
          `${config.supabaseUrl}/rest/v1/entity_translations?schema=content`,
          {
            method: 'POST',
            headers: { ...headers, Prefer: 'return=minimal' },
            body: JSON.stringify({
              entity_id: lensId,
              entity_type: 'lens',
              title: lens.title,
              description: lens.description ?? null,
              language_code: 'en',
              is_original: true,
            }),
          }
        );

        if (!transRes.ok) {
          const err = await transRes.json().catch(() => ({})) as Record<string, unknown>;
          results.push({ file, status: 'failed', reason: String(err['message'] ?? transRes.statusText) });
          continue;
        }

        // 3. Create a draft version if template body is available
        if (templateBody && templateBody.trim().length >= MIN_TEMPLATE_LENGTH) {
          await callRpc(
            'fn_lenses_create_version',
            { p_lens_id: lensId, p_template_body: templateBody },
            { requireAuth: true }
          );
        }

        results.push({ file, status: 'imported', lensId });
      } catch (err) {
        results.push({ file, status: 'failed', reason: (err as Error).message });
      }
    }

    if (args.json) {
      printJson(results);
      return;
    }

    printTable(
      ['File', 'Status', 'Lens ID', 'Reason'],
      results.map((r) => [r.file, r.status, r.lensId ?? '—', r.reason ?? '—'])
    );

    const imported = results.filter((r) => r.status === 'imported').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    consola.info('Done: %d imported, %d skipped, %d failed.', imported, skipped, failed);
  },
});

// ---------------------------------------------------------------------------
// AF-2: lf lens template — scaffold from a bundled lens template
// ---------------------------------------------------------------------------
const LENS_TEMPLATES: Record<string, { description: string; body: string }> = {
  summarize: {
    description: 'Summarise any text into bullet points.',
    body: `---
name: summarize
version: "1.0"
---
Summarise the following text into 3–5 concise bullet points.
Focus on the most important ideas. Use plain language.

{{input}}`,
  },
  classify: {
    description: 'Classify text into one of the provided categories.',
    body: `---
name: classify
version: "1.0"
---
Classify the following text into one of these categories: {{categories}}.
Return only the category name, nothing else.

Text: {{input}}`,
  },
  'extract-json': {
    description: 'Extract structured data from unstructured text as JSON.',
    body: `---
name: extract-json
version: "1.0"
---
Extract the following fields from the text and return valid JSON only:
{{fields}}

Text: {{input}}`,
  },
  'judge-rubric': {
    description: 'Score a piece of writing against a rubric.',
    body: `---
name: judge-rubric
version: "1.0"
---
You are a fair and rigorous judge. Score the following submission against the rubric.
Return a JSON object with one score (0–10) per criterion and a brief justification.

Rubric: {{rubric}}
Submission: {{submission}}`,
  },
  refactor: {
    description: 'Refactor code with a specific goal in mind.',
    body: `---
name: refactor
version: "1.0"
---
Refactor the following code. Goal: {{goal}}.
Preserve the existing behaviour unless it conflicts with the goal.
Return only the refactored code, no explanation.

{{code}}`,
  },
  translate: {
    description: 'Translate text to a target language.',
    body: `---
name: translate
version: "1.0"
---
Translate the following text to {{target_language}}.
Preserve tone and meaning. Do not add explanations.

{{input}}`,
  },
}

const lensTemplateList = defineCommand({
  meta: { name: 'list', description: 'List available lens scaffold templates.' },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    const rows = Object.entries(LENS_TEMPLATES).map(([id, t]) => ({
      id,
      description: t.description,
    }))
    if (args.json) { console.log(JSON.stringify(rows, null, 2)); return }
    for (const { id, description } of rows) {
      consola.log(`  ${id.padEnd(16)} ${description}`)
    }
    consola.info('\nUse: lf lens template use <id> [--output path/to/lens.md]')
  },
})

const lensTemplateUse = defineCommand({
  meta: { name: 'use', description: 'Scaffold a new lens from a template.' },
  args: {
    id:     { type: 'positional', description: 'Template ID (see: lf lens template list)', required: true },
    output: { type: 'string',     description: 'Output file path (default: ./<id>.md)', default: '' },
  },
  async run({ args }) {
    const tpl = LENS_TEMPLATES[args.id]
    if (!tpl) {
      consola.error('Unknown template: %s', args.id)
      consola.info('Available: %s', Object.keys(LENS_TEMPLATES).join(', '))
      process.exitCode = 1; return
    }
    const { writeFileSync, existsSync } = await import('node:fs')
    const outPath = args.output || `./${args.id}.md`
    if (existsSync(outPath)) {
      consola.warn('%s already exists — skipping. Use --output to specify a different path.', outPath)
      process.exitCode = 1; return
    }
    writeFileSync(outPath, tpl.body, 'utf-8')
    consola.success('Lens scaffolded at %s', outPath)
    consola.info('Edit the template, then: lf lens create --title "<title>" --from-file %s', outPath)
  },
})

const lensTemplate = defineCommand({
  meta: { name: 'template', description: 'Scaffold a new lens from a bundled template.' },
  subCommands: {
    list: lensTemplateList,
    use:  lensTemplateUse,
  },
})

const lifecycleCommand = (action: Parameters<typeof makeLifecycleCommand>[1], description: string) =>
  makeLifecycleCommand('lens', action, description, 'Lens UUID')

// ---------------------------------------------------------------------------
// Root command
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'lens',
    description: 'Manage lenses: create, versions, resources.',
  },
  subCommands: {
    create: lensCreate,
    version,
    resource,
    import: lensImport,
    template: lensTemplate,
    status: lifecycleCommand('status', 'Show lifecycle state, pinned state, and dependency blockers for a lens.'),
    archive: lifecycleCommand('archive', 'Archive a lens without breaking historical executions or battles.'),
    restore: lifecycleCommand('restore', 'Restore an archived or tombstoned lens when policy allows it.'),
    delete: lifecycleCommand('delete', 'Request dependency-aware lens deletion; used lenses become tombstones.'),
    pin: lifecycleCommand('pin', 'Pin a lens to your saved artifacts.'),
    unpin: lifecycleCommand('unpin', 'Remove your saved pin from a lens.'),
  },
});
