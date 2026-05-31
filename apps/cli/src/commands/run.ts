import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, callRest, handleError } from '../utils/api';
import { printTable, printJson } from '../utils/output';
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

const TERMINAL_RUN_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out'])

async function pollRunUntilTerminal(
  runId: string,
  opts?: { intervalMs?: number; timeoutMs?: number }
): Promise<string> {
  const intervalMs = opts?.intervalMs ?? 2_000
  const timeoutMs = opts?.timeoutMs ?? 5 * 60 * 1_000
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
    const state = await callRpc<Record<string, unknown>>(
      'fn_get_workflow_run_state',
      { p_run_id: runId },
      { requireAuth: true }
    )
    const status = String(state?.status ?? '')
    if (TERMINAL_RUN_STATUSES.has(status)) return status
  }
  return 'timed_out'
}

const full = defineCommand({
  meta: {
    name: 'full',
    description: 'Run the full fetch → verify open → submit → vote → finalize battle flow.',
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
      description: 'Print all 6 steps without executing any RPC calls',
      default: false,
    },
  },
  async run({ args }) {
    const config = loadConfig();
    const adapterId = args.adapter || config.defaultAdapterId;

    if (args['dry-run']) {
      consola.info('[dry-run] Full autonomous flow for battle: %s', args.id);
      if (adapterId) consola.info('[dry-run] Adapter: %s', adapterId);
      consola.info('[dry-run] [step 1/6] Fetch battle and verify status is open');
      consola.info('[dry-run] [step 2/6] Join battle — get submission_id');
      consola.info('[dry-run] [step 3/6] Start workflow run and poll until terminal');
      consola.info('[dry-run] [step 4/6] Transition battle to voting');
      consola.info('[dry-run] [step 5/6] Cast vote');
      consola.info('[dry-run] [step 6/6] Finalize and publish results');
      return;
    }

    try {
      // Step 1: Fetch battle and verify open
      consola.info('[step 1/6] Fetching battle and verifying status...');
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );
      if (!battle) {
        consola.error('Battle %s not found or not public.', args.id);
        process.exitCode = 1;
        return;
      }
      if (battle.status !== 'open') {
        consola.error('[step 1/6] Battle is in %s status. Only open battles can run the full flow.', battle.status);
        process.exitCode = 1;
        return;
      }
      consola.success('[step 1/6] Battle verified: %s [open]', battle.title);

      // Step 2: Join battle
      consola.info('[step 2/6] Joining battle...');
      // fn_battles_join identifies the participant as an AI agent via p_agent_id;
      // the --adapter flag carries that agent/adapter UUID. (There is no p_adapter_id param.)
      const join = await callRpc<Record<string, unknown>>(
        'fn_battles_join',
        { p_battle_id: args.id, ...(adapterId ? { p_agent_id: adapterId } : {}) },
        { requireAuth: true }
      );
      const submissionId = String(join?.submission_id ?? join?.id ?? '');
      if (!submissionId) {
        consola.error('[step 2/6] fn_battles_join returned no submission_id.');
        process.exitCode = 1;
        return;
      }
      consola.success('[step 2/6] Joined — submission: %s', submissionId.slice(0, 8) + '…');

      // Step 3: Start workflow run and poll until terminal
      consola.info('[step 3/6] Starting workflow run...');
      const workflowId = String(battle.workflow_id ?? '');
      if (!workflowId) {
        consola.error('[step 3/6] Battle has no associated workflow_id.');
        process.exitCode = 1;
        return;
      }
      const runResult = await callRpc<Record<string, unknown>>(
        'fn_start_workflow_run',
        {
          p_workflow_id: workflowId,
          p_inputs: { submission_id: submissionId, battle_id: args.id },
        },
        { requireAuth: true }
      );
      const runId = String(runResult?.id ?? runResult?.run_id ?? '');
      if (!runId) {
        consola.error('[step 3/6] fn_start_workflow_run returned no run id.');
        process.exitCode = 1;
        return;
      }
      consola.info('[step 3/6] Run started: %s — polling for completion...', runId.slice(0, 8) + '…');
      const finalStatus = await pollRunUntilTerminal(runId);
      if (finalStatus !== 'completed') {
        consola.error('[step 3/6] Run ended with status: %s. Cannot proceed to voting.', finalStatus);
        process.exitCode = 1;
        return;
      }
      consola.success('[step 3/6] Run completed.');

      // Step 4: Start voting
      consola.info('[step 4/6] Transitioning battle to voting...');
      await callRpc(
        'fn_battles_start_voting',
        { p_battle_id: args.id },
        { requireAuth: true }
      );
      consola.success('[step 4/6] Battle moved to voting.');

      // Step 5: Cast vote
      consola.info('[step 5/6] Casting vote...');
      await callRpc(
        'fn_battles_cast_vote',
        { p_battle_id: args.id, p_submission_id: submissionId },
        { requireAuth: true }
      );
      consola.success('[step 5/6] Vote recorded.');

      // Step 6: Finalize
      consola.info('[step 6/6] Finalizing battle...');
      // Creator-checked wrapper; public.fn_battles_finalize is now service_role-only.
      await callRpc(
        'fn_mcp_battle_finalize',
        { p_battle_id: args.id },
        { requireAuth: true }
      );
      consola.success('[step 6/6] Battle finalized and results published.');
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
    description: 'Re-execute a completed workflow run with the same inputs against the current lens version.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Source workflow run UUID to replay',
      required: true,
    },
    adapter: {
      type: 'string',
      description: 'Override the agent adapter UUID for the replay run',
      default: '',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Print the inputs that would be replayed without starting a new run',
      default: false,
    },
  },
  async run({ args }) {
    try {
      // Fetch original run to get workflow_id and context_inputs
      const original = await callRpc<Record<string, unknown>>(
        'fn_get_workflow_run',
        { p_run_id: args.id },
        { requireAuth: true }
      );
      if (!original) {
        consola.error('Run %s not found.', args.id);
        process.exitCode = 1;
        return;
      }

      const workflowId = String(original.workflow_id ?? '');
      const contextInputs = (original.context_inputs ?? {}) as Record<string, unknown>;

      if (args['dry-run']) {
        consola.info('[dry-run] Would replay run: %s', args.id);
        consola.info('[dry-run] Workflow:        %s', workflowId || '(unknown)');
        consola.info('[dry-run] Context inputs:  %s', JSON.stringify(contextInputs).slice(0, 120));
        if (args.adapter) consola.info('[dry-run] Adapter override: %s', args.adapter);
        return;
      }

      if (args.adapter) {
        consola.warn('--adapter override is not supported by fn_start_workflow_run and will be ignored.');
      }

      const newRun = await callRpc<Record<string, unknown>>(
        'fn_start_workflow_run',
        {
          p_workflow_id: workflowId,
          p_inputs: contextInputs,
        },
        { requireAuth: true }
      );

      const newRunId = String(newRun?.id ?? newRun?.run_id ?? '');
      if (!newRunId) {
        consola.error('fn_start_workflow_run returned no run id.');
        process.exitCode = 1;
        return;
      }

      consola.success('Replay run started.');
      consola.info('New run:  %s', newRunId);
      consola.info('Parent:   %s', args.id);
      consola.info('Verify:   lf execution inspect %s', newRunId);
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
    'dry-run': {
      type: 'boolean',
      description: 'Print the resolved mode/model/prompt without contacting any provider',
      default: false,
    },
  },
  async run({ args }) {
    // ── Dry-run short-circuit ────────────────────────────────────────────────
    // Must run BEFORE provider/credential resolution so the smoke test can
    // validate config plumbing without any *_API_KEY env vars set.
    if (args['dry-run']) {
      const mode = args.ollama ? 'ollama' : args.byok ? `byok/${args.byok}` : 'cloud';
      consola.info('[dry-run] mode:   %s', mode);
      consola.info('[dry-run] model:  %s', args.model);
      consola.info('[dry-run] prompt: %s', args.prompt.slice(0, 80));
      if (args.system) consola.info('[dry-run] system: %s', args.system.slice(0, 80));
      return;
    }

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
          const nextStep =
            res.status === 404
              ? `\n\nNext step: pull the model first with \`ollama pull ${args.model}\`, then retry this command. Use \`ollama list\` to see installed models.`
              : '\n\nNext step: check that Ollama is running with `ollama serve` and verify the model name with `ollama list`.';
          throw new Error(`Ollama error ${res.status}: ${text}${nextStep}`);
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
          const { url: baseUrl, body, headers } = streamAdapter.buildStreamRequest(
            args.model,
            messages,
            { maxTokens: 4096 }
          );
          const authHeaders = streamAdapter.authHeader(apiKey);
          const url = streamAdapter.buildStreamUrl
            ? streamAdapter.buildStreamUrl(args.model, apiKey)
            : baseUrl;

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
          const { url: baseUrl, body, headers } = adapter.transformRequest(args.model, messages, { maxTokens: 4096 });
          const authHeaders = adapter.authHeader(apiKey);
          const url = adapter.buildUrl
            ? adapter.buildUrl(args.model, apiKey)
            : baseUrl;

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
// Shared: resolve ai_lenser_id from a @handle string
// ---------------------------------------------------------------------------
async function resolveAiLenserId(handle: string): Promise<string> {
  const rows = await callRest<Array<{ id: string }>>(
    'lensers',
    'profiles',
    'GET',
    undefined,
    {
      requireAuth: true,
      query: { select: 'id', handle: `eq.${handle}` },
    }
  )
  const profile = rows?.[0]
  if (!profile) throw new Error(`No profile found for handle @${handle}`)

  const agents = await callRest<Array<{ id: string }>>(
    'agents',
    'ai_lensers',
    'GET',
    undefined,
    {
      requireAuth: true,
      query: { select: 'id', profile_id: `eq.${profile.id}` },
    }
  )
  const agent = agents?.[0]
  if (!agent) throw new Error(`No AI agent found for @${handle}`)
  return agent.id
}

// Idempotent: create or get the run report for a given team_run_id.
async function getOrCreateRunReport(runId: string): Promise<string> {
  const result = await callRpc<{ id: string } | string>(
    'fn_create_run_report',
    { p_team_run_id: runId },
    { requireAuth: true }
  )
  if (typeof result === 'string') return result
  if (result && typeof result === 'object' && 'id' in result) return String(result['id'])
  throw new Error('fn_create_run_report returned unexpected shape.')
}

// ---------------------------------------------------------------------------
// run cancel
// ---------------------------------------------------------------------------
const cancel = defineCommand({
  meta: {
    name: 'cancel',
    description: 'Cancel an active run.',
  },
  args: {
    run_id: {
      type: 'positional',
      description: 'Team run UUID',
      required: true,
    },
    reason: {
      type: 'string',
      description: 'Optional cancellation reason',
      default: '',
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_cancel_run',
        {
          p_team_run_id: args.run_id,
          ...(args.reason ? { p_reason: args.reason } : {}),
        },
        { requireAuth: true }
      )
      consola.success('Run %s cancelled.', args.run_id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// run report
// ---------------------------------------------------------------------------
const report = defineCommand({
  meta: {
    name: 'report',
    description: 'Generate or retrieve the report for a run.',
  },
  args: {
    run_id: {
      type: 'positional',
      description: 'Team run UUID',
      required: true,
    },
    format: {
      type: 'string',
      description: 'Output format: table | json (default table)',
      default: 'table',
    },
  },
  async run({ args }) {
    if (args.format !== 'table' && args.format !== 'json') {
      consola.error('--format must be "table" or "json".')
      process.exitCode = 1
      return
    }
    try {
      const reportId = await getOrCreateRunReport(args.run_id)

      const rows = await callRest<Array<Record<string, unknown>>>(
        'agents',
        'run_reports',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: { select: '*', id: `eq.${reportId}` },
        }
      )
      const r = rows?.[0]
      if (!r) {
        consola.error('Run report %s not found.', reportId)
        process.exitCode = 1
        return
      }

      if (args.format === 'json') {
        printJson(r)
        return
      }

      printTable(
        ['Field', 'Value'],
        [
          ['title', String(r['title'] ?? '—')],
          ['outcome', String(r['outcome'] ?? '—')],
          ['total_steps', String(r['total_steps'] ?? '—')],
          ['total_cost_estimate', String(r['total_cost_estimate'] ?? '—')],
          ['evaluation_score', String(r['evaluation_score'] ?? '—')],
          ['created_at', r['created_at'] ? new Date(String(r['created_at'])).toLocaleString() : '—'],
        ]
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// run incidents
// ---------------------------------------------------------------------------
const incidents = defineCommand({
  meta: {
    name: 'incidents',
    description: 'List incidents for a run.',
  },
  args: {
    run_id: {
      type: 'positional',
      description: 'Team run UUID',
      required: true,
    },
    severity: {
      type: 'string',
      description: 'Filter by severity: low | medium | high | critical',
      default: '',
    },
  },
  async run({ args }) {
    const validSeverities = ['low', 'medium', 'high', 'critical']
    if (args.severity && !validSeverities.includes(args.severity)) {
      consola.error(
        'Invalid --severity "%s". Allowed: %s',
        args.severity,
        validSeverities.join(', ')
      )
      process.exitCode = 1
      return
    }
    try {
      const reportId = await getOrCreateRunReport(args.run_id)

      const query: Record<string, string | number | boolean> = {
        select: 'id,incident_type,severity,title,resolved_at',
        run_report_id: `eq.${reportId}`,
        order: 'severity.desc',
      }
      if (args.severity) query['severity'] = `eq.${args.severity}`

      const rows = await callRest<Array<Record<string, unknown>>>(
        'agents',
        'run_incidents',
        'GET',
        undefined,
        { requireAuth: true, query }
      )

      if (!rows || rows.length === 0) {
        consola.info('No incidents found for run %s.', args.run_id)
        return
      }

      printTable(
        ['Type', 'Severity', 'Title', 'Resolved'],
        rows.map((r) => [
          String(r['incident_type'] ?? '—'),
          String(r['severity'] ?? '—'),
          String(r['title'] ?? '—'),
          r['resolved_at'] ? new Date(String(r['resolved_at'])).toLocaleString() : 'open',
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// run policy-check
// ---------------------------------------------------------------------------
const policyCheck = defineCommand({
  meta: {
    name: 'policy-check',
    description: 'Evaluate pre-run policy for an agent.',
  },
  args: {
    handle: {
      type: 'positional',
      description: 'Agent handle (without @)',
      required: true,
    },
    'workflow-id': {
      type: 'string',
      description: 'Optional workflow UUID',
      default: '',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Skip RPC, just show current settings',
      default: false,
    },
  },
  async run({ args }) {
    if (args['dry-run']) {
      consola.info('[dry-run] Would evaluate pre-run policy for @%s', args.handle)
      if (args['workflow-id']) consola.info('[dry-run] Workflow: %s', args['workflow-id'])
      return
    }
    try {
      const aiLenserId = await resolveAiLenserId(args.handle)
      const result = await callRpc<Record<string, unknown>>(
        'fn_evaluate_pre_run_policy',
        {
          p_ai_lenser_id: aiLenserId,
          p_workflow_id: args['workflow-id'] || null,
          p_context: {},
        },
        { requireAuth: true }
      )
      const verdict = String(result?.['verdict'] ?? result?.['decision'] ?? '(unknown)')
      consola.info('Verdict: %s', verdict)
      if (result?.['reason']) consola.info('Reason:  %s', result['reason'])
    } catch (err) {
      handleError(err)
    }
  },
})

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
    cancel,
    report,
    incidents,
    'policy-check': policyCheck,
  },
});
