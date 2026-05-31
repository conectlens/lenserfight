import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';

// ---------------------------------------------------------------------------
// rubric create
// ---------------------------------------------------------------------------
const create = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new rubric with one or more criteria.',
  },
  args: {
    title: {
      type: 'string',
      description: 'Rubric title',
      required: true,
    },
    description: {
      type: 'string',
      description: 'Rubric description',
      default: '',
    },
    criteria: {
      type: 'string',
      description: 'JSON array of criteria: [{"title":"...","weight":1}]',
      default: '[]',
    },
  },
  async run({ args }) {
    let criteriaData: unknown[];
    try {
      criteriaData = JSON.parse(args.criteria);
    } catch {
      consola.error('Invalid JSON for --criteria: %s', args.criteria);
      process.exitCode = 1;
      return;
    }

    try {
      const rubricId = await callRpc<string>('fn_rubrics_create', {
        p_title: args.title,
        p_description: args.description || null,
        p_criteria: criteriaData,
      }, { requireAuth: true });
      consola.success('Rubric created: %s', rubricId);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// rubric list
// ---------------------------------------------------------------------------
const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List available rubrics.',
  },
  args: {
    limit: {
      type: 'string',
      description: 'Number of rubrics to list',
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
      const rubrics = await callRpc<Array<Record<string, unknown>>>(
        'fn_rubrics_list',
        { p_limit: parseInt(args.limit, 10) },
        { requireAuth: true }
      );

      if (args.json) {
        printJson(Array.isArray(rubrics) ? rubrics : []);
        return;
      }

      if (!Array.isArray(rubrics) || rubrics.length === 0) {
        consola.info('No rubrics found.');
        return;
      }

      printTable(
        ['ID', 'Title', 'Criteria', 'Created'],
        rubrics.map((r) => [
          String(r.id || '-').substring(0, 8),
          truncate(String(r.title || 'Untitled'), 35),
          String(r.criteria_count ?? '-'),
          r.created_at ? new Date(String(r.created_at)).toLocaleDateString() : '-',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// rubric view
// ---------------------------------------------------------------------------
const view = defineCommand({
  meta: {
    name: 'view',
    description: 'Show rubric details and criteria.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Rubric UUID',
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
      const rubric = await callRpc<Record<string, unknown>>(
        'fn_rubrics_get',
        { p_rubric_id: args.id },
        { requireAuth: true }
      );

      if (!rubric) {
        consola.warn('Rubric not found: %s', args.id);
        return;
      }

      if (args.json) {
        printJson(rubric);
        return;
      }

      consola.info('ID:          %s', rubric.id);
      consola.info('Title:       %s', rubric.title);
      consola.info('Description: %s', rubric.description || '(none)');

      const criteria = rubric.criteria as Array<Record<string, unknown>> | undefined;
      if (criteria?.length) {
        consola.info('');
        consola.info('Criteria:');
        printTable(
          ['Title', 'Weight', 'Description'],
          criteria.map((c) => [
            String(c.title || '-'),
            String(c.weight ?? 1),
            truncate(String(c.description || ''), 40),
          ])
        );
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// rubric delete
// ---------------------------------------------------------------------------
const deleteRubric = defineCommand({
  meta: {
    name: 'delete',
    description: 'Delete a draft rubric.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Rubric UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_rubrics_delete', {
        p_rubric_id: args.id,
      }, { requireAuth: true });
      consola.success('Rubric deleted: %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// rubric attach
// ---------------------------------------------------------------------------
const attach = defineCommand({
  meta: {
    name: 'attach',
    description: 'Attach a rubric to an existing battle.',
  },
  args: {
    'rubric-id': {
      type: 'string',
      description: 'Rubric UUID',
      required: true,
    },
    'battle-id': {
      type: 'string',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_rubrics_attach_to_battle', {
        p_rubric_id: args['rubric-id'],
        p_battle_id: args['battle-id'],
      }, { requireAuth: true });
      consola.success('Rubric %s attached to battle %s', args['rubric-id'], args['battle-id']);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// rubric detach
// ---------------------------------------------------------------------------
const detach = defineCommand({
  meta: {
    name: 'detach',
    description: 'Remove a rubric from a battle.',
  },
  args: {
    'battle-id': {
      type: 'string',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_rubrics_detach_from_battle', {
        p_battle_id: args['battle-id'],
      }, { requireAuth: true });
      consola.success('Rubric detached from battle %s', args['battle-id']);
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
    name: 'rubric',
    description: 'Manage evaluation rubrics: create, list, view, delete, attach, detach.',
  },
  subCommands: {
    create,
    list,
    view,
    delete: deleteRubric,
    attach,
    detach,
  },
});
