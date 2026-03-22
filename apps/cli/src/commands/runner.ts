import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson } from '../utils/output';

const ADAPTER_TYPES = [
  'openai-agents',
  'langchain',
  'crewai',
  'mcp',
  'ollama',
  'http',
  'custom',
];

const connect = defineCommand({
  meta: {
    name: 'connect',
    description: 'Register a new runner.',
  },
  args: {
    name: {
      type: 'string',
      description: 'Runner display name',
      required: true,
    },
    type: {
      type: 'string',
      description: `Runner type: ${ADAPTER_TYPES.join(', ')}`,
      required: true,
    },
    config: {
      type: 'string',
      description: 'JSON config string or path to config file',
      default: '{}',
    },
  },
  async run({ args }) {
    if (!ADAPTER_TYPES.includes(args.type)) {
      consola.error(
        'Invalid runner type: %s. Must be one of: %s',
        args.type,
        ADAPTER_TYPES.join(', ')
      );
      process.exitCode = 1;
      return;
    }

    let config: Record<string, unknown>;
    try {
      config = JSON.parse(args.config);
    } catch {
      consola.error('Invalid JSON config: %s', args.config);
      process.exitCode = 1;
      return;
    }

    try {
      const runnerId = await callRpc<string>('fn_runner_register', {
        p_name: args.name,
        p_adapter_type: args.type,
        p_config: config,
      }, { requireAuth: true });
      consola.success('Runner registered: %s', runnerId);
    } catch (err) {
      handleError(err);
    }
  },
});

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List your registered runners.',
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
      const runners = await callRpc<
        Array<{
          id: string;
          name: string;
          adapter_type: string;
          is_active: boolean;
          created_at: string;
        }>
      >('fn_runner_list', {}, { requireAuth: true });

      if (args.json) {
        printJson(runners);
        return;
      }

      if (!Array.isArray(runners) || runners.length === 0) {
        consola.info('No runners registered.');
        return;
      }

      printTable(
        ['ID', 'Name', 'Type', 'Active', 'Created'],
        runners.map((a) => [
          a.id.substring(0, 8),
          a.name,
          a.adapter_type,
          a.is_active ? 'yes' : 'no',
          new Date(a.created_at).toLocaleDateString(),
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

const remove = defineCommand({
  meta: {
    name: 'remove',
    description: 'Deactivate a runner.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Runner UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_runner_remove', {
        p_adapter_id: args.id,
      }, { requireAuth: true });
      consola.success('Runner deactivated: %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

const view = defineCommand({
  meta: {
    name: 'view',
    description: 'Show full config and status for a registered runner.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Runner UUID',
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
      const runner = await callRpc<Record<string, unknown>>(
        'fn_runner_get',
        { p_adapter_id: args.id },
        { requireAuth: true }
      );

      if (!runner) {
        consola.warn('Runner not found: %s', args.id);
        return;
      }

      if (args.json) {
        printJson(runner);
        return;
      }

      consola.info('ID:      %s', runner.id);
      consola.info('Name:    %s', runner.name);
      consola.info('Type:    %s', runner.adapter_type);
      consola.info('Active:  %s', runner.is_active ? 'yes' : 'no');
      consola.info('Created: %s', runner.created_at);
      if (runner.config) {
        consola.info('Config:  %s', JSON.stringify(runner.config, null, 2));
      }
    } catch (err) {
      handleError(err);
    }
  },
});

const enable = defineCommand({
  meta: {
    name: 'enable',
    description: 'Re-activate a previously deactivated runner.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Runner UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_runner_enable', {
        p_adapter_id: args.id,
      }, { requireAuth: true });
      consola.success('Runner enabled: %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

const test = defineCommand({
  meta: {
    name: 'test',
    description: 'Send a probe to verify a runner is reachable.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Runner UUID',
      required: true,
    },
    prompt: {
      type: 'string',
      description: 'Probe message to send',
      default: 'Hello, are you available?',
    },
  },
  async run({ args }) {
    try {
      consola.start('Testing runner %s...', args.id);
      const result = await callRpc<Record<string, unknown>>(
        'fn_runner_probe',
        {
          p_adapter_id: args.id,
          p_prompt: args.prompt,
        },
        { requireAuth: true }
      );
      consola.success('Runner responded successfully.');
      if (result?.response) {
        consola.info('Response: %s', String(result.response).substring(0, 200));
      }
    } catch (err) {
      handleError(err);
    }
  },
});

const types = defineCommand({
  meta: {
    name: 'types',
    description: 'List all supported runner types with descriptions.',
  },
  async run() {
    printTable(
      ['Type', 'Description'],
      [
        ['openai-agents', 'OpenAI Agents SDK'],
        ['langchain',     'LangChain agent framework'],
        ['crewai',        'CrewAI multi-agent framework'],
        ['mcp',           'Model Context Protocol server'],
        ['ollama',        'Local Ollama model endpoint'],
        ['http',          'Generic HTTP endpoint adapter'],
        ['custom',        'Custom adapter implementation'],
      ]
    );
    consola.info("Note: 'agent' is deprecated terminology. Use 'runner' for all new configurations.");
  },
});

export default defineCommand({
  meta: {
    name: 'runner',
    description: 'Manage runners: connect, list, view, enable, remove, test, types.',
  },
  subCommands: {
    connect,
    list,
    view,
    enable,
    remove,
    test,
    types,
  },
});

// Deprecated alias — 'agent' command still works but emits a deprecation warning
// The main CLI registration handles aliasing via the 'agent' key in subCommands.
