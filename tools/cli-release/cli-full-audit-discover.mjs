#!/usr/bin/env node
// Recursive command-tree discovery for the LenserFight CLI, driven entirely
// by the built binary's own --help output (never trusts docs or source).
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : (process.argv[i + 1] ?? fallback);
}

const WORKSPACE_ROOT = resolve(__dirname, '../..');
const SANDBOX_HOME = argValue('--sandbox-home', process.env.LF_AUDIT_SANDBOX_HOME ?? resolve(tmpdir(), 'lf-cli-audit', 'home'));
const SANDBOX_WORK = argValue('--sandbox-work', process.env.LF_AUDIT_SANDBOX_WORK ?? resolve(tmpdir(), 'lf-cli-audit', 'work'));
const MAIN_JS = resolve(argValue('--package-dir', resolve(WORKSPACE_ROOT, 'dist/apps/cli')), 'main.js');
const ARTIFACTS_DIR = argValue('--out-dir', resolve(WORKSPACE_ROOT, 'artifacts'));

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

// Top-level names that delegate wholesale to another top-level command and
// warn as a side effect of being resolved (see command-inventory.ts). We
// test the alias delegation itself but do not recurse into it a second time.
const DEPRECATED_DELEGATES = { runner: 'lenser', agent: 'agents' };

function runHelp(pathArr) {
  const r = spawnSync('node', [MAIN_JS, ...pathArr, '--help'], {
    cwd: SANDBOX_WORK,
    env: ENV,
    encoding: 'utf8',
    timeout: 10000,
    input: '',
  });
  return r;
}

function parseHelp(text) {
  const clean = text ?? '';
  const usageMatch = clean.match(/\nUSAGE ([^\n]+)\n/);
  const usageLine = usageMatch ? usageMatch[1].trim() : '';
  const commandsSection = clean.split(/\n\s*COMMANDS\s*\n/)[1];
  let children = [];
  if (commandsSection) {
    // Section ends at the next all-caps heading, blank+blank, or the trailing "Use ..." line
    const body = commandsSection.split(/\n\n(?:Use )/)[0];
    const lines = body.split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*([a-z][a-z0-9-]*)\s{2,}/);
      if (m) children.push(m[1]);
    }
  }
  const optionsSection = clean.split(/\n\s*OPTIONS\s*\n/)[1]?.split(/\n\n[A-Z]+\n/)[0] ?? '';
  const flags = [];
  for (const line of optionsSection.split('\n')) {
    const m = line.match(/^\s{2}(--[a-zA-Z0-9-]+)(="[^"]*")?\s*(\(required\))?/);
    if (m) flags.push({ flag: m[1], hasDefault: Boolean(m[2]), required: Boolean(m[3]) });
  }
  const argsSection = clean.split(/\n\s*ARGUMENTS\s*\n/)[1]?.split(/\n\n[A-Z]+\n/)[0] ?? '';
  const positionals = [];
  for (const line of argsSection.split('\n')) {
    const m = line.match(/^\s{2}([A-Z][A-Z0-9_]*)\s{2,}/);
    if (m) positionals.push(m[1]);
  }
  // Required-positional detection straight from the USAGE line: <NAME> vs [NAME]
  const requiredPositionals = [...usageLine.matchAll(/<([A-Z0-9_]+)>/g)].map((m) => m[1]);
  const descMatch = clean.match(/^([^\n]*?)\s*\([^)]*\)\n/);
  const description = descMatch ? descMatch[1].trim() : '';
  return { usageLine, children, flags, positionals, requiredPositionals, description };
}

const inventory = []; // flat list of every node (group or leaf)
const seenPaths = new Set();

function walk(pathArr, depth) {
  const key = pathArr.join(' ');
  if (seenPaths.has(key)) return;
  seenPaths.add(key);

  const isDeprecatedDelegate = pathArr.length === 1 && DEPRECATED_DELEGATES[pathArr[0]];
  const r = runHelp(pathArr);
  const ok = r.status === 0 && !r.error;
  const parsed = parseHelp(r.stdout ?? '');
  const warned = /deprecated/i.test(r.stderr ?? '');

  const node = {
    path: pathArr,
    name: key || '(root)',
    depth,
    isGroup: parsed.children.length > 0,
    isLeaf: parsed.children.length === 0,
    description: parsed.description,
    usageLine: parsed.usageLine,
    flags: parsed.flags,
    positionals: parsed.positionals,
    requiredPositionals: parsed.requiredPositionals,
    helpExitCode: r.status,
    helpOk: ok,
    isDeprecatedAlias: Boolean(isDeprecatedDelegate),
    delegatesTo: isDeprecatedDelegate || null,
    deprecationWarned: warned,
  };
  inventory.push(node);

  if (isDeprecatedDelegate) return; // don't re-walk the delegate's whole subtree twice

  for (const child of parsed.children) {
    walk([...pathArr, child], depth + 1);
  }
}

// Discover top level first
const rootHelp = runHelp([]);
const rootParsed = parseHelp(rootHelp.stdout ?? '');
for (const top of rootParsed.children) {
  walk([top], 1);
}

mkdirSync(ARTIFACTS_DIR, { recursive: true });
const outPath = resolve(ARTIFACTS_DIR, 'lenserfight-cli-command-inventory.json');
writeFileSync(outPath, JSON.stringify({ generatedAt: null, topLevel: rootParsed.children, nodeCount: inventory.length, nodes: inventory }, null, 2));

const leaves = inventory.filter((n) => n.isLeaf && !n.isDeprecatedAlias);
const groups = inventory.filter((n) => n.isGroup);
console.log(`Discovered ${inventory.length} nodes (${groups.length} groups, ${leaves.length} leaves) across ${rootParsed.children.length} top-level commands.`);
console.log(`Wrote inventory to ${outPath}`);
