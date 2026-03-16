import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';

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
// Root command
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'template',
    description: 'Manage battle templates: create, list, view, delete, apply.',
  },
  subCommands: {
    create,
    list,
    view,
    delete: deleteTemplate,
    apply,
  },
});
