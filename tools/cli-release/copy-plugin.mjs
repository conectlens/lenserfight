#!/usr/bin/env node
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '../..');

const source = resolve(workspaceRoot, 'dist/libs/adapters/opencode-plugin/lf-plugin.js');
const destination = resolve(workspaceRoot, 'dist/apps/cli/lf-plugin.js');

if (!existsSync(source)) {
  console.error(`Plugin bundle not found: ${source}`);
  console.error('Run `pnpm nx run adapters-opencode:bundle-plugin` first.');
  process.exit(1);
}

copyFileSync(source, destination);
console.log(`Copied ${source} -> ${destination}`);
