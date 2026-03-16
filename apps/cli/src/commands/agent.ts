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
    description: 'Register a new agent adapter.',
  },
  args: {
    name: {
      type: 'string',
      description: 'Adapter display name',
      required: true,
    },
    type: {
      type: 'string',
      description: `Adapter type: ${ADAPTER_TYPES.join(', ')}`,
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
        'Invalid adapter type: %s. Must be one of: %s',
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
      const adapterId = await callRpc<string>('fn_agent_adapters_register', {
        p_name: args.name,
        p_adapter_type: args.type,
        p_config: config,
      }, { requireAuth: true });
      consola.success('Agent adapter registered: %s', adapterId);
    } catch (err) {
      handleError(err);
    }
  },
});

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List your registered agent adapters.',
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
      const adapters = await callRpc<
        Array<{
          id: string;
          name: string;
          adapter_type: string;
          is_active: boolean;
          created_at: string;
        }>
      >('fn_agent_adapters_list', {}, { requireAuth: true });

      if (args.json) {
        printJson(adapters);
        return;
      }

      if (!Array.isArray(adapters) || adapters.length === 0) {
        consola.info('No agent adapters registered.');
        return;
      }

      printTable(
        ['ID', 'Name', 'Type', 'Active', 'Created'],
        adapters.map((a) => [
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
    description: 'Deactivate an agent adapter.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Adapter UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_agent_adapters_remove', {
        p_adapter_id: args.id,
      }, { requireAuth: true });
      consola.success('Agent adapter deactivated: %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

const view = defineCommand({
  meta: {
    name: 'view',
    description: 'Show full config and status for a registered adapter.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Adapter UUID',
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
      const adapter = await callRpc<Record<string, unknown>>(
        'fn_agent_adapters_get',
        { p_adapter_id: args.id },
        { requireAuth: true }
      );

      if (!adapter) {
        consola.warn('Adapter not found: %s', args.id);
        return;
      }

      if (args.json) {
        printJson(adapter);
        return;
      }

      consola.info('ID:      %s', adapter.id);
      consola.info('Name:    %s', adapter.name);
      consola.info('Type:    %s', adapter.adapter_type);
      consola.info('Active:  %s', adapter.is_active ? 'yes' : 'no');
      consola.info('Created: %s', adapter.created_at);
      if (adapter.config) {
        consola.info('Config:  %s', JSON.stringify(adapter.config, null, 2));
      }
    } catch (err) {
      handleError(err);
    }
  },
});

const enable = defineCommand({
  meta: {
    name: 'enable',
    description: 'Re-activate a previously deactivated adapter.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Adapter UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_agent_adapters_enable', {
        p_adapter_id: args.id,
      }, { requireAuth: true });
      consola.success('Agent adapter enabled: %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

const test = defineCommand({
  meta: {
    name: 'test',
    description: 'Send a probe prompt to verify an adapter is reachable.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Adapter UUID',
      required: true,
    },
    prompt: {
      type: 'string',
      description: 'Probe prompt to send',
      default: 'Hello, are you available?',
    },
  },
  async run({ args }) {
    try {
      consola.start('Testing adapter %s...', args.id);
      const result = await callRpc<Record<string, unknown>>(
        'fn_agent_adapters_probe',
        {
          p_adapter_id: args.id,
          p_prompt: args.prompt,
        },
        { requireAuth: true }
      );
      consola.success('Adapter responded successfully.');
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
    description: 'List all supported adapter types with descriptions.',
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
  },
});

export default defineCommand({
  meta: {
    name: 'agent',
    description: 'Manage agent adapters: connect, list, view, enable, remove, test, types.',
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
