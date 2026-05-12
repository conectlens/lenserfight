import { defineCommand } from 'citty';
import consola from 'consola';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  byokKeyResolver,
  getAdapter,
  getStreamAdapter,
  OLLAMA_DEFAULT_BASE_URL,
  type Provider,
} from '@lenserfight/providers';

import { resolveConfig } from '../config/project-config';
import { callRpc, handleError } from '../utils/api';
import { printJson, printTable } from '../utils/output';

type TextProvider = Exclude<Provider, 'fal'>;

type CatalogModel = {
  id: string;
  provider_key: string;
  provider_name: string;
  key: string;
  name: string;
  description: string;
  support_level: string;
  status: string;
  capabilities: string[];
  input_modalities: string[];
  output_modalities: string[];
  context_window_tokens?: number | null;
  supports_tools: boolean;
  supports_json_schema: boolean;
  supports_vision: boolean;
  supports_streaming: boolean;
  use_cases: string[];
  developer_summary: string;
  user_summary: string;
  metadata?: Record<string, unknown> | null;
  is_active: boolean;
};

async function fetchModels(args: {
  provider?: string;
  capability?: string;
  supportLevel?: string;
  modality?: string;
}): Promise<CatalogModel[]> {
  return callRpc<CatalogModel[]>(
    'fn_ai_catalog_models',
    {
      p_provider_key: args.provider ?? null,
      p_support_level: args.supportLevel ?? null,
      p_capability: args.capability ?? null,
      p_modality: args.modality ?? null,
    },
    { noAuth: true }
  );
}

async function fetchModel(providerKey: string, modelKey: string): Promise<CatalogModel | null> {
  return callRpc<CatalogModel | null>(
    'fn_ai_catalog_model_detail',
    { p_provider_key: providerKey, p_model_key: modelKey },
    { noAuth: true }
  );
}

function parseModelRef(modelRef: string): { providerKey: string; modelKey: string } {
  const [providerKey, modelKey] = modelRef.split('/');
  if (!providerKey || !modelKey) {
    throw new Error('Model reference must be in the form <provider>/<model>.');
  }
  return { providerKey, modelKey };
}

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List catalog models with optional filters.',
  },
  args: {
    provider: { type: 'string', default: '', description: 'Provider key filter' },
    capability: { type: 'string', default: '', description: 'Capability filter' },
    modality: { type: 'string', default: '', description: 'Modality filter' },
    'support-level': { type: 'string', default: '', description: 'Support level filter' },
    json: { type: 'boolean', default: false, description: 'Output JSON' },
  },
  async run({ args }) {
    try {
      const models = await fetchModels({
        provider: args.provider || undefined,
        capability: args.capability || undefined,
        supportLevel: args['support-level'] || undefined,
        modality: args.modality || undefined,
      });

      if (args.json) {
        printJson(models);
        return;
      }

      printTable(
        ['Provider', 'Model', 'Support', 'Capabilities', 'Context'],
        models.map((model) => [
          model.provider_name,
          model.key,
          model.support_level,
          model.capabilities.slice(0, 3).join(', ') || '-',
          model.context_window_tokens ? model.context_window_tokens.toLocaleString() : '-',
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
    description: 'Show one catalog model in detail.',
  },
  args: {
    model: { type: 'positional', required: true, description: 'Model reference: provider/model' },
    json: { type: 'boolean', default: false, description: 'Output JSON' },
  },
  async run({ args }) {
    try {
      const { providerKey, modelKey } = parseModelRef(args.model);
      const model = await fetchModel(providerKey, modelKey);
      if (!model) throw new Error(`Model not found: ${args.model}`);

      if (args.json) {
        printJson(model);
        return;
      }

      consola.info('%s (%s)', model.name, `${model.provider_key}/${model.key}`);
      consola.info('Support: %s', model.support_level);
      consola.info('Status: %s', model.status);
      consola.info('Context: %s', model.context_window_tokens ?? 'n/a');
      consola.info('Capabilities: %s', model.capabilities.join(', ') || '-');
      consola.info('User summary: %s', model.user_summary || model.description);
      consola.info('Developer summary: %s', model.developer_summary || 'n/a');
    } catch (err) {
      handleError(err);
    }
  },
});

const capabilities = defineCommand({
  meta: {
    name: 'capabilities',
    description: 'Print a focused capabilities summary for one model.',
  },
  args: {
    model: { type: 'positional', required: true, description: 'Model reference: provider/model' },
    json: { type: 'boolean', default: false, description: 'Output JSON' },
  },
  async run({ args }) {
    try {
      const { providerKey, modelKey } = parseModelRef(args.model);
      const model = await fetchModel(providerKey, modelKey);
      if (!model) throw new Error(`Model not found: ${args.model}`);

      const payload = {
        model: `${model.provider_key}/${model.key}`,
        capabilities: model.capabilities,
        supports_tools: model.supports_tools,
        supports_json_schema: model.supports_json_schema,
        supports_vision: model.supports_vision,
        supports_streaming: model.supports_streaming,
        input_modalities: model.input_modalities,
        output_modalities: model.output_modalities,
      };

      if (args.json) {
        printJson(payload);
        return;
      }

      printTable(
        ['Field', 'Value'],
        [
          ['Model', payload.model],
          ['Capabilities', payload.capabilities.join(', ') || '-'],
          ['Streaming', String(payload.supports_streaming)],
          ['Tools', String(payload.supports_tools)],
          ['JSON schema', String(payload.supports_json_schema)],
          ['Vision', String(payload.supports_vision)],
          ['Input', payload.input_modalities.join(', ') || '-'],
          ['Output', payload.output_modalities.join(', ') || '-'],
        ]
      );
    } catch (err) {
      handleError(err);
    }
  },
});

const run = defineCommand({
  meta: {
    name: 'run',
    description: 'Execute a prompt against a catalog model when a local/BYOK route exists.',
  },
  args: {
    model: { type: 'positional', required: true, description: 'Model reference: provider/model' },
    prompt: { type: 'string', default: '', description: 'Prompt text' },
    system: { type: 'string', default: '', description: 'Optional system message' },
    'input-file': { type: 'string', default: '', description: 'Read prompt from file' },
    tool: { type: 'string', default: '', description: 'Optional tool name' },
    'tool-args': { type: 'string', default: '', description: 'Optional JSON schema for a tool' },
    stream: { type: 'boolean', default: true, description: 'Stream token output when supported' },
    json: { type: 'boolean', default: false, description: 'Output as JSON' },
  },
  async run({ args }) {
    try {
      const { providerKey, modelKey } = parseModelRef(args.model);
      const model = await fetchModel(providerKey, modelKey);
      if (!model) throw new Error(`Model not found: ${args.model}`);

      const prompt = args.prompt || (args['input-file'] ? readFileSync(resolve(process.cwd(), args['input-file']), 'utf-8') : '');
      if (!prompt.trim()) throw new Error('Provide --prompt or --input-file.');

      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
      if (args.system) messages.push({ role: 'system', content: args.system });
      messages.push({ role: 'user', content: prompt });

      const tools = args.tool
        ? [
            {
              name: args.tool,
              description: 'CLI-injected tool',
              parameters: args['tool-args'] ? JSON.parse(args['tool-args']) : {},
            },
          ]
        : undefined;

      if (providerKey === 'ollama') {
        const adapter = getAdapter('ollama');
        const baseUrl = resolveConfig().ollamaBaseUrl || OLLAMA_DEFAULT_BASE_URL;
        const { body, headers } = adapter.transformRequest(modelKey, messages, {
          maxTokens: 4096,
          tools,
        });
        const res = await fetch(`${baseUrl}/api/chat`, { method: 'POST', headers, body });
        if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
        const data = (await res.json()) as Record<string, unknown>;
        const reply = String(((data.message as Record<string, unknown> | undefined)?.content as string | undefined) ?? '');
        if (args.json) {
          printJson({ provider: providerKey, model: modelKey, content: reply });
        } else {
          consola.log('\n%s', reply);
        }
        return;
      }

      const runnableByok: TextProvider[] = ['openai', 'anthropic', 'google', 'mistral'];
      if (!runnableByok.includes(providerKey as TextProvider)) {
        throw new Error(`No direct CLI execution route for provider '${providerKey}'. Use gateway:routes to inspect support.`);
      }

      const apiKey = byokKeyResolver.resolve(providerKey);

      if (args.stream && model.supports_streaming) {
        const streamAdapter = getStreamAdapter(providerKey as TextProvider);
        const { url: baseUrl, body, headers } = streamAdapter.buildStreamRequest(modelKey, messages, {
          maxTokens: 4096,
          tools,
        });
        const authHeaders = streamAdapter.authHeader(apiKey);
        const url = streamAdapter.buildStreamUrl
          ? streamAdapter.buildStreamUrl(modelKey, apiKey)
          : baseUrl;
        const res = await fetch(url, {
          method: 'POST',
          headers: { ...headers, ...authHeaders },
          body,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Provider error ${res.status}: ${await res.text()}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let eventType: string | undefined;
        process.stdout.write('\n');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
              continue;
            }
            if (!line.startsWith('data: ') && !line.trim()) continue;
            const chunk = streamAdapter.parseStreamChunk(line, eventType);
            if (chunk?.content) process.stdout.write(chunk.content);
          }
        }
        process.stdout.write('\n');
        return;
      }

      const adapter = getAdapter(providerKey as TextProvider);
      const { url, body, headers } = adapter.transformRequest(modelKey, messages, {
        maxTokens: 4096,
        tools,
      });
      const authHeaders = adapter.authHeader(apiKey);
      const res = await fetch(url, {
        method: 'POST',
        headers: { ...headers, ...authHeaders },
        body,
      });
      if (!res.ok) throw new Error(`Provider error ${res.status}: ${await res.text()}`);
      const result = adapter.transformResponse((await res.json()) as never);

      if (args.json) {
        printJson(result);
        return;
      }

      consola.log('\n%s', result.content);
      consola.info('Tokens — in: %d, out: %d', result.usage.input_tokens, result.usage.output_tokens);
    } catch (err) {
      handleError(err);
    }
  },
});

export default defineCommand({
  meta: {
    name: 'models',
    description: 'List, inspect, and run AI models.',
  },
  subCommands: {
    list,
    show,
    capabilities,
    run,
  },
});
