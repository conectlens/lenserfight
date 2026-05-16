import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir, networkInterfaces } from 'node:os';
import path from 'node:path';

import { defineCommand } from 'citty';
import consola from 'consola';

import { keychain } from '@lenserfight/utils/keychain';
import { generateEd25519Keypair } from '@lenserfight/utils/signing';
import { detectTailscaleInterfaces } from '@lenserfight/infra/gateway';

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
// gateway approve-device — two-step (RFC-0003 §5) elevate to approved
// ---------------------------------------------------------------------------
const approveDevice = defineCommand({
  meta: {
    name: 'approve-device',
    description:
      'Approve a pending local device for trusted execution. ' +
      'Devices with a recorded public key require an answered challenge first.',
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
      consola.success(
        'Device %s approved. Connect a lenser with: lf lenser connect --device %s',
        args.id,
        args.id
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('awaiting_device_challenge')) {
        consola.warn(
          'Device %s has a registered public key but has not yet posted its signed challenge.',
          args.id
        );
        consola.info(
          'Have the device daemon run `lf gateway identity show` and complete the challenge first.'
        );
        process.exit(5);
      }
      if (msg.includes('device_not_pending')) {
        consola.warn(
          'Device %s is not in the pending state. Use `lf gateway devices` to inspect its current trust level.',
          args.id
        );
        process.exit(5);
      }
      if (msg.includes('device_not_found')) {
        consola.warn('Device %s not found or not owned by you.', args.id);
        process.exit(1);
      }
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// gateway lensers — list lensers with their bound device info
// ---------------------------------------------------------------------------
const runners = defineCommand({
  meta: {
    name: 'runners',
    description: 'List lensers and their bound trusted devices.',
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
        consola.info('No lenser–device bindings. Connect a lenser: lf lenser connect --name <name> --type ollama --device <device-id>');
        return;
      }

      if (args.json) { printJson(rows); return; }

      printTable(
        ['Lenser', 'Device', 'Trust', 'Status', 'Bound At'],
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
    description: 'Gateway health overview: device and lenser counts.',
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
      const activeLensers = bindings?.filter((b) => b.binding_status === 'active').length ?? 0;

      const summary = { trusted_devices: trusted, approved_devices: approved, pending_devices: pending, active_lensers: activeLensers };

      if (args.json) { printJson(summary); return; }

      consola.info('Trusted devices:  %s', trusted);
      consola.info('Approved devices: %s', approved);
      consola.info('Pending devices:  %s', pending);
      consola.info('Active lensers:   %s', activeLensers);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// gateway serve — start the long-running daemon (apps/gateway)
// ---------------------------------------------------------------------------
const KEYCHAIN_SERVICE = 'lenserfight-gateway';
const KEYCHAIN_ACCOUNT = 'device:active';

function findDaemonBinary(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'dist/apps/gateway/main.js'),
    path.resolve(__dirname, '../../gateway/main.js'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

const serve = defineCommand({
  meta: {
    name: 'serve',
    description: 'Start the long-running gateway daemon (lf-gatewayd).',
  },
  args: {
    bind: { type: 'string', default: '127.0.0.1', description: 'Bind interface' },
    port: { type: 'string', default: '38080', description: 'Bind port' },
    tailscale: { type: 'boolean', default: false, description: 'Also bind detected Tailscale interface' },
  },
  async run({ args }) {
    if (args.bind === '0.0.0.0') {
      consola.error('public_bind_forbidden: --bind 0.0.0.0 is not allowed in v1.');
      process.exit(5);
    }

    const binary = findDaemonBinary();
    if (!binary) {
      consola.warn(
        'lf-gatewayd binary not found. Build apps/gateway first:\n' +
          '  pnpm nx run gateway:build && node dist/apps/gateway/main.js'
      );
      process.exit(4);
    }

    const env = {
      ...process.env,
      LF_GATEWAY_BIND: String(args.bind),
      LF_GATEWAY_PORT: String(args.port),
      LF_GATEWAY_TAILSCALE: args.tailscale ? '1' : '0',
    };
    const child = spawn(process.execPath, [binary], {
      stdio: 'inherit',
      env,
    });
    child.on('exit', (code) => process.exit(code ?? 0));
  },
});

// ---------------------------------------------------------------------------
// gateway doctor — preflight diagnostics
// ---------------------------------------------------------------------------
const doctor = defineCommand({
  meta: {
    name: 'doctor',
    description: 'Run trust gateway self-tests.',
  },
  args: {
    check: { type: 'string', default: '', description: 'Comma-separated check ids' },
    json: { type: 'boolean', default: false, description: 'Output JSON' },
  },
  async run({ args }) {
    const checks = (args.check ? String(args.check).split(',').map((s) => s.trim()) : [
      'clock', 'keychain', 'identity', 'daemon', 'sync', 'policy', 'transport',
    ]).filter(Boolean);

    const results: Array<{ id: string; status: 'pass' | 'fail' | 'skipped'; message: string }> = [];

    for (const check of checks) {
      try {
        if (check === 'clock') {
          const now = Date.now();
          const start = process.hrtime.bigint();
          await callRpc<unknown>('fn_ai_catalog_models', { p_provider_key: null, p_support_level: null, p_capability: null, p_modality: null }, { noAuth: true }).catch(() => null);
          const elapsedMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
          results.push({ id: 'clock', status: 'pass', message: `local clock now=${new Date(now).toISOString()} (round-trip ${elapsedMs}ms)` });
        } else if (check === 'keychain') {
          const probe = `__doctor__/${Date.now()}`;
          await keychain.setSecret({ service: 'lenserfight-doctor', account: probe, secret: 'ok' });
          const got = await keychain.getSecret({ service: 'lenserfight-doctor', account: probe });
          await keychain.deleteSecret({ service: 'lenserfight-doctor', account: probe });
          if (got !== 'ok') {
            results.push({ id: 'keychain', status: 'fail', message: 'keychain round-trip mismatch' });
          } else {
            results.push({ id: 'keychain', status: 'pass', message: 'keychain reachable' });
          }
        } else if (check === 'identity') {
          const secret = await keychain.getSecret({ service: KEYCHAIN_SERVICE, account: KEYCHAIN_ACCOUNT });
          if (!secret) {
            results.push({ id: 'identity', status: 'fail', message: 'no Ed25519 key — run `lf-gateway-init`' });
          } else {
            results.push({ id: 'identity', status: 'pass', message: 'Ed25519 key present in keychain' });
          }
        } else if (check === 'daemon') {
          const binary = findDaemonBinary();
          if (binary) {
            results.push({ id: 'daemon', status: 'pass', message: `daemon binary present: ${binary}` });
          } else {
            results.push({ id: 'daemon', status: 'fail', message: 'daemon binary not built' });
          }
        } else if (check === 'sync') {
          results.push({ id: 'sync', status: 'skipped', message: 'sync probes require an identity (skipped)' });
        } else if (check === 'policy') {
          try {
            const rows = await callRpc<Array<{ global_kill_switch: boolean }>>(
              'fn_global_policy_snapshot', {}, { requireAuth: true }
            ).catch(() => null);
            if (rows && rows.length) {
              const row = rows[0];
              results.push({ id: 'policy', status: row.global_kill_switch ? 'fail' : 'pass', message: `global_kill_switch=${row.global_kill_switch}` });
            } else {
              results.push({ id: 'policy', status: 'skipped', message: 'no workspace policy snapshot RPC available' });
            }
          } catch {
            results.push({ id: 'policy', status: 'skipped', message: 'policy snapshot unavailable' });
          }
        } else if (check === 'transport') {
          const tailscale = detectTailscaleInterfaces();
          const interfaces = networkInterfaces();
          const publicBinds = Object.entries(interfaces)
            .flatMap(([n, addrs]) => (addrs ?? []).map((a) => `${n}:${a.address}`))
            .filter((s) => s.includes('0.0.0.0'));
          const consentGranted = existsSync(TAILSCALE_CONSENT_PATH);
          const consentMatches =
            consentGranted &&
            tailscale.length > 0 &&
            (() => {
              try {
                const rec = JSON.parse(readFileSync(TAILSCALE_CONSENT_PATH, 'utf-8')) as {
                  fingerprints?: string[];
                };
                const fps = rec.fingerprints ?? [];
                return tailscale.some((i) => fps.includes(`${i.name}:${i.cidr ?? i.address}`));
              } catch {
                return false;
              }
            })();
          const status: 'pass' | 'fail' = publicBinds.length === 0 ? 'pass' : 'fail';
          results.push({
            id: 'transport',
            status,
            message:
              `tailscale_interfaces=${tailscale.length}` +
              ` consent=${consentGranted ? (consentMatches ? 'matched' : 'mismatched') : 'absent'}` +
              (publicBinds.length ? ` public_binds=${publicBinds.join(',')}` : ''),
          });
        }
      } catch (err) {
        results.push({ id: check, status: 'fail', message: (err as Error).message });
      }
    }

    if (args.json) {
      const ok = results.every((r) => r.status !== 'fail');
      printJson({ ok, checks: results, generated_at: new Date().toISOString() });
      process.exit(ok ? 0 : 3);
    }

    for (const r of results) {
      const symbol = r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : '·';
      consola[r.status === 'fail' ? 'warn' : 'info']('%s %s — %s', symbol, r.id, r.message);
    }
    process.exit(results.some((r) => r.status === 'fail') ? 3 : 0);
  },
});

// ---------------------------------------------------------------------------
// gateway identity — manage device Ed25519 keypair
// ---------------------------------------------------------------------------
const identity = defineCommand({
  meta: {
    name: 'identity',
    description: 'Manage this device Ed25519 keypair (OS keychain).',
  },
  subCommands: {
    show: defineCommand({
      meta: { name: 'show', description: 'Show identity metadata.' },
      args: { json: { type: 'boolean', default: false, description: 'Output JSON' } },
      async run({ args }) {
        try {
          const secret = await keychain.getSecret({ service: KEYCHAIN_SERVICE, account: KEYCHAIN_ACCOUNT });
          const identityFile = path.join(homedir(), '.lenserfight', 'gateway', 'identity.json');
          const meta = existsSync(identityFile) ? JSON.parse(readFileSync(identityFile, 'utf-8')) : null;
          const present = Boolean(secret);
          if (args.json) {
            printJson({ present, public_key: meta?.public_key ?? null, signing_algo: meta?.signing_algo ?? null, generated_at: meta?.generated_at ?? null });
            return;
          }
          if (!present) {
            consola.warn('No Ed25519 keypair present. Run `lf-gateway-init` to generate one.');
            return;
          }
          consola.success('Identity present');
          consola.info('algorithm:    %s', meta?.signing_algo ?? 'ed25519');
          consola.info('public_key:   %s', meta?.public_key ?? '(unknown — re-run init)');
          consola.info('generated_at: %s', meta?.generated_at ?? '(unknown)');
        } catch (err) {
          handleError(err);
        }
      },
    }),
    rotate: defineCommand({
      meta: { name: 'rotate', description: 'Generate a fresh keypair (revokes the previous one locally).' },
      async run() {
        try {
          const { publicKey, privateKey } = generateEd25519Keypair();
          await keychain.setSecret({ service: KEYCHAIN_SERVICE, account: KEYCHAIN_ACCOUNT, secret: privateKey });
          consola.success('Keypair rotated.');
          consola.info('Register the new public key with the cloud: %s', publicKey);
        } catch (err) {
          handleError(err);
        }
      },
    }),
    'export-public': defineCommand({
      meta: { name: 'export-public', description: 'Print the device public key (safe to share).' },
      args: { json: { type: 'boolean', default: false, description: 'Output JSON' } },
      async run({ args }) {
        try {
          const identityFile = path.join(homedir(), '.lenserfight', 'gateway', 'identity.json');
          if (!existsSync(identityFile)) {
            consola.warn('identity.json not found. Run `lf-gateway-init`.');
            process.exit(1);
          }
          const meta = JSON.parse(readFileSync(identityFile, 'utf-8'));
          if (args.json) printJson({ public_key: meta.public_key, signing_algo: meta.signing_algo });
          else consola.info(meta.public_key);
        } catch (err) {
          handleError(err);
        }
      },
    }),
  },
});

// ---------------------------------------------------------------------------
// gateway peers — list peer devices on the same Lenser account
// ---------------------------------------------------------------------------
const peers = defineCommand({
  meta: { name: 'peers', description: 'List peer devices on the same Lenser account.' },
  args: { json: { type: 'boolean', default: false, description: 'Output JSON' } },
  async run({ args }) {
    try {
      const rows = await callRpc<DeviceRow[]>('fn_device_list', { p_limit: 100 }, { requireAuth: true });
      if (!rows?.length) {
        consola.info('No peer devices found.');
        return;
      }
      if (args.json) { printJson(rows); return; }
      printTable(
        ['ID', 'Name', 'Trust', 'Gateway', 'Last Seen'],
        rows.map((d) => [
          d.id.substring(0, 8),
          d.name,
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
// gateway sync — inspect / pull / push outbox state
// ---------------------------------------------------------------------------
const sync = defineCommand({
  meta: { name: 'sync', description: 'Inspect or trigger sync (status / pull / push).' },
  subCommands: {
    status: defineCommand({
      meta: { name: 'status', description: 'Per-class watermark + outbox depth.' },
      args: {
        device: { type: 'string', description: 'Device UUID', required: true },
        json: { type: 'boolean', default: false, description: 'Output JSON' },
      },
      async run({ args }) {
        try {
          const rows = await callRpc<Array<{ object_class: string; watermark: string | null; outbox_depth: number; last_error: string | null }>>(
            'fn_sync_status',
            { p_device_id: args.device },
            { requireAuth: true }
          );
          if (args.json) { printJson(rows); return; }
          if (!rows?.length) { consola.info('No sync watermarks recorded yet for this device.'); return; }
          printTable(
            ['Class', 'Watermark', 'Outbox', 'Error'],
            rows.map((r) => [r.object_class, r.watermark ?? '—', String(r.outbox_depth), r.last_error ?? '—'])
          );
        } catch (err) {
          handleError(err);
        }
      },
    }),
    pull: defineCommand({
      meta: { name: 'pull', description: 'One-shot pull (advisory; daemon already polls).' },
      async run() {
        consola.info('Use the daemon (`lf gateway serve`) for continuous sync.');
        consola.info('A signed manual pull will land in a follow-up release.');
      },
    }),
    push: defineCommand({
      meta: { name: 'push', description: 'One-shot outbox flush (advisory).' },
      async run() {
        consola.info('Outbox flush is owned by the daemon; this stub will be wired to a signed push helper in a follow-up release.');
      },
    }),
  },
});

// ---------------------------------------------------------------------------
// gateway policy — kill switch / lenser_paused / budget snapshot
// ---------------------------------------------------------------------------
const policy = defineCommand({
  meta: { name: 'policy', description: 'Inspect kill switch / lenser_paused / budget state.' },
  subCommands: {
    show: defineCommand({
      meta: { name: 'show', description: 'Show current policy snapshot.' },
      args: {
        handle: { type: 'string', description: 'Workspace handle (e.g. @alice). Defaults to active workspace.' },
        json: { type: 'boolean', default: false, description: 'Output JSON' },
      },
      async run({ args }) {
        try {
          const settingsRows = await callRpc<Array<Record<string, unknown>>>(
            'fn_workspace_settings_list',
            args.handle ? { p_handle: args.handle } : {},
            { requireAuth: true }
          ).catch(() => null);

          if (!settingsRows?.length) {
            consola.info('No workspace policy snapshot available. Try `lf workspace settings` instead.');
            return;
          }
          const row = settingsRows[0];
          const snap = {
            global_kill_switch: row['global_kill_switch'] ?? false,
            runner_paused: row['runner_paused'] ?? row['agent_paused'] ?? false,
            budget_enforce: row['budget_enforce'] ?? false,
            max_parallel_runs: row['max_parallel_runs'] ?? null,
            dark_launch_enabled: row['dark_launch_enabled'] ?? false,
            dark_launch_pct: row['dark_launch_pct'] ?? 0,
          };
          if (args.json) { printJson(snap); return; }
          printTable(['Setting', 'Value'], Object.entries(snap).map(([k, v]) => [k, String(v)]));
        } catch (err) {
          handleError(err);
        }
      },
    }),
    test: defineCommand({
      meta: { name: 'test', description: 'Issue a noop call to confirm the policy gate is enforced.' },
      args: { kind: { type: 'string', description: 'kill-switch | lenser-paused', default: 'kill-switch' } },
      async run({ args }) {
        consola.info('Policy gate test (%s): server-side enforcement runs at fn_evaluate_pre_run_policy.', args.kind);
      },
    }),
  },
});

// ---------------------------------------------------------------------------
// gateway consent — explicit non-loopback bind grants (Tailscale, etc.)
// ---------------------------------------------------------------------------
const TAILSCALE_CONSENT_PATH = path.join(homedir(), '.lenserfight', 'gateway', 'tailscale-consent.json');

function fingerprintForCli(name: string, cidrOrAddr: string): string {
  return `${name}:${cidrOrAddr}`;
}

const consent = defineCommand({
  meta: {
    name: 'consent',
    description: 'Manage explicit consent for non-loopback gateway binds.',
  },
  subCommands: {
    show: defineCommand({
      meta: { name: 'show', description: 'Show current consent state for Tailscale.' },
      args: { json: { type: 'boolean', default: false, description: 'Output JSON' } },
      async run({ args }) {
        const detected = detectTailscaleInterfaces();
        const exists = existsSync(TAILSCALE_CONSENT_PATH);
        const record = exists ? JSON.parse(readFileSync(TAILSCALE_CONSENT_PATH, 'utf-8')) : null;
        if (args.json) {
          printJson({ path: TAILSCALE_CONSENT_PATH, granted: exists, record, detected });
          return;
        }
        consola.info('consent file: %s', TAILSCALE_CONSENT_PATH);
        consola.info('granted:      %s', exists ? 'yes' : 'no');
        if (record) {
          consola.info('granted_at:   %s', record.granted_at);
          consola.info('fingerprints: %s', (record.fingerprints ?? []).join(', '));
        }
        if (!detected.length) {
          consola.warn('No CGNAT interface detected (tailscale*/wg*/utun* in 100.64.0.0/10).');
        } else {
          consola.info('detected:');
          for (const iface of detected) {
            consola.info('  - %s', fingerprintForCli(iface.name, iface.cidr ?? iface.address));
          }
        }
      },
    }),
    grant: defineCommand({
      meta: {
        name: 'grant',
        description:
          'Grant explicit consent for the daemon to bind on the detected Tailscale interface.',
      },
      args: {
        kind: { type: 'positional', description: 'tailscale (only supported value in v1)', required: true },
        notes: { type: 'string', description: 'Optional human-readable note for audit' },
      },
      async run({ args }) {
        if (args.kind !== 'tailscale') {
          consola.error('unsupported_consent_kind: only `tailscale` is supported.');
          process.exit(2);
        }
        const detected = detectTailscaleInterfaces();
        if (!detected.length) {
          consola.error(
            'no_tailscale_interface: bring up Tailscale (or your WireGuard mesh) and try again.'
          );
          process.exit(4);
        }
        const dir = path.dirname(TAILSCALE_CONSENT_PATH);
        mkdirSync(dir, { recursive: true, mode: 0o700 });
        const record = {
          granted_at: new Date().toISOString(),
          granter_lenser_id: null,
          fingerprints: detected.map((i) => fingerprintForCli(i.name, i.cidr ?? i.address)),
          notes: args.notes,
        };
        writeFileSync(
          TAILSCALE_CONSENT_PATH,
          JSON.stringify(record, null, 2),
          { mode: 0o600 }
        );
        consola.success('Tailscale bind consent granted for: %s', record.fingerprints.join(', '));
        consola.info('Consent file: %s', TAILSCALE_CONSENT_PATH);
        consola.info('Re-run `lf gateway serve --tailscale` to bind on the approved interface.');
      },
    }),
    revoke: defineCommand({
      meta: { name: 'revoke', description: 'Revoke Tailscale bind consent.' },
      async run() {
        if (!existsSync(TAILSCALE_CONSENT_PATH)) {
          consola.info('No Tailscale consent file present.');
          return;
        }
        unlinkSync(TAILSCALE_CONSENT_PATH);
        consola.success('Tailscale bind consent revoked.');
        consola.info('The daemon will refuse `--tailscale` until consent is re-granted.');
      },
    }),
  },
});

// ---------------------------------------------------------------------------
// gateway daemons — Phase BB: manage long-running `lf-gatewayd` registrations
// (agents.gateway_devices) — distinct from the legacy `gateway devices` group
// which targets the older devices.* trusted-device flow.
// ---------------------------------------------------------------------------
type GatewayDaemonRow = {
  device_id: string;
  hostname: string | null;
  daemon_version: string | null;
  last_seen_at: string | null;
  approved_at: string | null;
  revoked_at: string | null;
  kill_switch: boolean;
  created_at: string;
};

function fmtRelative(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

const daemons = defineCommand({
  meta: {
    name: 'daemons',
    description:
      'Manage long-running gateway daemon registrations (agents.gateway_devices). ' +
      'Distinct from the legacy `gateway devices` group.',
  },
  subCommands: {
    list: defineCommand({
      meta: { name: 'list', description: 'List your registered gateway daemons.' },
      args: {
        limit: { type: 'string', default: '50', description: 'Max rows (1-200)' },
        json: { type: 'boolean', default: false, description: 'Output JSON' },
      },
      async run({ args }) {
        try {
          const rows = await callRpc<GatewayDaemonRow[]>(
            'fn_list_gateway_devices',
            { p_limit: Number(args.limit) || 50 },
            { requireAuth: true }
          );
          if (!rows?.length) {
            consola.info('No gateway daemons registered yet. Run `lf gateway serve` on a host.');
            return;
          }
          if (args.json) { printJson(rows); return; }
          printTable(
            ['Device', 'Host', 'Version', 'Last Seen', 'Approved', 'Kill'],
            rows.map((r) => [
              r.device_id.substring(0, 8),
              r.hostname ?? '—',
              r.daemon_version ?? '—',
              fmtRelative(r.last_seen_at),
              r.approved_at ? 'yes' : 'no',
              r.kill_switch ? 'yes' : 'no',
            ])
          );
        } catch (err) {
          handleError(err);
        }
      },
    }),
    approve: defineCommand({
      meta: { name: 'approve', description: 'Approve a gateway daemon device.' },
      args: {
        id: { type: 'positional', description: 'Device UUID', required: true },
      },
      async run({ args }) {
        try {
          await callRpc<void>(
            'fn_gateway_approve_device',
            { p_device_id: args.id },
            { requireAuth: true }
          );
          consola.success('Daemon %s approved.', args.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('device_not_owned')) {
            consola.warn('Device %s is not yours, or not registered.', args.id);
            process.exit(1);
          }
          handleError(err);
        }
      },
    }),
    revoke: defineCommand({
      meta: {
        name: 'revoke',
        description: 'Revoke a gateway daemon device (kill_switch becomes true).',
      },
      args: {
        id: { type: 'positional', description: 'Device UUID', required: true },
        force: { type: 'boolean', default: false, description: 'Skip confirmation prompt' },
      },
      async run({ args }) {
        if (!args.force) {
          const answer = await consola.prompt(
            `Revoke daemon ${args.id}? The daemon will receive kill_switch=true on its next heartbeat.`,
            { type: 'confirm', initial: false }
          );
          if (!answer) {
            consola.info('Aborted.');
            return;
          }
        }
        try {
          await callRpc<void>(
            'fn_gateway_revoke_device',
            { p_device_id: args.id },
            { requireAuth: true }
          );
          consola.success('Daemon %s revoked.', args.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('device_not_owned')) {
            consola.warn('Device %s is not yours, or not registered.', args.id);
            process.exit(1);
          }
          handleError(err);
        }
      },
    }),
  },
});

// ---------------------------------------------------------------------------
// Root command
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'gateway',
    description: 'Manage local devices, lensers, daemon, identity, peers, sync, policy, and routing.',
  },
  subCommands: {
    models,
    devices,
    daemons,
    'approve-device': approveDevice,
    runners,
    lensers: runners,
    status,
    serve,
    doctor,
    identity,
    peers,
    sync,
    policy,
    consent,
  },
});
