import { defineCommand } from 'citty';
import consola from 'consola';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';
import { parseAutomationDocument } from '../utils/automation-objects';

// ---------------------------------------------------------------------------
// template create
// ---------------------------------------------------------------------------
const create = defineCommand({
  meta: {
    name: 'create',
    description: 'Save an existing battle as a reusable template.',
  },
  args: {
    'battle-id': {
      type: 'string',
      description: 'Battle UUID to save as a template',
      required: true,
    },
    title: {
      type: 'string',
      description: 'Template title',
      required: true,
    },
    description: {
      type: 'string',
      description: 'Template description',
      default: '',
    },
  },
  async run({ args }) {
    try {
      const templateId = await callRpc<string>('fn_templates_create_from_battle', {
        p_battle_id: args['battle-id'],
        p_title: args.title,
        p_description: args.description || null,
      }, { requireAuth: true });
      consola.success('Template created: %s', templateId);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// template list
// ---------------------------------------------------------------------------
const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List available battle templates.',
  },
  args: {
    limit: {
      type: 'string',
      description: 'Number of templates to list',
      default: '20',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const templates = await callRpc<Array<Record<string, unknown>>>(
        'fn_templates_list',
        { p_limit: parseInt(args.limit, 10) },
        { requireAuth: true }
      );

      if (!Array.isArray(templates) || templates.length === 0) {
        consola.info('No templates found.');
        return;
      }

      if (args.json) {
        printJson(templates);
        return;
      }

      printTable(
        ['ID', 'Title', 'Created'],
        templates.map((t) => [
          String(t.id || '-').substring(0, 8),
          truncate(String(t.title || 'Untitled'), 40),
          t.created_at ? new Date(String(t.created_at)).toLocaleDateString() : '-',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// template view
// ---------------------------------------------------------------------------
const view = defineCommand({
  meta: {
    name: 'view',
    description: 'Show template details and prompt.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Template UUID',
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
      const template = await callRpc<Record<string, unknown>>(
        'fn_templates_get',
        { p_template_id: args.id },
        { requireAuth: true }
      );

      if (!template) {
        consola.warn('Template not found: %s', args.id);
        return;
      }

      if (args.json) {
        printJson(template);
        return;
      }

      consola.info('ID:          %s', template.id);
      consola.info('Title:       %s', template.title);
      consola.info('Description: %s', template.description || '(none)');
      consola.info('');
      consola.info('Prompt:');
      consola.log(String(template.task_prompt || '(no prompt)'));
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// template delete
// ---------------------------------------------------------------------------
const deleteTemplate = defineCommand({
  meta: {
    name: 'delete',
    description: 'Delete a template.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Template UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_templates_delete', {
        p_template_id: args.id,
      }, { requireAuth: true });
      consola.success('Template deleted: %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// template apply
// ---------------------------------------------------------------------------
const apply = defineCommand({
  meta: {
    name: 'apply',
    description: 'Apply a template to create a new battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Template UUID',
      required: true,
    },
    title: {
      type: 'string',
      description: 'Title for the new battle',
      required: true,
    },
    slug: {
      type: 'string',
      description: 'URL-friendly slug for the new battle',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const battleId = await callRpc<string>('fn_battles_create_from_template', {
        p_template_id: args.id,
        p_title: args.title,
        p_slug: args.slug,
      }, { requireAuth: true });
      consola.success('Battle created from template: %s', battleId);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// template set-recurrence
// ---------------------------------------------------------------------------
const setRecurrence = defineCommand({
  meta: {
    name: 'set-recurrence',
    description: 'Set a recurrence rule on a template so battles are created automatically.',
  },
  args: {
    id:              { type: 'positional', description: 'Template UUID', required: true },
    recurrence:      { type: 'string', description: 'iCal RRULE (e.g. FREQ=DAILY, FREQ=WEEKLY)', required: true },
    'starts-at':     { type: 'string', description: 'ISO timestamp for first run (default: now)', default: '' },
    'auto-start-delay-hours': {
      type: 'string',
      description: 'Hours after template fires before battle execution_starts_at',
      default: '1',
    },
  },
  async run({ args }) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const { getEnv } = await import('../utils/env');
      const client = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

      const nextRunAt = args['starts-at']
        ? new Date(args['starts-at'] as string).toISOString()
        : new Date().toISOString();

      const { error } = await client
        .schema('battles')
        .from('templates')
        .update({
          recurrence_rule:        args.recurrence,
          next_run_at:            nextRunAt,
          auto_start_delay_hours: parseInt(args['auto-start-delay-hours'] as string, 10),
        })
        .eq('id', args.id);

      if (error) throw error;

      consola.success('Recurrence set on template %s.', args.id);
      consola.info('Rule:       %s', args.recurrence);
      consola.info('First run:  %s', nextRunAt);
      consola.info('Battles will be auto-dispatched hourly by fn_dispatch_recurring_battle_templates.');
    } catch (err) { handleError(err); }
  },
});

// ---------------------------------------------------------------------------
// template list-recurring
// ---------------------------------------------------------------------------
const listRecurring = defineCommand({
  meta: {
    name: 'list-recurring',
    description: 'List all templates with a recurrence rule.',
  },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const { getEnv } = await import('../utils/env');
      const client = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

      const { data, error } = await client
        .schema('battles')
        .from('templates')
        .select('id, title, recurrence_rule, next_run_at, auto_start_delay_hours')
        .not('recurrence_rule', 'is', null)
        .order('next_run_at', { ascending: true });

      if (error) throw error;

      if (args.json) { printJson(data ?? []); return; }

      if (!data || data.length === 0) {
        consola.info('No recurring templates. Use: lf template set-recurrence <id> --recurrence FREQ=DAILY');
        return;
      }

      printTable(
        ['ID', 'Title', 'Rule', 'Next Run At', 'Delay (h)'],
        (data as Array<Record<string, unknown>>).map((t) => [
          String(t['id']).slice(0, 8) + '…',
          truncate(String(t['title'] ?? ''), 30),
          String(t['recurrence_rule'] ?? ''),
          t['next_run_at'] ? new Date(t['next_run_at'] as string).toLocaleString() : '—',
          String(t['auto_start_delay_hours'] ?? 1),
        ])
      );
    } catch (err) { handleError(err); }
  },
});

// ---------------------------------------------------------------------------
// template submit — validate a community-contributed WORKFLOW.md template
// and emit the gh CLI command the user should paste to open a PR.
// ---------------------------------------------------------------------------
const submit = defineCommand({
  meta: {
    name: 'submit',
    description:
      'Validate a WORKFLOW.md template file and print a gh pr create command to submit it.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to the WORKFLOW.md template file',
      required: true,
    },
  },
  async run({ args }) {
    const filePath = resolve(process.cwd(), args.file);
    if (!existsSync(filePath)) {
      consola.error('File not found: %s', filePath);
      process.exitCode = 1;
      return;
    }

    const result = parseAutomationDocument(filePath);
    if (!result.ok) {
      consola.error('Template validation failed for %s', filePath);
      for (const issue of result.issues) {
        consola.error('  · [%s] %s: %s', issue.severity, issue.path, issue.message);
      }
      process.exitCode = 1;
      return;
    }

    const kind = result.document?.frontmatter.kind ?? 'workflow';
    if (kind !== 'workflow') {
      consola.warn(
        'Expected a WORKFLOW.md (kind=workflow) but got kind="%s". Submitting anyway.',
        kind
      );
    }

    const name = String(result.document?.frontmatter.name ?? 'unnamed-template');

    consola.success('Template %s passes validation.', filePath);
    consola.info('');
    consola.info('Open a pull request by running:');
    consola.info('');
    consola.info(
      '  gh pr create --fill --title "feat(templates): submit %s"',
      name
    );
    consola.info('');
    consola.info(
      'Stage the file first: git add %s && git commit -m "feat(templates): add %s"',
      args.file,
      name
    );
  },
});

// ---------------------------------------------------------------------------
// Root command
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'template',
    description: 'Manage battle templates: create, list, view, delete, apply, recurrence.',
  },
  subCommands: {
    create,
    list,
    view,
    delete: deleteTemplate,
    apply,
    submit,
    'set-recurrence': setRecurrence,
    'list-recurring': listRecurring,
  },
});
