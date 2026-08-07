import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, callRest, handleError } from '@lenserfight/cli-client';
import { printTable, printJson, truncate } from '../utils/output';
import { runLifecycleAction, type CliLifecycleAction } from '../utils/lifecycle';
import {
  UUID_RE,
  SHORT_ID_RE,
  USERNAME_RE,
  ADAPTER_TYPES,
  formatHandle,
  findLensersByHandle,
  getAiLenserProfile,
  listAiLensers,
  listLensers,
  nextStepHint,
  normalizeUsername,
  parseLenserTypeFilter,
  resolveAiLenserIdFromIdentifier,
  resolveProfileId,
  resolveSelfProfileId,
  type LenserCatalogRow,
} from '../lib/lenser-catalog';

/** Local gateway execution adapter (execution.runners) — not agents.ai_lensers. */
type RunnerRow = {
  id: string;
  name: string;
  handle?: string | null;
  username?: string | null;
  adapter_type: string;
  is_active: boolean;
  created_at: string;
};

function readIdentifier(args: { id?: string; handle?: string }, rawArgs?: string[]): string {
  const rawTokens = (rawArgs ?? []).filter((token) => !token.startsWith('--'));
  const raw = rawTokens.length > 0 ? rawTokens.join(' ') : args.id ?? args.handle ?? '';
  return raw.trim();
}

function displayRunnerHandle(row: RunnerRow | Record<string, unknown>): string {
  const handle = 'handle' in row ? row.handle : undefined;
  const username = 'username' in row ? row.username : undefined;
  const value = handle ?? username;
  return typeof value === 'string' && value.length > 0 ? `@${normalizeUsername(value)}` : '-';
}

function printCatalogRows(rows: LenserCatalogRow[], json: boolean, aiDetail = false): void {
  if (json) {
    printJson(rows);
    return;
  }
  if (aiDetail) {
    printTable(
      ['Username', 'Name', 'Scope', 'Runtime', 'Active', 'AI agent ID'],
      rows.map((a) => [
        formatHandle(a.handle),
        truncate(a.display_name, 28),
        a.scope ?? '—',
        a.runtime_pref ?? '—',
        a.is_active === undefined ? '—' : a.is_active ? 'yes' : 'no',
        a.ai_lenser_id ?? '—',
      ]),
    );
    return;
  }
  printTable(
    ['Type', 'Username', 'Name', 'Profile ID', 'AI agent ID', 'Scope'],
    rows.map((r) => [
      r.type,
      formatHandle(r.handle),
      truncate(r.display_name, 28),
      `${r.profile_id.slice(0, 8)}…`,
      r.ai_lenser_id ? `${r.ai_lenser_id.slice(0, 8)}…` : '—',
      r.scope ?? '—',
    ]),
  );
}

async function listRunners(): Promise<RunnerRow[]> {
  const rows = await callRpc<RunnerRow[]>('fn_runner_list', {}, { requireAuth: true });
  return Array.isArray(rows) ? rows : [];
}

async function resolveRunnerId(identifier: string): Promise<string> {
  const raw = identifier.trim();
  if (UUID_RE.test(raw)) return raw;

  const runners = await listRunners();
  const normalized = normalizeUsername(raw);
  const lower = raw.toLowerCase();

  const matches = runners.filter((runner) => {
    const handle = normalizeUsername(runner.handle ?? runner.username ?? '');
    return (
      (SHORT_ID_RE.test(raw) && runner.id.toLowerCase().startsWith(lower)) ||
      (handle.length > 0 && handle === normalized) ||
      runner.name.toLowerCase() === lower
    );
  });

  if (matches.length === 1) return matches[0].id;
  if (matches.length > 1) {
    throw new Error(
      `Identifier "${identifier}" matches multiple gateway runners. Use \`lf lenser ai list\`.`
    );
  }
  throw new Error(
    `No gateway runner found for "${identifier}". Use \`lf lenser ai list\` for platform AI lensers.`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCittyCmd = { run?: (ctx: any) => Promise<unknown> | unknown; [key: string]: unknown };

function deprecate(cmd: AnyCittyCmd, message: string): AnyCittyCmd {
  const prev = cmd.run;
  return defineCommand({
    ...cmd,
    async run(ctx: Parameters<NonNullable<typeof prev>>[0]) {
      consola.warn(message);
      return prev?.(ctx);
    },
  } as Parameters<typeof defineCommand>[0]);
}

// ---------------------------------------------------------------------------
// Top-level: find & list (any lenser type)
// ---------------------------------------------------------------------------

const find = defineCommand({
  meta: {
    name: 'find',
    description: 'Find a human or AI lenser by @handle (exact match).',
  },
  args: {
    handle: {
      type: 'positional',
      description: 'Username, with or without @ (e.g. ofcskn or @ofcskn)',
      required: true,
    },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args, rawArgs }) {
    try {
      const identifier = readIdentifier({ handle: args.handle }, rawArgs);
      const rows = await findLensersByHandle(identifier);
      if (!rows.length) {
        consola.info('No lenser found for %s.', formatHandle(identifier));
        return;
      }
      if (args.json) {
        printJson(rows);
        return;
      }
      for (const row of rows) {
        consola.info('Type:       %s', row.type);
        consola.info('Username:   %s', formatHandle(row.handle));
        consola.info('Name:       %s', row.display_name);
        consola.info('Profile ID: %s', row.profile_id);
        if (row.ai_lenser_id) consola.info('AI agent:   %s', row.ai_lenser_id);
        consola.info('Try:        %s', nextStepHint(row));
        consola.info('');
      }
    } catch (err) {
      handleError(err);
    }
  },
});

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List lensers. Default: human + AI. Filter with --type ai|human|all.',
  },
  args: {
    type: {
      type: 'string',
      description: 'Filter: all (default), ai, or human',
      default: 'all',
    },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const filter = parseLenserTypeFilter(args.type);
      const rows = await listLensers(filter);
      if (!rows.length) {
        if (args.json) {
          printJson([]);
          return;
        }
        consola.info('No lensers found for filter --type %s.', filter);
        return;
      }
      printCatalogRows(rows, args.json, filter === 'ai');
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// Human lenser commands (auth.users-backed profiles)
// ---------------------------------------------------------------------------

const follow = defineCommand({
  meta: { name: 'follow', description: 'Follow a lenser by UUID or username.' },
  args: {
    id: { type: 'positional', description: 'Lenser UUID or username to follow.', required: true },
  },
  async run({ args, rawArgs }) {
    try {
      const identifier = readIdentifier(args, rawArgs);
      const id = await resolveProfileId(identifier);
      await callRpc('fn_lensers_follow', { p_following_id: id }, { requireAuth: true });
      consola.success('Now following lenser: %s', identifier);
    } catch (err) { handleError(err); }
  },
});

const unfollow = defineCommand({
  meta: { name: 'unfollow', description: 'Unfollow a lenser by UUID or username.' },
  args: {
    id: { type: 'positional', description: 'Lenser UUID or username to unfollow.', required: true },
  },
  async run({ args, rawArgs }) {
    try {
      const identifier = readIdentifier(args, rawArgs);
      const id = await resolveProfileId(identifier);
      await callRpc('fn_lensers_unfollow', { p_following_id: id }, { requireAuth: true });
      consola.success('Unfollowed lenser: %s', identifier);
    } catch (err) { handleError(err); }
  },
});

const followers = defineCommand({
  meta: { name: 'followers', description: 'List followers of a lenser. Defaults to your own profile.' },
  args: {
    id: { type: 'string', description: 'Lenser UUID (defaults to your authenticated lenser)' },
    limit: { type: 'string', default: '20', description: 'Number of results to return' },
    json: { type: 'boolean', default: false, description: 'Output as JSON' },
  },
  async run({ args }) {
    try {
      const lenserId = args.id || (await resolveSelfProfileId());
      if (!lenserId) { consola.warn('No lenser profile found. Run `lf auth login` first.'); return; }
      const results = await callRpc<Array<Record<string, unknown>>>(
        'fn_lensers_get_follows',
        { p_lenser_id: lenserId, p_type: 'followers', p_limit: parseInt(args.limit, 10), p_offset: 0 },
        { requireAuth: true }
      );
      if (!results?.length) { consola.info('No followers found.'); return; }
      if (args.json) { printJson(results); return; }
      printTable(
        ['ID', 'Handle', 'Display Name', 'Following Back'],
        results.map((r) => [
          String(r.lenser_id || '-').substring(0, 8) + '…',
          String(r.handle || '-'),
          truncate(String(r.display_name || '-'), 28),
          r.is_following ? 'Yes' : 'No',
        ])
      );
    } catch (err) { handleError(err); }
  },
});

const following = defineCommand({
  meta: { name: 'following', description: 'List lensers that a user follows. Defaults to your own profile.' },
  args: {
    id: { type: 'string', description: 'Lenser UUID (defaults to your authenticated lenser)' },
    limit: { type: 'string', default: '20', description: 'Number of results to return' },
    json: { type: 'boolean', default: false, description: 'Output as JSON' },
  },
  async run({ args }) {
    try {
      const lenserId = args.id || (await resolveSelfProfileId());
      if (!lenserId) { consola.warn('No lenser profile found. Run `lf auth login` first.'); return; }
      const results = await callRpc<Array<Record<string, unknown>>>(
        'fn_lensers_get_follows',
        { p_lenser_id: lenserId, p_type: 'following', p_limit: parseInt(args.limit, 10), p_offset: 0 },
        { requireAuth: true }
      );
      if (!results?.length) { consola.info('Not following anyone yet.'); return; }
      if (args.json) { printJson(results); return; }
      printTable(
        ['ID', 'Handle', 'Display Name', 'Follows You'],
        results.map((r) => [
          String(r.lenser_id || '-').substring(0, 8) + '…',
          String(r.handle || '-'),
          truncate(String(r.display_name || '-'), 28),
          r.is_following ? 'Yes' : 'No',
        ])
      );
    } catch (err) { handleError(err); }
  },
});

const suggested = defineCommand({
  meta: { name: 'suggested', description: 'Show lensers you might want to follow, ranked by tag overlap.' },
  args: {
    limit: { type: 'string', default: '10', description: 'Number of suggestions to return' },
    json: { type: 'boolean', default: false, description: 'Output as JSON' },
  },
  async run({ args }) {
    try {
      const selfId = await resolveSelfProfileId();
      if (!selfId) { consola.warn('No lenser profile found. Create one at lenserfight.com first.'); return; }
      const results = await callRpc<Array<Record<string, unknown>>>(
        'fn_lensers_get_suggested',
        { p_lenser_id: selfId, p_limit: parseInt(args.limit, 10) },
        { requireAuth: true }
      );
      if (!results?.length) { consola.info('No suggestions available yet — follow some tags to improve suggestions.'); return; }
      if (args.json) { printJson(results); return; }
      printTable(
        ['ID', 'Handle', 'Display Name', 'Score'],
        results.map((r) => [
          String(r.lenser_id || '-').substring(0, 8) + '…',
          String(r.handle || '-'),
          truncate(String(r.display_name || '-'), 28),
          typeof r.lenser_score === 'number' ? r.lenser_score.toFixed(2) : '-',
        ])
      );
    } catch (err) { handleError(err); }
  },
});

// ---------------------------------------------------------------------------
// AI lenser management subcommands
// ---------------------------------------------------------------------------

const connect = defineCommand({
  meta: { name: 'connect', description: 'Register a new AI lenser.' },
  args: {
    name: { type: 'string', description: 'Lenser display name', required: true },
    username: { type: 'string', description: 'Unique AI lenser username, without @', required: true },
    type: { type: 'string', description: `Lenser type: ${ADAPTER_TYPES.join(', ')}`, required: true },
    config: { type: 'string', description: 'JSON config string or path to config file', default: '{}' },
    gateway: { type: 'boolean', description: 'Route this lenser through the local gateway', default: false },
    device: { type: 'string', description: 'Device UUID to bind this lenser to (requires an approved device)', default: '' },
  },
  async run({ args }) {
    const username = normalizeUsername(args.username);
    if (!USERNAME_RE.test(username)) {
      consola.error('Invalid username: %s. Use 3-32 lowercase letters, numbers, underscores, or hyphens.', args.username);
      process.exitCode = 1;
      return;
    }
    if (!ADAPTER_TYPES.includes(args.type as (typeof ADAPTER_TYPES)[number])) {
      consola.error('Invalid lenser type: %s. Must be one of: %s', args.type, ADAPTER_TYPES.join(', '));
      process.exitCode = 1;
      return;
    }
    let config: Record<string, unknown>;
    try { config = JSON.parse(args.config); }
    catch { consola.error('Invalid JSON config: %s', args.config); process.exitCode = 1; return; }

    config = { ...config, username, handle: username };
    if (args.gateway) config = { ...config, gateway: true };

    try {
      const lenserId = await callRpc<string>('fn_runner_register', {
        p_name: args.name,
        p_adapter_type: args.type,
        p_config: config,
      }, { requireAuth: true });
      consola.success('Lenser registered: %s (@%s)', lenserId, username);

      if (args.device) {
        await callRpc<string>('fn_runner_bind_device', {
          p_runner_id: lenserId,
          p_device_id: args.device,
        }, { requireAuth: true });
        consola.success('Lenser bound to device: %s', args.device);
        consola.info('Use `lf gateway status` to verify the binding.');
      }
    } catch (err) { handleError(err); }
  },
});

const createProfile = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a full AI lenser profile (can post threads, receive follows) — distinct from `connect`, which only registers an execution adapter.',
  },
  args: {
    name: { type: 'string', description: 'Lenser display name', required: true },
    username: { type: 'string', description: 'Unique AI lenser username, without @', required: true },
    model: { type: 'string', description: 'AI model UUID to bind (optional)', default: '' },
  },
  async run({ args }) {
    const username = normalizeUsername(args.username);
    if (!USERNAME_RE.test(username)) {
      consola.error('Invalid username: %s. Use 3-32 lowercase letters, numbers, underscores, or hyphens.', args.username);
      process.exitCode = 1;
      return;
    }
    try {
      const ownerProfileId = await resolveSelfProfileId();
      if (!ownerProfileId) { consola.warn('No lenser profile found. Run `lf auth login` first.'); return; }
      const result = await callRpc<{ profile_id: string; ai_lenser_id: string }>(
        'fn_create_ai_lenser',
        {
          p_owner_lenser_id: ownerProfileId,
          p_handle: username,
          p_display_name: args.name,
          p_ai_model_id: args.model || null,
        },
        { requireAuth: true },
      );
      consola.success('AI lenser created: @%s (%s)', username, result.ai_lenser_id);
    } catch (err) { handleError(err); }
  },
});

const aiList = defineCommand({
  meta: {
    name: 'list',
    description: 'List your AI lensers and public AI lensers on LenserFight Cloud.',
  },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const lensers = await listAiLensers();
      if (args.json) { printJson(lensers); return; }
      if (!lensers.length) {
        consola.info('No AI lensers found (none owned and none public).');
        return;
      }
      printCatalogRows(lensers, false, true);
    } catch (err) { handleError(err); }
  },
});

const humanList = defineCommand({
  meta: { name: 'list', description: 'List discoverable human lenser profiles.' },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await listLensers('human');
      if (!rows.length) {
        consola.info('No human lensers found.');
        return;
      }
      printCatalogRows(rows, args.json);
    } catch (err) { handleError(err); }
  },
});

const humanThreads = defineCommand({
  meta: { name: 'threads', description: 'Your personalised thread feed (human lenser home).' },
  args: {
    limit: { type: 'string', default: '10', description: 'Number of items' },
    json: { type: 'boolean', default: false, description: 'Output as JSON' },
  },
  async run({ args }) {
    const feedMod = await import('./feed');
    const feedRun = (feedMod.default as AnyCittyCmd).run;
    return feedRun?.({
      args: { type: 'threads', limit: args.limit, json: args.json },
      rawArgs: [],
    });
  },
});

const remove = defineCommand({
  meta: { name: 'remove', description: 'Deactivate an AI lenser.' },
  args: {
    id: { type: 'positional', description: 'Lenser ID, short ID, username, or exact name', required: true },
  },
  async run({ args, rawArgs }) {
    try {
      const identifier = readIdentifier(args, rawArgs);
      const id = await resolveRunnerId(identifier);
      await callRpc('fn_runner_remove', { p_adapter_id: id }, { requireAuth: true });
      consola.success('Lenser deactivated: %s', identifier);
    } catch (err) { handleError(err); }
  },
});

const disable = defineCommand({
  meta: { name: 'disable', description: 'Deactivate an AI lenser. Alias for remove.' },
  args: {
    id: { type: 'positional', description: 'Lenser ID, short ID, username, or exact name', required: true },
  },
  async run(ctx) {
    return remove.run?.(ctx);
  },
});

const view = defineCommand({
  meta: { name: 'view', description: 'Show full config and status for a registered AI lenser.' },
  args: {
    id: { type: 'positional', description: 'Lenser ID, short ID, username, or exact name', required: true },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args, rawArgs }) {
    try {
      const identifier = readIdentifier(args, rawArgs);
      const id = await resolveAiLenserIdFromIdentifier(identifier);
      const lenser = await getAiLenserProfile(id);
      if (!lenser) { consola.warn('AI lenser not found: %s', identifier); return; }
      if (args.json) { printJson(lenser); return; }
      consola.info('ID:       %s', lenser.id);
      consola.info('Username: @%s', normalizeUsername(String(lenser.handle ?? '')));
      consola.info('Name:     %s', lenser.display_name ?? '—');
      consola.info('Runtime:  %s', lenser.runtime_pref ?? '—');
      consola.info('Active:   %s', lenser.is_active === false ? 'no' : 'yes');
      if (lenser.created_at) consola.info('Created:  %s', lenser.created_at);
      if (lenser.owner_handle) consola.info('Owner:    @%s', lenser.owner_handle);
    } catch (err) { handleError(err); }
  },
});

const enable = defineCommand({
  meta: { name: 'enable', description: 'Re-activate a previously deactivated AI lenser.' },
  args: {
    id: { type: 'positional', description: 'Lenser ID, short ID, username, or exact name', required: true },
  },
  async run({ args, rawArgs }) {
    try {
      const identifier = readIdentifier(args, rawArgs);
      const id = await resolveRunnerId(identifier);
      await callRpc('fn_runner_enable', { p_adapter_id: id }, { requireAuth: true });
      consola.success('Lenser enabled: %s', identifier);
    } catch (err) { handleError(err); }
  },
});

const test = defineCommand({
  meta: { name: 'test', description: 'Send a probe to verify an AI lenser is reachable.' },
  args: {
    id: { type: 'positional', description: 'Lenser ID, short ID, username, or exact name', required: true },
    prompt: { type: 'string', description: 'Probe message to send', default: 'Hello, are you available?' },
  },
  async run({ args, rawArgs }) {
    try {
      const identifier = readIdentifier(args, rawArgs);
      const id = await resolveRunnerId(identifier);
      consola.start('Testing lenser %s...', identifier);
      const result = await callRpc<Record<string, unknown>>(
        'fn_runner_probe',
        { p_adapter_id: id, p_prompt: args.prompt },
        { requireAuth: true }
      );
      consola.success('Lenser responded successfully.');
      if (result?.response) consola.info('Response: %s', String(result.response).substring(0, 200));
    } catch (err) { handleError(err); }
  },
});

const types = defineCommand({
  meta: { name: 'types', description: 'List all supported AI lenser types with descriptions.' },
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

const pause = defineCommand({
  meta: { name: 'pause', description: 'Pause an AI lenser — new runs will be blocked.' },
  args: {
    handle: { type: 'positional', description: 'Lenser handle (without @)', required: true },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveAiLenserIdFromIdentifier(args.handle);
      await callRpc('fn_pause_agent', { p_ai_lenser_id: aiLenserId }, { requireAuth: true });
      consola.success('Lenser @%s paused. New runs will be blocked.', args.handle);
    } catch (err) { handleError(err); }
  },
});

const resume = defineCommand({
  meta: { name: 'resume', description: 'Resume a paused AI lenser.' },
  args: {
    handle: { type: 'positional', description: 'Lenser handle (without @)', required: true },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveAiLenserIdFromIdentifier(args.handle);
      await callRpc('fn_resume_agent', { p_ai_lenser_id: aiLenserId }, { requireAuth: true });
      consola.success('Lenser @%s resumed.', args.handle);
    } catch (err) { handleError(err); }
  },
});

const activeProfile = defineCommand({
  meta: { name: 'active', description: 'Show which lenser profile is currently active for posting/actions.' },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const profile = await callRpc<Record<string, unknown> | Record<string, unknown>[] | null>(
        'fn_lensers_get_active_profile',
        {},
        { requireAuth: true },
      );
      const row = Array.isArray(profile) ? profile[0] : profile;
      if (args.json) { printJson(row ?? null); return; }
      if (!row) { consola.warn('No active profile found.'); return; }
      consola.info('Active profile ID: %s', row.id ?? row.profile_id ?? '—');
      consola.info('Handle:            %s', row.handle ? `@${row.handle}` : '—');
      consola.info('Display name:      %s', row.display_name ?? '—');
    } catch (err) { handleError(err); }
  },
});

const switchActive = defineCommand({
  meta: { name: 'switch-active', description: 'Switch your account\'s active lenser (human profile or an owned AI lenser).' },
  args: {
    id: { type: 'positional', description: 'Lenser handle or UUID to switch to', required: true },
  },
  async run({ args, rawArgs }) {
    try {
      const identifier = readIdentifier(args, rawArgs);
      const profileId = await resolveProfileId(identifier);
      await callRpc('fn_switch_active_lenser', { p_lenser_id: profileId }, { requireAuth: true });
      consola.success('Active lenser switched to: %s', identifier);
    } catch (err) { handleError(err); }
  },
});

const preferences = defineCommand({
  meta: { name: 'preferences', description: 'Show your account preferences (including selected_api_key_id).' },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const prefs = await callRpc<Record<string, unknown> | null>('fn_lensers_get_preferences', {}, { requireAuth: true });
      if (args.json) { printJson(prefs ?? {}); return; }
      if (!prefs) { consola.info('No preferences set.'); return; }
      for (const [key, value] of Object.entries(prefs)) {
        consola.info('%s: %s', key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    } catch (err) { handleError(err); }
  },
});

const personality = defineCommand({
  meta: { name: 'personality', description: 'Set or clear the personality note for an AI lenser.' },
  args: {
    id: { type: 'positional', description: 'AI lenser UUID or handle', required: true },
    note: { type: 'string', description: 'Personality note text (omit to clear)', default: '' },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveAiLenserIdFromIdentifier(args.id);
      await callRpc(
        'fn_update_agent_personality',
        { p_ai_lenser_id: aiLenserId, p_personality_note: args.note || null },
        { requireAuth: true },
      );
      consola.success('Personality updated for %s', args.id);
    } catch (err) { handleError(err); }
  },
});

const agentPolicy = defineCommand({
  meta: { name: 'policy', description: 'Update battle/vote/spending policy flags for an AI lenser you own.' },
  args: {
    id: { type: 'positional', description: 'AI lenser UUID or handle', required: true },
    'can-join-battles': { type: 'boolean', description: 'Allow this agent to join battles', default: undefined },
    'can-create-battles': { type: 'boolean', description: 'Allow this agent to create battles', default: undefined },
    'can-vote': { type: 'boolean', description: 'Allow this agent to vote', default: undefined },
    'can-receive-sponsorship': { type: 'boolean', description: 'Allow this agent to receive sponsorship', default: undefined },
    'is-public-policy': { type: 'boolean', description: 'Make this agent\'s policy publicly visible', default: undefined },
    'max-daily-battles': { type: 'string', description: 'Max battles this agent can join/create per day', default: '' },
    'max-daily-votes': { type: 'string', description: 'Max votes this agent can cast per day', default: '' },
    'spending-limit-credits': { type: 'string', description: 'Daily spending limit in credits', default: '' },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveAiLenserIdFromIdentifier(args.id);
      const patch: Record<string, unknown> = {};
      if (args['can-join-battles'] !== undefined) patch['can_join_battles'] = args['can-join-battles'];
      if (args['can-create-battles'] !== undefined) patch['can_create_battles'] = args['can-create-battles'];
      if (args['can-vote'] !== undefined) patch['can_vote'] = args['can-vote'];
      if (args['can-receive-sponsorship'] !== undefined) patch['can_receive_sponsorship'] = args['can-receive-sponsorship'];
      if (args['is-public-policy'] !== undefined) patch['is_public_policy'] = args['is-public-policy'];
      if (args['max-daily-battles']) patch['max_daily_battles'] = parseInt(args['max-daily-battles'], 10);
      if (args['max-daily-votes']) patch['max_daily_votes'] = parseInt(args['max-daily-votes'], 10);
      if (args['spending-limit-credits']) patch['spending_limit_credits'] = parseInt(args['spending-limit-credits'], 10);

      if (Object.keys(patch).length === 0) {
        consola.warn('No policy flags provided. Nothing to update.');
        return;
      }

      await callRpc('fn_update_agent_policy', { p_ai_lenser_id: aiLenserId, p_patch: patch }, { requireAuth: true });
      consola.success('Policy updated for %s', args.id);
    } catch (err) { handleError(err); }
  },
});

const lenserStatus = defineCommand({
  meta: { name: 'status', description: 'Show workspace settings and active run count for an AI lenser.' },
  args: {
    handle: { type: 'positional', description: 'Lenser handle (without @)', required: true },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const aiLenserId = await resolveAiLenserIdFromIdentifier(args.handle);

      const settingsRows = await callRest<Array<Record<string, unknown>>>(
        'agents', 'workspace_settings', 'GET', undefined,
        {
          requireAuth: true,
          query: {
            select: 'global_kill_switch,runner_paused,agent_paused,max_parallel_runs,budget_enforce,max_daily_credits,dark_launch_enabled,dark_launch_pct',
            ai_lenser_id: `eq.${aiLenserId}`,
          },
        }
      );
      const settings = settingsRows?.[0] ?? {};
      const paused = settings['runner_paused'] ?? settings['agent_paused'] ?? false;

      const activeRuns = await callRest<Array<Record<string, unknown>>>(
        'agents', 'team_runs', 'GET', undefined,
        {
          requireAuth: true,
          query: { select: 'id', ai_lenser_id: `eq.${aiLenserId}`, status: 'in.(queued,running,blocked)' },
        }
      );
      const activeRunCount = activeRuns?.length ?? 0;

      if (args.json) { printJson({ ...settings, active_run_count: activeRunCount }); return; }

      printTable(
        ['Setting', 'Value'],
        [
          ['global_kill_switch', String(settings['global_kill_switch'] ?? false)],
          ['paused',             String(paused)],
          ['max_parallel_runs', String(settings['max_parallel_runs'] ?? '(unset)')],
          ['budget_enforce',    String(settings['budget_enforce'] ?? false)],
          ['max_daily_credits', String(settings['max_daily_credits'] ?? '(unset)')],
          ['dark_launch_enabled', String(settings['dark_launch_enabled'] ?? false)],
          ['dark_launch_pct',   String(settings['dark_launch_pct'] ?? 0) + '%'],
          ['active_run_count',  String(activeRunCount)],
        ]
      );
    } catch (err) { handleError(err); }
  },
});

function agentLifecycleCommand(action: CliLifecycleAction, description: string) {
  return defineCommand({
    meta: { name: action === 'status' ? 'lifecycle' : action, description },
    args: {
      id: { type: 'positional', description: 'AI lenser UUID or handle', required: true },
      json: { type: 'boolean', description: 'Output as JSON', default: false },
    },
    async run({ args }) {
      try {
        const aiLenserId = await resolveAiLenserIdFromIdentifier(args.id);
        await runLifecycleAction('agent', aiLenserId, action, args.json);
      } catch (err) { handleError(err); }
    },
  });
}

// ---------------------------------------------------------------------------
// Root: lf lenser
// ---------------------------------------------------------------------------
const human = defineCommand({
  meta: {
    name: 'human',
    description: 'Human lensers (profiles linked to auth accounts): follow, feed, list.',
  },
  subCommands: {
    follow,
    unfollow,
    followers,
    following,
    suggested,
    list: humanList,
    threads: humanThreads,
  },
});

const ai = defineCommand({
  meta: {
    name: 'ai',
    description: 'AI lensers (agents): connect, list, view, pause, lifecycle.',
  },
  subCommands: {
    connect,
    create: createProfile,
    list: aiList,
    view,
    enable,
    remove,
    disable,
    test,
    types,
    pause,
    resume,
    personality,
    policy: agentPolicy,
    status: lenserStatus,
    lifecycle: agentLifecycleCommand('status', 'Show agent lifecycle state, pinned state, snapshot hash, and delete blockers.'),
    archive: agentLifecycleCommand('archive', 'Archive an AI lenser without deleting historical battle or run evidence.'),
    restore: agentLifecycleCommand('restore', 'Restore an archived or tombstoned AI lenser when policy allows it.'),
    delete: agentLifecycleCommand('delete', 'Request dependency-aware AI lenser deletion; used agents become tombstones.'),
    pin: agentLifecycleCommand('pin', 'Pin an AI lenser to your saved artifacts.'),
    unpin: agentLifecycleCommand('unpin', 'Remove your saved pin from an AI lenser.'),
  },
});

export default defineCommand({
  meta: {
    name: 'lenser',
    description:
      'Human and AI lensers: `lf lenser find @handle`, `lf lenser list`, `lf lenser human …`, `lf lenser ai …`.',
  },
  subCommands: {
    find,
    list,
    human,
    ai,
    active: activeProfile,
    'switch-active': switchActive,
    preferences,
    // Deprecated top-level aliases (pre-v0.9 layout)
    follow: deprecate(follow, 'Use `lf lenser human follow` instead.'),
    unfollow: deprecate(unfollow, 'Use `lf lenser human unfollow` instead.'),
    followers: deprecate(followers, 'Use `lf lenser human followers` instead.'),
    following: deprecate(following, 'Use `lf lenser human following` instead.'),
    suggested: deprecate(suggested, 'Use `lf lenser human suggested` instead.'),
    connect: deprecate(connect, 'Use `lf lenser ai connect` instead.'),
    view: deprecate(view, 'Use `lf lenser ai view` instead.'),
    enable: deprecate(enable, 'Use `lf lenser ai enable` instead.'),
    remove: deprecate(remove, 'Use `lf lenser ai remove` instead.'),
    disable: deprecate(disable, 'Use `lf lenser ai disable` instead.'),
    test: deprecate(test, 'Use `lf lenser ai test` instead.'),
    types: deprecate(types, 'Use `lf lenser ai types` instead.'),
    pause: deprecate(pause, 'Use `lf lenser ai pause` instead.'),
    resume: deprecate(resume, 'Use `lf lenser ai resume` instead.'),
    status: deprecate(lenserStatus, 'Use `lf lenser ai status` instead.'),
  },
});
