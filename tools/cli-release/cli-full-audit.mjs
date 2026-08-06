#!/usr/bin/env node
// Full-coverage LenserFight CLI test harness (issue-#453 "Phase C" — the full
// recursive ~550-leaf-command sweep that cli-audit.mjs's own comments
// explicitly scoped out as future work).
//
// Usage:
//   node tools/cli-release/cli-full-audit-discover.mjs   # writes the command inventory JSON
//   node tools/cli-release/cli-full-audit.mjs            # runs the full sweep against it
//
// Both accept --package-dir (default dist/apps/cli), --out-dir (default
// artifacts/, gitignored), --sandbox-home / --sandbox-work (default a temp
// dir — reuse across runs to skip the ~7s cold-profile first-run cost).
// cli-full-audit.mjs additionally accepts --concurrency (default 12),
// --limit (cap items per invocation — use this to stay under any wall-clock
// budget for a single call), --shard (a label, not a partition — reruns
// resume via the progress log regardless of shard name) and --phase
// (`items` [default] processes groups/leaves and is safe to re-invoke
// repeatedly until the progress log covers the whole tree; `finalize` adds
// the root/alias/lf-vs-lenserfight-parity sweep and should run once, last).
// A kill mid-run never loses completed rows — see the async incremental
// CSV-append design below — so re-invoking with the same --out-dir always
// picks up where it left off. Once every `items` shard plus one `finalize`
// shard have completed (check --out-dir/.harness-progress.log against the
// inventory's node count), run with --merge to concatenate all shards into
// the final lenserfight-cli-command-report.csv.
//
// Consumes the inventory produced by discover.mjs and exercises every leaf
// command with: help / bare-or-missing-required-arg / invalid-input /
// valid-execution / unknown-flag / repeated-execution, plus a lf<->lenserfight
// --help parity sweep across the whole tree. Every group (non-leaf) node gets
// help + bare-invocation coverage.
//
// Safety model (see conversation notes for full rationale):
//  - LF_LOCAL=1 + LF_NO_UPDATE_CHECK=1 on every invocation: no request ever
//    reaches LenserFight Cloud production infra or the npm registry update
//    check. Local Supabase is not running in this sandbox, so any command
//    that needs a backend fails fast with a connection error instead of
//    doing real work.
//  - HOME/USERPROFILE/APPDATA/XDG_CONFIG_HOME/LENSERFIGHT_HOME are redirected
//    into a scratch sandbox directory so no command writes into the real
//    user profile or repo working tree.
//  - Invoked from a non-interactive, non-TTY shell: apps/cli/src/lib/safety/guard.ts's
//    assertSafe() auto-blocks every destructive action gated by it unless
//    --force is passed, which this harness never passes.
//  - A small denylist of leaves with side effects the above nets don't cover
//    (opens a real browser tab, spawns a persistent daemon) are exercised for
//    --help and missing-arg only; their "would actually run" paths are marked
//    SKIPPED with the reason recorded.
import { spawn } from 'node:child_process';
import { writeFileSync, appendFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { writeFile, appendFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : (process.argv[i + 1] ?? fallback);
}

// Defaults are fully self-contained (no setup required beyond `pnpm nx build
// cli` first) — override any of these via flag or env var if you want to
// reuse a warm sandbox across runs (e.g. to skip the ~7s cold-profile
// first-run cost — see the root bare_invocation test's notes).
const WORKSPACE_ROOT = resolve(__dirname, '../..');
const SANDBOX_HOME = argValue('--sandbox-home', process.env.LF_AUDIT_SANDBOX_HOME ?? resolve(tmpdir(), 'lf-cli-audit', 'home'));
const SANDBOX_WORK = argValue('--sandbox-work', process.env.LF_AUDIT_SANDBOX_WORK ?? resolve(tmpdir(), 'lf-cli-audit', 'work'));
const MAIN_JS = resolve(argValue('--package-dir', resolve(WORKSPACE_ROOT, 'dist/apps/cli')), 'main.js');
const ARTIFACTS_DIR = argValue('--out-dir', resolve(WORKSPACE_ROOT, 'artifacts'));
const RAW_LOGS_DIR = resolve(ARTIFACTS_DIR, 'lenserfight-cli-raw-logs');

mkdirSync(SANDBOX_HOME, { recursive: true });
mkdirSync(SANDBOX_WORK, { recursive: true });

if (!existsSync(MAIN_JS)) {
  console.error(`Built binary not found at ${MAIN_JS} — run \`pnpm nx build cli\` first.`);
  process.exit(1);
}

const ENV = {
  ...process.env,
  LF_NO_UPDATE_CHECK: '1',
  LF_LOCAL: '1',
  NO_COLOR: '1',
  HOME: SANDBOX_HOME,
  USERPROFILE: SANDBOX_HOME,
  APPDATA: resolve(SANDBOX_HOME, 'AppData', 'Roaming'),
  XDG_CONFIG_HOME: resolve(SANDBOX_HOME, '.config'),
  LENSERFIGHT_HOME: resolve(SANDBOX_HOME, '.lenserfight'),
};

// path.join(' ') -> reason. Real execution (valid/unknown-flag/repeat) is
// skipped for these; help + missing-arg still run normally.
const EXEC_DENYLIST = {
  'docs open': 'Opens a real OS browser tab (node:child_process spawnSync to start/open/xdg-open) — not safe to trigger unattended in an automated sweep.',
  'media play': 'Opens a real OS browser tab via execSync once it resolves a signed media URL — not safe to trigger unattended.',
  'gateway serve': 'Spawns the long-running lf-gatewayd daemon as a detached child process — would leak a background process from this sweep.',
  'db dev': 'CONFIRMED LIVE during harness dry-run: spawns `supabase start`, a real multi-container Docker stack (postgres/auth/storage/realtime/kong/...), then runs migrations and seeds. Not safe to trigger unattended — verified and cleaned up (`supabase stop`) after an accidental 12s-timeout run during harness development.',
  'db seed': 'Runs `npx supabase db reset` (drops + recreates the local database) as a precondition before seeding, per db-commands/seed.ts.',
  'db reset': 'Runs `npx supabase db reset` against the local database (drop + recreate + migrate).',
};

mkdirSync(RAW_LOGS_DIR, { recursive: true });

function loadInventory() {
  const raw = readFileSync(resolve(ARTIFACTS_DIR, 'lenserfight-cli-command-inventory.json'), 'utf8');
  return JSON.parse(raw);
}

// ─── Process execution ───────────────────────────────────────────────────────

function killTree(child) {
  // On Windows, spawn(..., {shell:true}) wraps the real process in a cmd.exe
  // shim — child.kill() only signals that wrapper, not the grandchild node.exe
  // actually running the command. Long-running commands (e.g. `battle
  // stream-feed`, `top stream`) then survive the timeout as orphaned
  // processes. `taskkill /T /F` kills the whole tree rooted at the wrapper's
  // PID. Confirmed necessary during harness development — see the denylist
  // notes on stream commands.
  if (process.platform === 'win32' && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGKILL');
  }
}

function runOnce(executable, args, { timeoutMs = 12000 } = {}) {
  return new Promise((resolvePromise) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const child = spawn(executable, args, {
      cwd: SANDBOX_WORK,
      env: ENV,
      shell: process.platform === 'win32', // resolve .cmd shims for lf/lenserfight
    });
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolvePromise({ status: null, stdout, stderr, error: error.message, timedOut });
    });
    child.on('close', (status, signal) => {
      clearTimeout(timer);
      resolvePromise({ status, signal, stdout, stderr, error: null, timedOut });
    });
    child.stdin.end();
  });
}

// ─── Tiny async concurrency pool ─────────────────────────────────────────────

async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function runner() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

// ─── Arg synthesis ────────────────────────────────────────────────────────────

function plausibleValueFor(name) {
  const n = name.toLowerCase();
  if (n.includes('email')) return 'audit-sweep@example.invalid';
  if (n === 'id' || n.endsWith('-id') || n.endsWith('id')) return '00000000-0000-4000-8000-000000000000';
  if (n.includes('slug')) return 'audit-sweep-placeholder';
  if (n.includes('url')) return 'https://example.invalid/audit-sweep';
  if (n.includes('json')) return '{}';
  if (n.includes('path') || n.includes('file')) return 'audit-sweep-placeholder.md';
  if (n.includes('port')) return '65000';
  return 'audit-sweep-placeholder';
}

function invalidValueFor(name) {
  const n = name.toLowerCase();
  if (n === 'id' || n.endsWith('-id') || n.endsWith('id')) return 'not-a-valid-uuid';
  if (n.includes('email')) return 'not-an-email';
  if (n.includes('json')) return '{not valid json';
  if (n.includes('port')) return 'not-a-number';
  return '';
}

/** Builds a full arg list for a leaf node's required positionals + required flags. */
function buildArgs(node, { invalid = false } = {}) {
  const args = [];
  for (const pos of node.requiredPositionals) {
    args.push(invalid ? invalidValueFor(pos) : plausibleValueFor(pos));
  }
  for (const f of node.flags.filter((fl) => fl.required)) {
    const flagName = f.flag.replace(/^--/, '');
    args.push(f.flag, invalid ? invalidValueFor(flagName) : plausibleValueFor(flagName));
  }
  return args;
}

function hasRequiredArgs(node) {
  return node.requiredPositionals.length > 0 || node.flags.some((f) => f.required);
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  'test_id', 'executable', 'command', 'full_invocation', 'test_type',
  'expected_exit_code', 'actual_exit_code', 'status', 'stdout_summary',
  'stderr_summary', 'error_detail', 'side_effects', 'documentation_status',
  'documentation_issue', 'notes',
];

function esc(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function truncate(s, max = 300) {
  const oneLine = String(s ?? '').replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

// Patterns that indicate a *graceful*, expected rejection given this sandbox
// (no auth, no network, no local backend, non-interactive shell) rather than
// a real bug.
const GRACEFUL_BLOCK_PATTERNS = [
  /not authenticated/i,
  /run lf (auth login|setup|init)/i,
  /ECONNREFUSED/,
  /fetch failed/i,
  /network/i,
  /Non-interactive shell/i,
  /CI environment detected/i,
  /Missing required (positional argument|option)/i,
  /requires? (an? )?(active )?session/i,
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /project config missing/i,
  /no api key/i,
  /docker/i,
];

// Patterns indicating a genuine ungraceful crash worth flagging.
const CRASH_PATTERNS = [
  /UnhandledPromiseRejection/,
  /\bTypeError:/,
  /\bReferenceError:/,
  /\bRangeError:/,
  /at file:\/\/\//,
  /node:internal\//,
  /Cannot read propert/i,
  /is not a function\b/,
];

function classify(result, expectedExitCode, { allowNonZero = false } = {}) {
  if (result.error) {
    return { status: 'BLOCKED', category: 'spawn_error' };
  }
  if (result.timedOut) {
    return { status: 'FAIL', category: 'timeout' };
  }
  const combined = `${result.stdout}\n${result.stderr}`;
  const looksCrashed = CRASH_PATTERNS.some((re) => re.test(combined));
  if (looksCrashed) {
    return { status: 'FAIL', category: 'unhandled_exception' };
  }
  if (result.status === expectedExitCode) {
    return { status: 'PASS', category: '' };
  }
  const gracefullyBlocked = GRACEFUL_BLOCK_PATTERNS.some((re) => re.test(combined));
  if (gracefullyBlocked) {
    return { status: 'BLOCKED', category: 'requires_auth_network_or_local_backend' };
  }
  if (allowNonZero && result.status !== 0) {
    return { status: 'PASS', category: '' };
  }
  return { status: 'FAIL', category: 'unexpected_exit_code' };
}

// ─── Documentation cross-check ────────────────────────────────────────────────
//
// This only checks the direction "does the leaf's text appear in its
// top-level doc page" (per-row documentation_status/documentation_issue
// columns below). For the complementary direction — orphan doc pages with no
// matching command — reuse the repo's existing tools/check-cli-docs.mjs,
// which already does that (and gives it a top-level-only ground truth
// independent of this script's own crawl, worth cross-checking against).

function loadDocs() {
  const dir = resolve(WORKSPACE_ROOT, 'docs/en/reference/cli');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const content = {};
  for (const f of files) {
    content[f.replace(/\.md$/, '')] = readFileSync(resolve(dir, f), 'utf8');
  }
  return content;
}

function docStatusFor(node, docs) {
  const top = node.path[0];
  if (!(top in docs)) {
    return { status: 'MISSING_DOC_PAGE', issue: `No docs/en/reference/cli/${top}.md page exists for this top-level command.` };
  }
  if (node.path.length === 1) {
    return { status: 'DOCUMENTED', issue: '' };
  }
  const text = docs[top];
  const leaf = node.path[node.path.length - 1];
  const full = node.name;
  const mentioned = text.includes(leaf) || text.toLowerCase().includes(full.toLowerCase());
  return mentioned
    ? { status: 'DOCUMENTED', issue: '' }
    : { status: 'NOT_MENTIONED_IN_DOC', issue: `docs/en/reference/cli/${top}.md exists but does not mention "${full}".` };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const SHARD = argValue('--shard', process.env.LF_AUDIT_SHARD ?? '1');
// 'items' processes groups/leaves only (safe to split across many timed-out
// calls); 'finalize' additionally runs the root/alias/parity sweeps, which
// are whole-tree and must only run once, after every 'items' shard is done.
const PHASE = argValue('--phase', process.env.LF_AUDIT_PHASE ?? 'items');
const PROGRESS_FILE = resolve(ARTIFACTS_DIR, '.harness-progress.log');
const PART_CSV = resolve(ARTIFACTS_DIR, `.harness-part-${SHARD}.csv`);

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return new Set();
  return new Set(readFileSync(PROGRESS_FILE, 'utf8').split('\n').filter(Boolean));
}

function markDone(name) {
  appendFileSync(PROGRESS_FILE, name + '\n');
}

// `--merge` concatenates every `.harness-part-*.csv` shard into the final
// report and exits — run this once after all `items` shards and the
// `finalize` shard have completed. Kept separate from the per-shard run so a
// killed/retried shard never corrupts the merged output.
function mergeAndExit() {
  const files = readdirSync(ARTIFACTS_DIR).filter((f) => /^\.harness-part-.+\.csv$/.test(f));
  if (files.length === 0) {
    console.error('No .harness-part-*.csv shards found — nothing to merge.');
    process.exit(1);
  }
  let header = null;
  const rows = [];
  for (const f of files) {
    const lines = readFileSync(resolve(ARTIFACTS_DIR, f), 'utf8').split('\n').filter(Boolean);
    header ??= lines[0];
    rows.push(...lines.slice(1));
  }
  const outPath = resolve(ARTIFACTS_DIR, 'lenserfight-cli-command-report.csv');
  writeFileSync(outPath, `${header}\n${rows.join('\n')}\n`);
  console.log(`Merged ${files.length} shard(s), ${rows.length} rows, into ${outPath}`);
  process.exit(0);
}

async function main() {
  if (process.argv.includes('--merge')) mergeAndExit();
  const inv = loadInventory();
  const docs = loadDocs();
  const rows = [];
  let counter = 0;
  const alreadyDone = loadProgress();

  function nextId() {
    counter += 1;
    return `T${SHARD}-${Date.now().toString(36)}-${counter}`;
  }

  // Async (non-blocking) I/O: these run on libuv's thread pool and yield
  // control back to the event loop, so they don't stall the other
  // concurrently-running child_process spawns waiting on this main thread to
  // drain their stdout/stderr pipes. Using the *Sync variants here previously
  // caused a ~5x throughput regression under concurrency.
  let csvHeaderWritten = existsSync(PART_CSV);
  async function appendRow(row) {
    if (!csvHeaderWritten) {
      await writeFile(PART_CSV, CSV_COLUMNS.join(',') + '\n');
      csvHeaderWritten = true;
    }
    await appendFile(PART_CSV, CSV_COLUMNS.map((c) => esc(row[c])).join(',') + '\n');
  }

  async function writeRawLog(testId, executable, args, result) {
    const fname = `${testId}.log`;
    const body = [
      `invocation: ${executable} ${args.join(' ')}`,
      `exit: ${result.status} signal: ${result.signal ?? ''} timedOut: ${Boolean(result.timedOut)}`,
      `--- stdout ---`,
      result.stdout ?? '',
      `--- stderr ---`,
      result.stderr ?? '',
    ].join('\n');
    await writeFile(resolve(RAW_LOGS_DIR, fname), body);
  }

  async function pushRow({ testId, executable, command, args, testType, expected, result, notes, sideEffects, allowNonZero }) {
    const { status, category } = classify(result, expected, { allowNonZero });
    const docInfo = docStatusFor(inv.nodes.find((n) => n.name === command) ?? { path: command.split(' ') }, docs);
    await writeRawLog(testId, executable, args, result);
    const row = {
      test_id: testId,
      executable,
      command,
      full_invocation: `${executable} ${args.join(' ')}`.trim(),
      test_type: testType,
      expected_exit_code: String(expected),
      actual_exit_code: String(result.status ?? (result.error ? 'spawn_error' : 'null')),
      status,
      stdout_summary: truncate(result.stdout),
      stderr_summary: truncate(result.stderr),
      error_detail: result.error ?? (category || ''),
      side_effects: sideEffects ?? 'none observed',
      documentation_status: docInfo.status,
      documentation_issue: docInfo.issue,
      notes: notes ?? '',
    };
    rows.push(row);
    await appendRow(row);
    return status;
  }

  async function skipRow({ executable, command, testType, notes, docInfoNode }) {
    const testId = nextId();
    const docInfo = docStatusFor(docInfoNode, docs);
    const row = {
      test_id: testId,
      executable,
      command,
      full_invocation: '(not invoked)',
      test_type: testType,
      expected_exit_code: '',
      actual_exit_code: '',
      status: 'SKIPPED',
      stdout_summary: '',
      stderr_summary: '',
      error_detail: '',
      side_effects: 'none — invocation intentionally skipped',
      documentation_status: docInfo.status,
      documentation_issue: docInfo.issue,
      notes,
    };
    rows.push(row);
    await appendRow(row);
  }

  const EXECUTABLES = ['lf', 'lenserfight'];
  const CONCURRENCY = Number(argValue('--concurrency', process.env.LF_AUDIT_CONCURRENCY ?? 12));
  const limitRaw = argValue('--limit', process.env.LF_AUDIT_LIMIT ?? null);
  const LIMIT = limitRaw ? Number(limitRaw) : null;

  // ── Root: --version / --help / bare (non-TTY dashboard fallback) ───────────
  // Only the first shard runs this — it's not per-node, so re-running it per
  // shard would just duplicate identical rows.
  if (PHASE === 'finalize' && !alreadyDone.has('(root)')) {
    for (const exe of EXECUTABLES) {
      await pushRow({
        testId: nextId(), executable: exe, command: '(root)', args: ['--version'],
        testType: 'version', expected: 0, result: await runOnce(exe, ['--version']),
        notes: 'top-level --version smoke check',
      });
      await pushRow({
        testId: nextId(), executable: exe, command: '(root)', args: ['--help'],
        testType: 'help', expected: 0, result: await runOnce(exe, ['--help']),
        notes: 'top-level --help smoke check',
      });
      await pushRow({
        testId: nextId(), executable: exe, command: '(root)', args: [],
        testType: 'bare_invocation', expected: 0, result: await runOnce(exe, [], { timeoutMs: 18000 }),
        notes: 'bare invocation opens the TUI dashboard — non-TTY should render one static frame and exit 0. On a cold/fresh HOME (no cached device state) this was observed taking ~7s vs ~2.7s on a warm profile — also acts as sandbox warm-up for subsequent invocations.',
        allowNonZero: true,
      });
    }
    markDone('(root)');
  }

  // ── Groups: help + bare invocation ─────────────────────────────────────────
  const groups0 = inv.nodes.filter((n) => n.isGroup && !alreadyDone.has(n.name));
  const groups = LIMIT ? groups0.slice(0, LIMIT) : groups0;
  await pool(groups, CONCURRENCY, async (node) => {
    for (const exe of EXECUTABLES) {
      const helpId = nextId();
      const helpResult = await runOnce(exe, [...node.path, '--help']);
      await pushRow({
        testId: helpId, executable: exe, command: node.name, args: [...node.path, '--help'],
        testType: 'help', expected: 0, result: helpResult,
        notes: 'group command — lists subcommands',
      });

      const bareId = nextId();
      const bareResult = await runOnce(exe, [...node.path]);
      await pushRow({
        testId: bareId, executable: exe, command: node.name, args: [...node.path],
        testType: 'bare_invocation', expected: 0, result: bareResult,
        notes: 'group command with no subcommand — expect help/usage fallback',
        allowNonZero: true,
      });
    }
    markDone(node.name);
  });

  // ── Leaves ───────────────────────────────────────────────────────────────
  const leaves0 = inv.nodes.filter((n) => n.isLeaf && !n.isDeprecatedAlias && !alreadyDone.has(n.name));
  const leaves = LIMIT ? leaves0.slice(0, LIMIT) : leaves0;
  let done = 0;
  await pool(leaves, CONCURRENCY, async (node) => {
    const key = node.name;
    const denyReason = EXEC_DENYLIST[key];
    const needsArgs = hasRequiredArgs(node);

    for (const exe of EXECUTABLES) {
      // 1. help
      await pushRow({
        testId: nextId(), executable: exe, command: key, args: [...node.path, '--help'],
        testType: 'help', expected: 0,
        result: await runOnce(exe, [...node.path, '--help']),
        notes: '',
      });

      // 2. missing required arg (or bare invocation if none required)
      if (needsArgs) {
        await pushRow({
          testId: nextId(), executable: exe, command: key, args: [...node.path],
          testType: 'missing_required_args', expected: 1,
          result: await runOnce(exe, [...node.path]),
          notes: `required: ${[...node.requiredPositionals, ...node.flags.filter((f) => f.required).map((f) => f.flag)].join(', ')}`,
        });
      } else {
        await skipRow({
          executable: exe, command: key, testType: 'missing_required_args',
          notes: 'command has no required arguments — nothing to omit',
          docInfoNode: node,
        });
      }

      // 3. invalid input (only meaningful if there are required args to corrupt)
      if (needsArgs) {
        const invalidArgs = buildArgs(node, { invalid: true });
        await pushRow({
          testId: nextId(), executable: exe, command: key, args: [...node.path, ...invalidArgs],
          testType: 'invalid_input', expected: 1,
          result: await runOnce(exe, [...node.path, ...invalidArgs]),
          notes: 'synthesized malformed values for required args',
          allowNonZero: true,
        });
      } else {
        await skipRow({
          executable: exe, command: key, testType: 'invalid_input',
          notes: 'command has no required arguments to corrupt',
          docInfoNode: node,
        });
      }

      // 4. valid execution
      if (denyReason) {
        await skipRow({ executable: exe, command: key, testType: 'valid_execution', notes: denyReason, docInfoNode: node });
      } else {
        const validArgs = buildArgs(node, { invalid: false });
        const extra = key === 'setup' ? ['--dry-run', '--skip-open'] : key === 'update' ? ['--check'] : [];
        await pushRow({
          testId: nextId(), executable: exe, command: key, args: [...node.path, ...validArgs, ...extra],
          testType: 'valid_execution', expected: 0,
          result: await runOnce(exe, [...node.path, ...validArgs, ...extra]),
          notes: 'synthesized placeholder values for required args; not domain-accurate data',
          allowNonZero: true,
        });
      }

      // 5. unknown flag
      if (denyReason) {
        await skipRow({ executable: exe, command: key, testType: 'unknown_flag', notes: denyReason, docInfoNode: node });
      } else {
        const validArgs = buildArgs(node, { invalid: false });
        await pushRow({
          testId: nextId(), executable: exe, command: key,
          args: [...node.path, ...validArgs, '--totally-unknown-flag-xyz', '1'],
          testType: 'unknown_flag', expected: 0,
          result: await runOnce(exe, [...node.path, ...validArgs, '--totally-unknown-flag-xyz', '1']),
          notes: 'appends an unrecognized flag to an otherwise-valid invocation',
          allowNonZero: true,
        });
      }

      // 6. repeated execution (only meaningfully distinct for leaves with no
      // required args — otherwise identical to valid_execution above run twice)
      if (denyReason) {
        await skipRow({ executable: exe, command: key, testType: 'repeated_execution', notes: denyReason, docInfoNode: node });
      } else {
        const validArgs = buildArgs(node, { invalid: false });
        const first = await runOnce(exe, [...node.path, ...validArgs]);
        const second = await runOnce(exe, [...node.path, ...validArgs]);
        const idOne = nextId();
        await pushRow({
          testId: idOne, executable: exe, command: key, args: [...node.path, ...validArgs],
          testType: 'repeated_execution (run 1 of 2)', expected: 0, result: first,
          notes: '', allowNonZero: true,
        });
        await pushRow({
          testId: nextId(), executable: exe, command: key, args: [...node.path, ...validArgs],
          testType: 'repeated_execution (run 2 of 2)', expected: 0, result: second,
          notes: (first.status !== second.status) ? `DIVERGED from run 1 (exit ${first.status} -> ${second.status}) — possible state/idempotency issue` : 'consistent with run 1',
          allowNonZero: true,
        });
      }
    }
    markDone(key);
    done += 1;
    if (done % 25 === 0) console.log(`  ...${done}/${leaves.length} leaves done, ${rows.length} rows so far`);
  });

  if (PHASE === 'finalize') {
    // ── Deprecated alias delegation ───────────────────────────────────────────
    const aliasNodes = inv.nodes.filter((n) => n.isDeprecatedAlias);
    for (const node of aliasNodes) {
      for (const exe of EXECUTABLES) {
        await pushRow({
          testId: nextId(), executable: exe, command: node.name, args: [...node.path, '--help'],
          testType: 'alias_delegation', expected: 0,
          result: await runOnce(exe, [...node.path, '--help']),
          notes: `deprecated alias — should warn and delegate to '${node.delegatesTo}'`,
        });
      }
    }

    // ── Top-level lf vs lenserfight full --help parity sweep (every node) ────
    const parityMismatches = [];
    const parityNodes = LIMIT ? inv.nodes.slice(0, LIMIT) : inv.nodes;
    await pool(parityNodes, CONCURRENCY, async (node) => {
      const [a, b] = await Promise.all([
        runOnce('lf', [...node.path, '--help']),
        runOnce('lenserfight', [...node.path, '--help']),
      ]);
      const same = a.status === b.status && a.stdout.replace(/lenserfight/g, '<bin>') === b.stdout.replace(/lenserfight/g, '<bin>');
      if (!same) {
        parityMismatches.push({ command: node.name, lfExit: a.status, lenserfightExit: b.status });
      }
    });
    writeFileSync(resolve(ARTIFACTS_DIR, 'lenserfight-cli-parity-mismatches.json'), JSON.stringify(parityMismatches, null, 2));
    console.log(`Parity mismatches (lf vs lenserfight --help, whole tree): ${parityMismatches.length}`);
  }

  // Rows were already appended to PART_CSV incrementally as they were
  // produced (survives a kill mid-shard) — nothing left to flush here.
  const counts = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});
  console.log(`Shard '${SHARD}' (phase=${PHASE}) wrote ${rows.length} rows to ${PART_CSV}`);
  console.log(`Counts: ${JSON.stringify(counts)}`);
}

main().catch((err) => {
  console.error('HARNESS FATAL ERROR', err);
  process.exit(1);
});
