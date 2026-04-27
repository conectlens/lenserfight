import { defineCommand } from 'citty';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { callRpc, handleError } from '../utils/api';
import { printJson, printSuccess, printTable, printWarn } from '../utils/output';

type ProviderRow = {
  key: string;
  support_level?: string | null;
  docs_url?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ModelRow = {
  provider_key: string;
  key: string;
  support_level: string;
  docs_url?: string | null;
  capabilities: string[];
  metadata?: Record<string, unknown> | null;
};

const ALLOWED_SUPPORT_LEVELS = new Set(['runnable', 'byok_only', 'catalog_only', 'deprecated']);
const ALLOWED_CAPABILITIES = new Set([
  'chat',
  'reasoning',
  'tools',
  'vision',
  'json_schema',
  'code',
  'text',
  'image',
  'document',
  'audio',
  'video',
  'text_generation',
  'image_generation',
  'video_generation',
  'audio_generation',
  'music_generation',
]);

export default defineCommand({
  meta: {
    name: 'ai',
    description: 'Validate AI catalog seed and RPC integrity.',
  },
  args: {
    json: { type: 'boolean', default: false, description: 'Output JSON' },
  },
  async run({ args }) {
    try {
      const providers = await callRpc<ProviderRow[]>('fn_ai_catalog_providers', {}, { noAuth: true });
      const models = await callRpc<ModelRow[]>(
        'fn_ai_catalog_models',
        {
          p_provider_key: null,
          p_support_level: null,
          p_capability: null,
          p_modality: null,
        },
        { noAuth: true }
      );

      const providerKeys = new Set(providers.map((provider) => provider.key));
      const issues: Array<{ scope: string; id: string; issue: string }> = [];

      for (const provider of providers) {
        if (!ALLOWED_SUPPORT_LEVELS.has(provider.support_level ?? '')) {
          issues.push({ scope: 'provider', id: provider.key, issue: 'invalid support_level' });
        }
        const sourceUrl = provider.metadata?.source_url ?? provider.docs_url ?? null;
        if (!sourceUrl) {
          issues.push({ scope: 'provider', id: provider.key, issue: 'missing source_url/docs_url' });
        }
      }

      for (const model of models) {
        if (!providerKeys.has(model.provider_key)) {
          issues.push({ scope: 'model', id: `${model.provider_key}/${model.key}`, issue: 'provider missing from catalog' });
        }
        if (!ALLOWED_SUPPORT_LEVELS.has(model.support_level)) {
          issues.push({ scope: 'model', id: `${model.provider_key}/${model.key}`, issue: 'invalid support_level' });
        }
        for (const capability of model.capabilities) {
          if (!ALLOWED_CAPABILITIES.has(capability)) {
            issues.push({ scope: 'model', id: `${model.provider_key}/${model.key}`, issue: `unknown capability: ${capability}` });
          }
        }
        const sourceUrl = model.metadata?.source_url ?? model.docs_url ?? null;
        if (!sourceUrl) {
          issues.push({ scope: 'model', id: `${model.provider_key}/${model.key}`, issue: 'missing source_url/docs_url' });
        }
      }

      const providerSeed = readFileSync(resolve(process.cwd(), 'supabase/seeds/04_ai_providers.sql'), 'utf-8');
      const modelSeed = readFileSync(resolve(process.cwd(), 'supabase/seeds/04b_ai_models.sql'), 'utf-8');
      if (!providerSeed.includes('support_level') || !modelSeed.includes('developer_summary')) {
        issues.push({ scope: 'seed', id: 'sql', issue: 'expected enriched catalog columns not found in seed files' });
      }

      const payload = {
        providers: providers.length,
        models: models.length,
        valid: issues.length === 0,
        issues,
      };

      if (args.json) {
        printJson(payload);
        process.exitCode = issues.length === 0 ? 0 : 1;
        return;
      }

      if (issues.length === 0) {
        printSuccess('AI catalog validation passed for %d providers and %d models.', providers.length, models.length);
        return;
      }

      printWarn('AI catalog validation found %d issue(s).', issues.length);
      printTable(
        ['Scope', 'ID', 'Issue'],
        issues.map((issue) => [issue.scope, issue.id, issue.issue])
      );
      process.exitCode = 1;
    } catch (err) {
      handleError(err);
    }
  },
});
