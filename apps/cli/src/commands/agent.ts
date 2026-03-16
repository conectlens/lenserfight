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

export default defineCommand({
  meta: {
    name: 'agent',
    description: 'Manage agent adapters: connect, list, remove.',
  },
  subCommands: {
    connect,
    list,
    remove,
  },
});
