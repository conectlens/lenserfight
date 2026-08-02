#!/usr/bin/env node
import { chmodSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '../..');

const distRoot = resolve(workspaceRoot, 'vendor/opencode/packages/opencode/dist');
if (!existsSync(distRoot)) {
  console.error(`Assist runtime build output not found: ${distRoot}`);
  console.error('Run `pnpm nx run vendor-opencode:build` first.');
  process.exit(1);
}

// Local/dev builds (`--single`) produce exactly one `<name>/bin/opencode` target
// for the current platform. Multi-platform release packaging (one binary per
// published platform variant) is separate, CI-side work — see release-cli.yml.
const targetDir = readdirSync(distRoot).find((name) => existsSync(resolve(distRoot, name, 'bin/opencode')));
if (!targetDir) {
  console.error(`No built assist runtime binary found under ${distRoot}`);
  process.exit(1);
}

const source = resolve(distRoot, targetDir, 'bin/opencode');
const destination = resolve(workspaceRoot, 'dist/apps/cli/lf-assist');

copyFileSync(source, destination);
chmodSync(destination, 0o755);
console.log(`Copied ${source} -> ${destination}`);
