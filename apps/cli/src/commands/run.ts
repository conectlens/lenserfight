import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { resolveConfig as loadConfig } from '../config/project-config';
import {
  getAdapter,
  getStreamAdapter,
  byokKeyResolver,
  OLLAMA_DEFAULT_BASE_URL,
  type Provider,
} from '@lenserfight/providers';

type TextProvider = Exclude<Provider, 'fal'>

// ---------------------------------------------------------------------------
// run submit
// ---------------------------------------------------------------------------
const submit = defineCommand({
  meta: {
    name: 'submit',
    description: 'Run only the submission step for a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    adapter: {
      type: 'string',
      description: 'Agent adapter UUID to use',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Show what would happen without executing',
      default: false,
    },
  },
  async run({ args }) {
    const config = loadConfig();
    const adapterId = args.adapter || config.defaultAdapterId;

    if (args['dry-run']) {
      consola.info('[dry-run] Would submit to battle: %s', args.id);
      if (adapterId) consola.info('[dry-run] Using adapter: %s', adapterId);
      return;
    }

    try {
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );

      if (!battle) {
        consola.error('Battle not found or not public.');
        process.exitCode = 1;
        return;
      }

      if (battle.status !== 'open') {
        consola.warn('Battle is in %s status. Only open battles accept submissions.', battle.status);
        process.exitCode = 1;
        return;
      }

      consola.info('Battle: %s [%s]', battle.title, battle.status);
      consola.info('Task:   %s', String(battle.task_prompt || '').substring(0, 120));

      if (adapterId) {
        consola.info('Agent adapter: %s', adapterId);
        consola.warn('Local agent execution is not yet implemented. Use `lenserfight battle submit` to submit manually.');
      } else {
        consola.info('No agent adapter specified. Use --adapter <id> or set defaultAdapterId in config.');
        consola.info('To submit manually: lenserfight battle submit %s --text "your response"', args.id);
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// run vote
// ---------------------------------------------------------------------------
const vote = defineCommand({
  meta: {
    name: 'vote',
    description: 'Run only the voting step using a specified adapter.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    adapter: {
      type: 'string',
      description: 'Agent adapter UUID to use for voting',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Show what would happen without executing',
      default: false,
    },
  },
  async run({ args }) {
    const config = loadConfig();
    const adapterId = args.adapter || config.defaultAdapterId;

    if (args['dry-run']) {
      consola.info('[dry-run] Would run voting step for battle: %s', args.id);
      if (adapterId) consola.info('[dry-run] Using adapter: %s', adapterId);
      return;
    }

    try {
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );

      if (!battle) {
        consola.error('Battle not found or not public.');
        process.exitCode = 1;
        return;
      }

      if (battle.status !== 'voting') {
        consola.warn('Battle is in %s status. Voting step requires voting status.', battle.status);
        consola.info('Use `lenserfight battle start-voting %s --closes-at <ISO timestamp>` first.', args.id);
        process.exitCode = 1;
        return;
      }

      consola.info('Battle: %s [%s]', battle.title, battle.status);

      if (adapterId) {
        consola.info('Agent adapter: %s', adapterId);
        consola.warn('Automated voting via adapter is not yet implemented. Use `lenserfight battle vote` to vote manually.');
      } else {
        consola.info('To vote manually: lenserfight battle vote %s --for contender_a --rationale "reason"', args.id);
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// run full
// ---------------------------------------------------------------------------
const full = defineCommand({
  meta: {
    name: 'full',
    description: 'Run the full create → open → submit → vote → finalize flow.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID to run end-to-end',
      required: true,
    },
    adapter: {
      type: 'string',
      description: 'Agent adapter UUID to use',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Show what would happen without executing',
      default: false,
    },
  },
  async run({ args }) {
    const config = loadConfig();
    const adapterId = args.adapter || config.defaultAdapterId;

    if (args['dry-run']) {
      consola.info('[dry-run] Would run full flow for battle: %s', args.id);
      if (adapterId) consola.info('[dry-run] Using adapter: %s', adapterId);
      consola.info('[dry-run] Steps: fetch → verify open → submit → start-voting → vote → finalize');
      return;
    }

    try {
      consola.start('Fetching battle %s...', args.id);
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );

      if (!battle) {
        consola.error('Battle not found or not public.');
        process.exitCode = 1;
        return;
      }

      consola.info('Battle: %s [%s]', battle.title, battle.status);

      if (battle.status !== 'open') {
        consola.warn('Battle is in %s status. Only open battles can be run.', battle.status);
        consola.info('Use `lenserfight battle open %s` to open a draft battle.', args.id);
        process.exitCode = 1;
        return;
      }

      consola.info('Task: %s', String(battle.task_prompt || '').substring(0, 120));

      if (adapterId) {
        consola.info('Agent adapter: %s', adapterId);
        consola.warn('Full automated flow is not yet implemented.');
      } else {
        consola.info('No agent adapter specified. Use --adapter <id> or set defaultAdapterId in config.');
      }

      consola.info(
        '\nTo complete this battle manually:\n' +
          '  lenserfight battle submit %s --text "your response"\n' +
          '  lenserfight battle start-voting %s --closes-at <ISO timestamp>\n' +
          '  lenserfight battle vote %s --for contender_a --rationale "reason"\n' +
          '  lenserfight battle finalize %s\n' +
          '  lenserfight battle publish %s',
        args.id, args.id, args.id, args.id, args.id
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// run replay
// ---------------------------------------------------------------------------
const replay = defineCommand({
  meta: {
    name: 'replay',
    description: 'Re-run a completed battle with a different adapter for comparison.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Source battle UUID to replay',
      required: true,
    },
    adapter: {
      type: 'string',
      description: 'Agent adapter UUID to use for the replay',
      required: true,
    },
    slug: {
      type: 'string',
      description: 'Slug for the replayed battle',
      required: true,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Show what would happen without executing',
      default: false,
    },
  },
  async run({ args }) {
    if (args['dry-run']) {
      consola.info('[dry-run] Would clone battle %s and re-run with adapter %s', args.id, args.adapter);
      return;
    }

    try {
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );

      if (!battle) {
        consola.error('Source battle not found or not public.');
        process.exitCode = 1;
        return;
      }

      consola.info('Source battle: %s [%s]', battle.title, battle.status);
      consola.info('Adapter:       %s', args.adapter);
      consola.warn('Automated replay is not yet implemented.');
      consola.info(
        'To replay manually:\n' +
          '  lenserfight battle clone %s --title "%s (replay)" --slug %s\n' +
          '  Then run the new battle with: lenserfight run full <new-id> --adapter %s',
        args.id, String(battle.title || 'Battle'), args.slug, args.adapter
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// run exec — three-mode prompt execution (Ollama / BYOK / Cloud)
// ---------------------------------------------------------------------------
//
// Modes:
//   --ollama [--base-url http://localhost:11434]   Local Ollama inference
//   --byok <provider> [--key <api-key>]            Bring Your Own Key (env var fallback)
//   --cloud (default)                              LenserFight wallet credits
//
// BYOK Security: the API key is NEVER stored — it is resolved transiently
// from --key flag or the corresponding env var (OPENAI_API_KEY, etc.) and
// is not included in any DB row, log, or error message.
// ---------------------------------------------------------------------------
const exec = defineCommand({
  meta: {
    name: 'exec',
    description: 'Execute a prompt against an AI model (Ollama / BYOK / Cloud).',
  },
  args: {
    prompt: {
      type: 'string',
      description: 'Prompt text to send to the model',
      required: true,
    },
    model: {
      type: 'string',
      description: 'Model key (e.g. gpt-4o, claude-sonnet-4-6, llama3.2)',
      required: true,
    },
    ollama: {
      type: 'boolean',
      description: 'Use local Ollama (localhost:11434)',
      default: false,
    },
    'base-url': {
      type: 'string',
      description: `Ollama base URL (default: ${OLLAMA_DEFAULT_BASE_URL})`,
      default: '',
    },
    byok: {
      type: 'string',
      description: 'Provider for BYOK mode (openai | anthropic | google | mistral)',
      default: '',
    },
    key: {
      type: 'string',
      description: 'API key for BYOK mode (falls back to PROVIDER_API_KEY env var)',
      default: '',
    },
    system: {
      type: 'string',
      description: 'Optional system message',
      default: '',
    },
    stream: {
      type: 'boolean',
      description: 'Stream the response token-by-token',
      default: true,
    },
  },
  async run({ args }) {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (args.system) messages.push({ role: 'system', content: args.system });
    messages.push({ role: 'user', content: args.prompt });

    // ── Ollama mode ──────────────────────────────────────────────────────────
    if (args.ollama) {
      consola.start('Running via Ollama (%s)…', args.model);
      try {
        const adapter = getAdapter('ollama');
        const baseUrl = args['base-url'] || OLLAMA_DEFAULT_BASE_URL;
        const { url: _defaultUrl, body, headers } = adapter.transformRequest(
          args.model,
          messages,
          { maxTokens: 4096 }
        );
        const url = `${baseUrl}/api/chat`;

        const res = await fetch(url, { method: 'POST', headers, body });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Ollama error ${res.status}: ${text}`);
        }
        const data = await res.json() as Record<string, unknown>;
        const reply = (data.message as Record<string, unknown>)?.content ?? '';
        consola.log('\n%s', reply);
      } catch (err) {
        handleError(err);
      }
      return;
    }

    // ── BYOK mode ────────────────────────────────────────────────────────────
    if (args.byok) {
      const provider = args.byok as TextProvider;
      const validProviders: TextProvider[] = ['openai', 'anthropic', 'google', 'mistral'];
      if (!validProviders.includes(provider)) {
        consola.error('Unknown BYOK provider: %s. Valid: %s', provider, validProviders.join(', '));
        process.exitCode = 1;
        return;
      }

      // Key resolution: CLI flag > env var. Key NEVER stored or logged.
      let apiKey: string;
      try {
        apiKey = byokKeyResolver.resolve(provider, { cliFlag: args.key || undefined });
      } catch (err) {
        consola.error((err as Error).message);
        process.exitCode = 1;
        return;
      }

      consola.start('Running via BYOK/%s (%s)…', provider, args.model);

      try {
        if (args.stream) {
          const streamAdapter = getStreamAdapter(provider);
          const { url, body, headers } = streamAdapter.buildStreamRequest(
            args.model,
            messages,
            { maxTokens: 4096 }
          );
          const authHeaders = streamAdapter.authHeader(apiKey);

          const res = await fetch(url, {
            method: 'POST',
            headers: { ...headers, ...authHeaders },
            body,
          });

          if (!res.ok || !res.body) {
            const text = await res.text();
            throw new Error(`Provider error ${res.status}: ${text}`);
          }

          process.stdout.write('\n');
          let eventType: string | undefined;
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('event: ')) { eventType = line.slice(7).trim(); continue; }
              if (!line.startsWith('data: ') && !line.trim()) continue;
              const chunk = streamAdapter.parseStreamChunk(line, eventType);
              if (chunk?.content) process.stdout.write(chunk.content);
              if (chunk?.done) break;
            }
          }
          process.stdout.write('\n');
        } else {
          const adapter = getAdapter(provider);
          const { url, body, headers } = adapter.transformRequest(args.model, messages, { maxTokens: 4096 });
          const authHeaders = adapter.authHeader(apiKey);

          const res = await fetch(url, {
            method: 'POST',
            headers: { ...headers, ...authHeaders },
            body,
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Provider error ${res.status}: ${text}`);
          }
          const data = await res.json();
          const result = adapter.transformResponse(data as never);
          consola.log('\n%s', result.content);
          consola.info('Tokens — in: %d, out: %d', result.usage.input_tokens, result.usage.output_tokens);
        }
      } catch (err) {
        handleError(err);
      }
      return;
    }

    // ── Cloud mode (default) ─────────────────────────────────────────────────
    consola.start('Running via LenserFight Cloud (%s)…', args.model);
    try {
      const config = loadConfig();
      if (!config.authToken) {
        consola.error('Cloud mode requires authentication. Run `lenserfight auth login` first.');
        process.exitCode = 1;
        return;
      }

      const result = await callRpc<Record<string, unknown>>(
        'fn_execution_run_prompt',
        {
          p_model_key: args.model,
          p_prompt: args.prompt,
          p_system: args.system || null,
        },
        { requireAuth: true }
      );

      consola.log('\n%s', String(result?.output ?? result?.content ?? ''));
      if (result?.token_input || result?.token_output) {
        consola.info('Tokens — in: %d, out: %d', result.token_input ?? 0, result.token_output ?? 0);
      }
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
    name: 'run',
    description: 'Orchestrate battle execution and prompt execution.',
  },
  subCommands: {
    submit,
    vote,
    full,
    replay,
    exec,
  },
});
