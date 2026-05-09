import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, callRest, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function resolveSelfId(): Promise<string | null> {
  const self = await callRpc<Record<string, unknown>>(
    'fn_lensers_get_authenticated_profile',
    {},
    { requireAuth: true }
  );
  return (self?.id as string) ?? null;
}

async function resolveAiLenserId(handle: string): Promise<string> {
  const rows = await callRest<Array<{ id: string }>>(
    'lensers',
    'profiles',
    'GET',
    undefined,
    { requireAuth: true, query: { select: 'id', handle: `eq.${handle}` } }
  );
  const profile = rows?.[0];
  if (!profile) throw new Error(`No profile found for handle @${handle}`);

  const agents = await callRest<Array<{ id: string }>>(
    'agents',
    'ai_lensers',
    'GET',
    undefined,
    { requireAuth: true, query: { select: 'id', profile_id: `eq.${profile.id}` } }
  );
  const agent = agents?.[0];
  if (!agent) throw new Error(`No AI lenser found for @${handle}`);
  return agent.id;
}

// ---------------------------------------------------------------------------
// Social graph subcommands
// ---------------------------------------------------------------------------

const follow = defineCommand({
  meta: { name: 'follow', description: 'Follow a lenser by their UUID.' },
  args: {
    id: { type: 'positional', description: 'Lenser UUID to follow.', required: true },
  },
  async run({ args }) {
    try {
      await callRpc('fn_lensers_follow', { p_following_id: args.id }, { requireAuth: true });
      consola.success('Now following lenser: %s', args.id);
    } catch (err) { handleError(err); }
  },
});

const unfollow = defineCommand({
  meta: { name: 'unfollow', description: 'Unfollow a lenser by their UUID.' },
  args: {
    id: { type: 'positional', description: 'Lenser UUID to unfollow.', required: true },
  },
  async run({ args }) {
    try {
      await callRpc('fn_lensers_unfollow', { p_following_id: args.id }, { requireAuth: true });
      consola.success('Unfollowed lenser: %s', args.id);
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
      const lenserId = args.id || (await resolveSelfId());
      if (!lenserId) { consola.warn('No lenser profile found. Run `auth login` first.'); return; }
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
      const lenserId = args.id || (await resolveSelfId());
      if (!lenserId) { consola.warn('No lenser profile found. Run `auth login` first.'); return; }
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
      const selfId = await resolveSelfId();
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

const ADAPTER_TYPES = ['openai-agents', 'langchain', 'crewai', 'mcp', 'ollama', 'http', 'custom'];

const connect = defineCommand({
  meta: { name: 'connect', description: 'Register a new AI lenser.' },
  args: {
    name: { type: 'string', description: 'Lenser display name', required: true },
    type: { type: 'string', description: `Lenser type: ${ADAPTER_TYPES.join(', ')}`, required: true },
    config: { type: 'string', description: 'JSON config string or path to config file', default: '{}' },
    gateway: { type: 'boolean', description: 'Route this lenser through the local gateway', default: false },
    device: { type: 'string', description: 'Device UUID to bind this lenser to (requires an approved device)', default: '' },
  },
  async run({ args }) {
    if (!ADAPTER_TYPES.includes(args.type)) {
      consola.error('Invalid lenser type: %s. Must be one of: %s', args.type, ADAPTER_TYPES.join(', '));
      process.exitCode = 1;
      return;
    }
    let config: Record<string, unknown>;
    try { config = JSON.parse(args.config); }
    catch { consola.error('Invalid JSON config: %s', args.config); process.exitCode = 1; return; }

    if (args.gateway) config = { ...config, gateway: true };

    try {
      const lenserId = await callRpc<string>('fn_runner_register', {
        p_name: args.name,
        p_adapter_type: args.type,
        p_config: config,
      }, { requireAuth: true });
      consola.success('Lenser registered: %s', lenserId);

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

const list = defineCommand({
  meta: { name: 'list', description: 'List your registered AI lensers.' },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const lensers = await callRpc<Array<{
        id: string; name: string; adapter_type: string; is_active: boolean; created_at: string;
      }>>('fn_runner_list', {}, { requireAuth: true });

      if (args.json) { printJson(lensers); return; }
      if (!Array.isArray(lensers) || lensers.length === 0) { consola.info('No AI lensers registered.'); return; }

      printTable(
        ['ID', 'Name', 'Type', 'Active', 'Created'],
        lensers.map((a) => [
          a.id.substring(0, 8),
          a.name,
          a.adapter_type,
          a.is_active ? 'yes' : 'no',
          new Date(a.created_at).toLocaleDateString(),
        ])
      );
    } catch (err) { handleError(err); }
  },
});

const remove = defineCommand({
  meta: { name: 'remove', description: 'Deactivate an AI lenser.' },
  args: {
    id: { type: 'positional', description: 'Lenser UUID', required: true },
  },
  async run({ args }) {
    try {
      await callRpc('fn_runner_remove', { p_adapter_id: args.id }, { requireAuth: true });
      consola.success('Lenser deactivated: %s', args.id);
    } catch (err) { handleError(err); }
  },
});

const view = defineCommand({
  meta: { name: 'view', description: 'Show full config and status for a registered AI lenser.' },
  args: {
    id: { type: 'positional', description: 'Lenser UUID', required: true },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const lenser = await callRpc<Record<string, unknown>>(
        'fn_runner_get', { p_adapter_id: args.id }, { requireAuth: true }
      );
      if (!lenser) { consola.warn('Lenser not found: %s', args.id); return; }
      if (args.json) { printJson(lenser); return; }
      consola.info('ID:      %s', lenser.id);
      consola.info('Name:    %s', lenser.name);
      consola.info('Type:    %s', lenser.adapter_type);
      consola.info('Active:  %s', lenser.is_active ? 'yes' : 'no');
      consola.info('Created: %s', lenser.created_at);
      if (lenser.config) consola.info('Config:  %s', JSON.stringify(lenser.config, null, 2));
    } catch (err) { handleError(err); }
  },
});

const enable = defineCommand({
  meta: { name: 'enable', description: 'Re-activate a previously deactivated AI lenser.' },
  args: {
    id: { type: 'positional', description: 'Lenser UUID', required: true },
  },
  async run({ args }) {
    try {
      await callRpc('fn_runner_enable', { p_adapter_id: args.id }, { requireAuth: true });
      consola.success('Lenser enabled: %s', args.id);
    } catch (err) { handleError(err); }
  },
});

const test = defineCommand({
  meta: { name: 'test', description: 'Send a probe to verify an AI lenser is reachable.' },
  args: {
    id: { type: 'positional', description: 'Lenser UUID', required: true },
    prompt: { type: 'string', description: 'Probe message to send', default: 'Hello, are you available?' },
  },
  async run({ args }) {
    try {
      consola.start('Testing lenser %s...', args.id);
      const result = await callRpc<Record<string, unknown>>(
        'fn_runner_probe',
        { p_adapter_id: args.id, p_prompt: args.prompt },
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
      const aiLenserId = await resolveAiLenserId(args.handle);
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
      const aiLenserId = await resolveAiLenserId(args.handle);
      await callRpc('fn_resume_agent', { p_ai_lenser_id: aiLenserId }, { requireAuth: true });
      consola.success('Lenser @%s resumed.', args.handle);
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
      const aiLenserId = await resolveAiLenserId(args.handle);

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

// ---------------------------------------------------------------------------
// Root: lf lenser
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'lenser',
    description: 'Manage lensers: social graph (follow/unfollow) and AI lenser registration (connect, list, view, pause, resume).',
  },
  subCommands: {
    // Social graph
    follow,
    unfollow,
    followers,
    following,
    suggested,
    // AI lenser management
    connect,
    list,
    view,
    enable,
    remove,
    test,
    types,
    pause,
    resume,
    status: lenserStatus,
  },
});
