import { defineCommand } from 'citty';
import consola from 'consola';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { callRpc, handleError } from '../utils/api';
import { printJson, printSuccess, printTable, printWarn } from '../utils/output';

type ProviderRow = {
  id: string;
  key: string;
  display_name: string;
  base_url?: string | null;
  docs_url?: string | null;
  support_level?: string | null;
  logo_slug?: string | null;
  metadata?: Record<string, unknown> | null;
  is_active?: boolean;
};

type ModelRow = {
  provider_key: string;
  key: string;
  name: string;
};

function ask(question: string): Promise<string> {
  const rl = createInterface({ input, output });
  return rl.question(question).finally(() => rl.close());
}

async function listProviders(): Promise<ProviderRow[]> {
  return callRpc<ProviderRow[]>('fn_ai_catalog_providers', {}, { noAuth: true });
}

async function listModelsForProvider(providerKey: string): Promise<ModelRow[]> {
  return callRpc<ModelRow[]>(
    'fn_ai_catalog_models',
    {
      p_provider_key: providerKey,
      p_support_level: null,
      p_capability: null,
      p_modality: null,
    },
    { noAuth: true }
  );
}

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List catalog providers and their support tiers.',
  },
  args: {
    json: { type: 'boolean', default: false, description: 'Output JSON' },
  },
  async run({ args }) {
    try {
      const providers = await listProviders();

      if (args.json) {
        printJson(providers);
        return;
      }

      printTable(
        ['Provider', 'Key', 'Support', 'Configured', 'Docs'],
        providers.map((provider) => [
          provider.display_name,
          provider.key,
          provider.support_level ?? 'catalog_only',
          String(Boolean(provider.metadata?.auth_mode || provider.base_url)),
          provider.docs_url ?? '-',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

const show = defineCommand({
  meta: {
    name: 'show',
    description: 'Inspect one provider and list its models.',
  },
  args: {
    provider: { type: 'positional', required: true, description: 'Provider key' },
    json: { type: 'boolean', default: false, description: 'Output JSON' },
  },
  async run({ args }) {
    try {
      const providers = await listProviders();
      const provider = providers.find((entry) => entry.key === args.provider);
      if (!provider) {
        throw new Error(`Provider not found: ${args.provider}`);
      }

      const models = await listModelsForProvider(provider.key);

      if (args.json) {
        printJson({ provider, models });
        return;
      }

      consola.info('%s (%s)', provider.display_name, provider.key);
      consola.info('Support: %s', provider.support_level ?? 'catalog_only');
      consola.info('Docs: %s', provider.docs_url ?? 'n/a');
      consola.info('Base URL: %s', provider.base_url ?? 'n/a');
      consola.info('Models: %d', models.length);

      if (models.length > 0) {
        printTable(
          ['Model', 'Key'],
          models.slice(0, 20).map((model) => [model.name, model.key])
        );
      }
    } catch (err) {
      handleError(err);
    }
  },
});

const config = defineCommand({
  meta: {
    name: 'config',
    description: 'Prompt for a BYOK API key and store it in the platform vault.',
  },
  args: {
    provider: { type: 'positional', required: true, description: 'Provider key' },
    label: { type: 'string', default: '', description: 'Optional display label' },
    'from-env': {
      type: 'string',
      default: '',
      description: 'Environment variable to read instead of prompting',
    },
    'set-selected': {
      type: 'boolean',
      default: true,
      description: 'Update preferences.selected_api_key_id after storage',
    },
  },
  async run({ args }) {
    try {
      const provider = args.provider;
      if (provider === 'ollama') {
        printWarn('Ollama does not require a stored API key. Configure the local base URL instead.');
        return;
      }

      const rawKey = args['from-env']
        ? process.env[args['from-env']] ?? ''
        : await ask(`Enter API key for ${provider} (input is visible, will not be echoed in shell history): `);

      if (!rawKey || rawKey.trim().length < 8) {
        throw new Error('API key must be at least 8 characters.');
      }

      const keyId = await callRpc<string>(
        'fn_store_api_key',
        {
          p_provider: provider,
          p_label: args.label || null,
          p_raw_key: rawKey.trim(),
        },
        { requireAuth: true }
      );

      if (args['set-selected']) {
        await callRpc(
          'fn_lensers_update_preferences',
          {
            p_data: { selected_api_key_id: keyId },
          },
          { requireAuth: true }
        );
      }

      printSuccess('Stored %s provider key%s.', provider, args['set-selected'] ? ' and selected it' : '');
    } catch (err) {
      handleError(err);
    }
  },
});

const test = defineCommand({
  meta: {
    name: 'test',
    description: 'Resolve a provider smoke-test model and print the route class.',
  },
  args: {
    provider: { type: 'positional', required: true, description: 'Provider key' },
    json: { type: 'boolean', default: false, description: 'Output JSON' },
  },
  async run({ args }) {
    try {
      const models = await listModelsForProvider(args.provider);
      const smokeModel = models[0] ?? null;
      const payload = {
        provider: args.provider,
        smokeModel: smokeModel ? `${smokeModel.provider_key}/${smokeModel.key}` : null,
        route:
          args.provider === 'ollama'
            ? 'local'
            : ['openai', 'anthropic', 'google', 'mistral'].includes(args.provider)
              ? 'byok'
              : 'catalog-only',
      };

      if (args.json) {
        printJson(payload);
        return;
      }

      consola.info('Provider: %s', payload.provider);
      consola.info('Route: %s', payload.route);
      consola.info('Smoke model: %s', payload.smokeModel ?? 'none available');
    } catch (err) {
      handleError(err);
    }
  },
});

export default defineCommand({
  meta: {
    name: 'providers',
    description: 'List, inspect, configure, and test AI providers.',
  },
  subCommands: {
    list,
    show,
    config,
    test,
  },
});
