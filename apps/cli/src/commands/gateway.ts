import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printJson, printTable } from '../utils/output';

type CatalogModel = {
  provider_key: string;
  key: string;
  support_level: string;
};

type DeviceRow = {
  id: string;
  name: string;
  device_type: string;
  trust_level: string;
  gateway_status: string;
  last_seen_at: string | null;
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

// ---------------------------------------------------------------------------
// gateway models — AI provider / model catalog (original gateway behavior)
// ---------------------------------------------------------------------------
const models = defineCommand({
  meta: {
    name: 'models',
    description: 'Inspect gateway-style provider/model routing classes.',
  },
  args: {
    provider: { type: 'string', default: '', description: 'Provider key filter' },
    json: { type: 'boolean', default: false, description: 'Output JSON' },
  },
  async run({ args }) {
    try {
      const catalog = await callRpc<CatalogModel[]>(
        'fn_ai_catalog_models',
        {
          p_provider_key: args.provider || null,
          p_support_level: null,
          p_capability: null,
          p_modality: null,
        },
        { noAuth: true }
      );

      const rows = catalog.map((m) => ({
        model: `${m.provider_key}/${m.key}`,
        provider: m.provider_key,
        support_level: m.support_level,
        route: classifyRoute(m.provider_key, m.support_level),
      }));

      if (args.json) { printJson(rows); return; }

      printTable(
        ['Model', 'Provider', 'Support', 'Route'],
        rows.map((r) => [r.model, r.provider, r.support_level, r.route])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// gateway devices — list registered trusted devices
// ---------------------------------------------------------------------------
const devices = defineCommand({
  meta: {
    name: 'devices',
    description: 'List your registered local devices and their trust status.',
  },
  args: {
    trust: { type: 'string', default: '', description: 'Filter by trust level (pending|approved|trusted|revoked)' },
    json: { type: 'boolean', default: false, description: 'Output JSON' },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<DeviceRow[]>(
        'fn_device_list',
        { p_trust_level: args.trust || null, p_limit: 50 },
        { requireAuth: true }
      );

      if (!rows?.length) {
        consola.info('No devices registered. Run: lf gateway approve-device <id>');
        return;
      }

      if (args.json) { printJson(rows); return; }

      printTable(
        ['ID', 'Name', 'Type', 'Trust', 'Gateway', 'Last Seen'],
        rows.map((d) => [
          d.id.substring(0, 8),
          d.name,
          d.device_type,
          d.trust_level,
          d.gateway_status,
          d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : '—',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// gateway approve-device — elevate a pending device to approved
// ---------------------------------------------------------------------------
const approveDevice = defineCommand({
  meta: {
    name: 'approve-device',
    description: 'Approve a pending local device for trusted execution.',
  },
  args: {
    id: { type: 'positional', description: 'Device UUID', required: true },
  },
  async run({ args }) {
    try {
      await callRpc<void>(
        'fn_device_approve',
        { p_device_id: args.id },
        { requireAuth: true }
      );
      consola.success('Device %s approved. Connect a runner with: lf runner connect --device %s', args.id, args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// gateway runners — list runners with their bound device info
// ---------------------------------------------------------------------------
const runners = defineCommand({
  meta: {
    name: 'runners',
    description: 'List runners and their bound trusted devices.',
  },
  args: {
    json: { type: 'boolean', default: false, description: 'Output JSON' },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<Array<{
        runner_id: string;
        device_id: string | null;
        device_name: string | null;
        trust_level: string | null;
        binding_status: string | null;
        bound_at: string | null;
      }>>(
        'fn_runner_list_with_devices',
        { p_limit: 50 },
        { requireAuth: true }
      );

      if (!rows?.length) {
        consola.info('No runner–device bindings. Connect a runner: lf runner connect --name <name> --type ollama --device <device-id>');
        return;
      }

      if (args.json) { printJson(rows); return; }

      printTable(
        ['Runner', 'Device', 'Trust', 'Status', 'Bound At'],
        rows.map((r) => [
          r.runner_id.substring(0, 8),
          r.device_name ?? r.device_id?.substring(0, 8) ?? '—',
          r.trust_level ?? '—',
          r.binding_status ?? '—',
          r.bound_at ? new Date(r.bound_at).toLocaleString() : '—',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// gateway status — aggregated health overview
// ---------------------------------------------------------------------------
const status = defineCommand({
  meta: {
    name: 'status',
    description: 'Gateway health overview: device and runner counts.',
  },
  args: {
    json: { type: 'boolean', default: false, description: 'Output JSON' },
  },
  async run({ args }) {
    try {
      const [allDevices, bindings] = await Promise.all([
        callRpc<DeviceRow[]>('fn_device_list', { p_limit: 100 }, { requireAuth: true }),
        callRpc<Array<{ binding_status: string }>>('fn_runner_list_with_devices', { p_limit: 100 }, { requireAuth: true }),
      ]);

      const trusted = allDevices?.filter((d) => d.trust_level === 'trusted').length ?? 0;
      const approved = allDevices?.filter((d) => d.trust_level === 'approved').length ?? 0;
      const pending = allDevices?.filter((d) => d.trust_level === 'pending').length ?? 0;
      const activeRunners = bindings?.filter((b) => b.binding_status === 'active').length ?? 0;

      const summary = { trusted_devices: trusted, approved_devices: approved, pending_devices: pending, active_runners: activeRunners };

      if (args.json) { printJson(summary); return; }

      consola.info('Trusted devices:  %s', trusted);
      consola.info('Approved devices: %s', approved);
      consola.info('Pending devices:  %s', pending);
      consola.info('Active runners:   %s', activeRunners);
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
    name: 'gateway',
    description: 'Manage local devices, runners, and inspect model routing.',
  },
  subCommands: {
    models,
    devices,
    'approve-device': approveDevice,
    runners,
    status,
  },
});
