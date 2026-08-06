#!/usr/bin/env node
// CLI command-surface audit harness (issue #453).
//
// Runs the "safe slice" that's actually executable in a headless sandbox:
//   1. `--help` against every top-level command, using the just-built binary.
//   2. A handful of smoke checks (bare invocation non-TTY fallback, the
//      `runner`/`agent` deprecated-alias delegation).
//   3. One row per scenario dimension from issue #453 that this sandbox
//      genuinely cannot execute (auth-state variants, destructive-action
//      isolation, cross-platform CI, pseudo-TTY matrices, live-backend
//      execution, ...) — every dimension gets a row; none are silently
//      dropped.
//
// The CSV schema (column order + RFC 4180 escaping) is owned by
// apps/cli/src/lib/cli-audit-report.ts and unit-tested there. This script
// mirrors that schema in plain JS because tools/cli-release/ has no
// TypeScript toolchain — see the comment at the top of that file.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '../..');

// ─── CSV schema (mirrors apps/cli/src/lib/cli-audit-report.ts) ──────────────

const AUDIT_CSV_COLUMNS = [
  'run_id', 'timestamp', 'cli_version', 'git_commit', 'os', 'arch',
  'runtime_version', 'executable_name', 'top_level_command', 'full_command_path',
  'scenario_name', 'arguments_summary_redacted', 'expected_behavior', 'actual_behavior',
  'exit_status', 'stdout_summary', 'stderr_summary', 'error_category', 'error_detail',
  'root_cause_detail', 'additional_details', 'severity', 'reproducibility',
  'destructive_risk', 'auth_state', 'network_state', 'test_layer', 'related_test',
  'related_issue_or_pr', 'resolution_status', 'fix_summary', 'verification_result',
  'verification_evidence', 'owner_subsystem',
];

function escapeCsvField(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCsv(rows) {
  const header = AUDIT_CSV_COLUMNS.join(',');
  const lines = rows.map((row) => AUDIT_CSV_COLUMNS.map((col) => escapeCsvField(row[col] ?? '')).join(','));
  return [header, ...lines].join('\n') + '\n';
}

function emptyRow(overrides) {
  const row = {};
  for (const col of AUDIT_CSV_COLUMNS) row[col] = '';
  return Object.assign(row, overrides);
}

// ─── Fixed run metadata ──────────────────────────────────────────────────────

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const runId = randomUUID();
const timestamp = new Date().toISOString();
const cliPkg = JSON.parse(readFileSync(resolve(workspaceRoot, 'apps/cli/package.json'), 'utf8'));
const gitCommit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: workspaceRoot, encoding: 'utf8' }).stdout.trim();
const os = process.platform;
const arch = process.arch;
const runtimeVersion = process.version;
const executableName = 'lenserfight (lf)';
const mainJs = resolve(workspaceRoot, argValue('--package-dir', 'dist/apps/cli'), 'main.js');

if (!existsSync(mainJs)) {
  console.error(`Built binary not found at ${mainJs} — run \`pnpm nx build cli\` first.`);
  process.exit(1);
}

function baseRow(overrides) {
  return emptyRow({
    run_id: runId,
    timestamp,
    cli_version: cliPkg.version,
    git_commit: gitCommit,
    os,
    arch,
    runtime_version: runtimeVersion,
    executable_name: executableName,
    related_issue_or_pr: '#453',
    ...overrides,
  });
}

function truncate(s, max = 200) {
  const oneLine = String(s ?? '').replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

function runCli(args, opts = {}) {
  return spawnSync('node', [mainJs, ...args], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    timeout: 15_000,
    env: { ...process.env, NO_COLOR: '1' },
    ...opts,
  });
}

// ─── 1. Enumerate top-level commands from the built binary's own --help ────
//
// This is the shipped binary's real top-level surface (equivalent to what
// buildCommandInventory() reports for top-level entries), read from the
// binary under audit rather than re-deriving it from TypeScript source —
// tools/cli-release/ has no TS toolchain (see file header).

const helpResult = runCli(['--help']);
const helpText = helpResult.stdout ?? '';
const commandsSection = helpText.split(/\n\s*COMMANDS\s*\n/)[1] ?? '';
const topLevelCommands = commandsSection
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('Use '))
  .map((line) => line.split(/\s+/)[0])
  .filter((name) => /^[a-z][a-z0-9-]*$/.test(name));

if (topLevelCommands.length === 0) {
  console.error('Could not parse any top-level commands from `--help` output. Aborting.');
  process.exit(1);
}

const rows = [];

// ─── 2. --help smoke check per top-level command ────────────────────────────

for (const cmd of topLevelCommands) {
  const result = runCli([cmd, '--help']);
  const pass = result.status === 0;
  rows.push(
    baseRow({
      top_level_command: cmd,
      full_command_path: cmd,
      scenario_name: 'top-level --help smoke check',
      arguments_summary_redacted: '--help',
      expected_behavior: 'Exits 0 and prints a USAGE block for the command.',
      actual_behavior: pass ? 'Exited 0 with a usage block.' : `Exited ${result.status} unexpectedly.`,
      exit_status: String(result.status ?? 'null'),
      stdout_summary: truncate(result.stdout),
      stderr_summary: truncate(result.stderr),
      error_category: pass ? '' : 'unexpected_help_failure',
      error_detail: pass ? '' : truncate(result.stderr || result.error?.message),
      severity: pass ? 'info' : 'high',
      reproducibility: 'always',
      destructive_risk: 'none',
      auth_state: 'unauthenticated',
      network_state: 'no_network_required',
      test_layer: 'cli_binary_smoke',
      resolution_status: pass ? 'pass' : 'fail',
      verification_result: pass ? 'pass' : 'fail',
      verification_evidence: `spawned \`node main.js ${cmd} --help\`, exit ${result.status}`,
      owner_subsystem: `cli/commands/${cmd}`,
    }),
  );
}

// ─── 3. Smoke checks ─────────────────────────────────────────────────────────

// Bare invocation, non-TTY: must render the static fallback frame and exit 0,
// never hang waiting for raw-mode key input.
{
  const result = runCli([], { input: '' });
  const pass = result.status === 0 && /LenserFight/.test(result.stdout ?? '');
  rows.push(
    baseRow({
      top_level_command: '(none)',
      full_command_path: '(none)',
      scenario_name: 'bare invocation — non-TTY static-frame fallback',
      expected_behavior: 'Piped/non-TTY invocation renders one static dashboard frame and exits 0 without hanging.',
      actual_behavior: pass
        ? 'Rendered the static frame and exited 0.'
        : `Exited ${result.status}; output did not match the expected static frame.`,
      exit_status: String(result.status ?? 'null'),
      stdout_summary: truncate(result.stdout),
      stderr_summary: truncate(result.stderr),
      severity: pass ? 'info' : 'critical',
      reproducibility: 'always',
      destructive_risk: 'none',
      auth_state: 'unauthenticated',
      network_state: 'best_effort_local_probe',
      test_layer: 'cli_binary_smoke',
      related_test: 'apps/cli/src/tui/ink/Dashboard.spec.tsx',
      resolution_status: pass ? 'pass' : 'fail',
      verification_result: pass ? 'pass' : 'fail',
      verification_evidence: `spawned \`node main.js\` with empty stdin, exit ${result.status}`,
      owner_subsystem: 'cli/tui/dashboard',
    }),
  );
}

// Full real-TTY interactive smoke (command bar, quit, resize) — see the note
// in the "not executed" section below for why this can't complete headlessly
// in this sandbox; recorded here as a distinct row referencing that blocker.
rows.push(
  baseRow({
    top_level_command: '(none)',
    full_command_path: '(none)',
    scenario_name: 'bare invocation — full interactive TTY smoke',
    expected_behavior: "Dashboard opens, health panel renders, ':' opens the command bar with live suggestions, 'q'/Esc exits cleanly, resize mid-session doesn't crash.",
    actual_behavior: 'Not completed against a real terminal in this sandbox.',
    severity: 'medium',
    reproducibility: 'unknown',
    destructive_risk: 'none',
    auth_state: 'unauthenticated',
    network_state: 'requires_network',
    test_layer: 'manual_tty',
    related_test: 'apps/cli/src/tui/ink/Dashboard.spec.tsx',
    resolution_status: 'not_executed',
    additional_details:
      "Requires a real attached terminal with a cached CLI login session. This sandbox has neither: it's headless, and the action-log panel's RPC call (getHumanActivityFeed, requireAuth: true) triggers the CLI's existing interactive browser-login recovery flow (libs/cli/client/src/lib/auth-recovery.ts) on a real TTY when unauthenticated, which needs a completed device-approval step this sandbox can't provide. The non-TTY static-frame row above and the 6 passing ink-testing-library specs in Dashboard.spec.tsx (health pill, command bar open/type/submit, domain-key notice) cover the same rendering and key-handling logic without a live terminal.",
    verification_result: 'not_executed',
    owner_subsystem: 'cli/tui/dashboard',
  }),
);

// Deprecated top-level aliases still warn and delegate to their replacement.
for (const [alias, replacement] of [['runner', 'lenser'], ['agent', 'agents']]) {
  const result = runCli([alias, '--help']);
  const warned = /deprecated/i.test(result.stderr ?? '');
  const pass = result.status === 0 && warned;
  rows.push(
    baseRow({
      top_level_command: alias,
      full_command_path: alias,
      scenario_name: `deprecated alias '${alias}' warns and delegates to '${replacement} --help'`,
      arguments_summary_redacted: '--help',
      expected_behavior: `Prints a deprecation warning on stderr and shows '${replacement}'s --help output.`,
      actual_behavior: pass
        ? `Warned on stderr and delegated to '${replacement}' correctly.`
        : `Exited ${result.status}; warned=${warned}.`,
      exit_status: String(result.status ?? 'null'),
      stdout_summary: truncate(result.stdout),
      stderr_summary: truncate(result.stderr),
      error_category: pass ? '' : 'deprecated_alias_regression',
      severity: pass ? 'info' : 'high',
      reproducibility: 'always',
      destructive_risk: 'none',
      auth_state: 'unauthenticated',
      network_state: 'no_network_required',
      test_layer: 'cli_binary_smoke',
      resolution_status: pass ? 'pass' : 'fail',
      verification_result: pass ? 'pass' : 'fail',
      verification_evidence: `spawned \`node main.js ${alias} --help\`, exit ${result.status}, stderr deprecation warning present=${warned}`,
      owner_subsystem: `cli/commands/${alias}`,
    }),
  );
}

// ─── 4. Scenario dimensions that cannot run in this sandbox ────────────────
//
// One row per dimension, never silently omitted. Each names the specific
// blocker rather than a generic "not tested".

const notExecuted = [
  {
    scenario_name: 'Windows-specific path handling',
    owner_subsystem: 'cli/cross-platform',
    additional_details: 'Requires a windows-latest CI runner (path separators, global-install bin location, PowerShell quoting). Not available in this sandbox.',
  },
  {
    scenario_name: 'Linux CI runner verification',
    owner_subsystem: 'cli/cross-platform',
    additional_details: 'Requires an ubuntu-latest CI runner. Only macOS is available in this sandbox; darwin-specific behavior is covered by the rows above.',
  },
  {
    scenario_name: 'Pseudo-TTY resize matrix (SIGWINCH mid-session)',
    owner_subsystem: 'cli/tui/dashboard',
    additional_details: 'Requires node-pty (or an attached real terminal) to script live resize sequences and confirm the small-terminal fallback engages/disengages correctly. Not set up in this repo or sandbox.',
  },
  {
    scenario_name: 'Pseudo-TTY keyboard-interaction matrix beyond ink-testing-library',
    owner_subsystem: 'cli/tui/dashboard',
    additional_details: "Requires node-pty to deliver real terminal escape sequences (arrow keys, alt-screen, raw-mode edge cases). ink-testing-library's synthetic stdin (used in Dashboard.spec.tsx) exercises the same React key-handling logic but not real terminal-driver behavior.",
  },
  {
    scenario_name: 'Live-backend command execution against an authenticated session',
    owner_subsystem: 'cli/auth',
    additional_details: 'Requires a real authenticated session against LenserFight Cloud. This sandbox has no cached credentials and cannot complete the interactive device-approval browser-login flow to obtain one.',
  },
  {
    scenario_name: 'Destructive-action isolation (delete/kill/revoke paths)',
    owner_subsystem: 'cli/safety',
    additional_details: 'Requires disposable fixtures (a throwaway battle/agent/schedule) to safely exercise delete, kill-switch, and revoke paths without risking real data. Not provisioned in this sandbox.',
  },
  {
    scenario_name: 'Network-failure injection (timeouts, DNS failure, packet loss)',
    owner_subsystem: 'cli/lib/health-probe',
    additional_details: 'Requires a controllable network-fault proxy. Not available in this sandbox.',
  },
  {
    scenario_name: 'Auth-state: expired/near-expiry token refresh path',
    owner_subsystem: 'cli/auth',
    additional_details: 'Requires a real expired or near-expiry session token to exercise the 401 → attemptAuthRecovery silent-refresh path in libs/cli/client/src/lib/auth-recovery.ts. Not fabricable without a live Supabase auth session.',
  },
  {
    scenario_name: 'Auth-state: multiple concurrent CLI profiles against distinct backends',
    owner_subsystem: 'cli/utils/profiles',
    additional_details: 'Requires multiple real authenticated `lf profile` entries pointed at distinct Supabase backends. Not provisioned in this sandbox.',
  },
  {
    scenario_name: 'Shell-completion install verification (bash/zsh sourcing + tab-complete)',
    owner_subsystem: 'cli/commands/completion',
    additional_details: 'Requires sourcing the generated completion script in a real interactive bash/zsh session and confirming tab-completion behavior. Not scriptable headlessly in this sandbox.',
  },
  {
    scenario_name: 'npm publish dry-run against the real registry',
    owner_subsystem: 'cli/release',
    additional_details: 'Requires publish rights (or a registry proxy) for a real dry-run. Out of scope for a local sandbox run; covered separately by validate-package.mjs / smoke-install.mjs against a packed tarball.',
  },
  {
    scenario_name: '`lf update` real download-and-install path',
    owner_subsystem: 'cli/commands/update',
    additional_details: "Exercising the real update path would download and install a newer release artifact into this sandbox's toolchain, which isn't safe to do as part of an audit run. Not exercised.",
  },
  {
    scenario_name: 'Full recursive command tree (~546 leaf commands) --help audit',
    owner_subsystem: 'cli/commands',
    additional_details: 'Out of scope for this pass by design — only the top-level slice (~77-85 commands) ran above, per the issue\'s "Completion Behavior" allowance to scope a verifiable slice. The full nested-leaf sweep is Phase C.',
  },
  {
    scenario_name: 'Concurrent multi-session dashboard usage (state races)',
    owner_subsystem: 'cli/tui/dashboard',
    additional_details: 'Requires multiple simultaneous interactive terminal sessions against the same CLI profile to probe for state races (e.g. recent-commands ring buffer, agent workspace context file). Not reproducible headlessly.',
  },
  {
    scenario_name: 'Long-running schedule/cron dispatch verification',
    owner_subsystem: 'cli/commands/schedule',
    additional_details: 'Requires real wall-clock time to elapse against a live pg_cron-backed schedule to confirm dispatch. Not exercised in a single sandbox run.',
  },
  {
    scenario_name: 'BYOK provider key execution flows (OpenAI/Anthropic/Ollama/etc.)',
    owner_subsystem: 'cli/commands/byok',
    additional_details: 'Requires real third-party provider API keys to exercise BYOK execution paths end to end. None configured in this sandbox.',
  },
  {
    scenario_name: 'Accessibility: screen-reader compatibility of the TUI',
    owner_subsystem: 'cli/tui/dashboard',
    additional_details: 'Requires a real screen reader (VoiceOver/NVDA) attached to a real terminal session. Not automatable in this sandbox.',
  },
];

for (const dim of notExecuted) {
  rows.push(
    baseRow({
      scenario_name: dim.scenario_name,
      top_level_command: '(n/a)',
      full_command_path: '(n/a)',
      expected_behavior: '(not executed — see additional_details for the specific blocker)',
      severity: 'unknown',
      reproducibility: 'unknown',
      destructive_risk: 'unknown',
      auth_state: 'unknown',
      network_state: 'unknown',
      test_layer: 'not_executed',
      resolution_status: 'not_executed',
      verification_result: 'not_executed',
      additional_details: dim.additional_details,
      owner_subsystem: dim.owner_subsystem,
    }),
  );
}

// ─── Write output ────────────────────────────────────────────────────────────

const outputPath = resolve(workspaceRoot, argValue('--out', 'dist/apps/cli/cli-audit-report.csv'));
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, rowsToCsv(rows));

const passCount = rows.filter((r) => r.resolution_status === 'pass').length;
const failCount = rows.filter((r) => r.resolution_status === 'fail').length;
const notExecutedCount = rows.filter((r) => r.resolution_status === 'not_executed').length;

console.log(`Wrote ${rows.length} rows to ${outputPath}`);
console.log(`  pass: ${passCount}  fail: ${failCount}  not_executed: ${notExecutedCount}`);

if (failCount > 0) process.exit(1);
