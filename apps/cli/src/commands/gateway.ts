import { defineCommand } from 'citty';

import { callRpc, handleError } from '../utils/api';
import { printJson, printTable } from '../utils/output';

type CatalogModel = {
  provider_key: string;
  key: string;
  support_level: string;
};

function classifyRoute(providerKey: string, supportLevel: string): string {
  if (providerKey === 'ollama') return 'local';
  if (['openai', 'anthropic', 'google', 'mistral', 'fal', 'stability', 'elevenlabs', 'kling', 'suno'].includes(providerKey)) {
    return supportLevel === 'runnable' ? 'native-adapter' : 'byok';
  }
  if (supportLevel === 'byok_only') return 'byok';
  if (supportLevel === 'catalog_only') return 'catalog-only';
  return 'blocked';
}

export default defineCommand({
  meta: {
    name: 'gateway',
    description: 'Inspect gateway-style provider/model routing classes.',
  },
  args: {
    provider: { type: 'string', default: '', description: 'Provider key filter' },
    json: { type: 'boolean', default: false, description: 'Output JSON' },
  },
  async run({ args }) {
    try {
      const models = await callRpc<CatalogModel[]>(
        'fn_ai_catalog_models',
        {
          p_provider_key: args.provider || null,
          p_support_level: null,
          p_capability: null,
          p_modality: null,
        },
        { noAuth: true }
      );

      const rows = models.map((model) => ({
        model: `${model.provider_key}/${model.key}`,
        provider: model.provider_key,
        support_level: model.support_level,
        route: classifyRoute(model.provider_key, model.support_level),
      }));

      if (args.json) {
        printJson(rows);
        return;
      }

      printTable(
        ['Model', 'Provider', 'Support', 'Route'],
        rows.map((row) => [row.model, row.provider, row.support_level, row.route])
      );
    } catch (err) {
      handleError(err);
    }
  },
});
