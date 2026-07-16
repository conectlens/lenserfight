#!/usr/bin/env node
// Bundles an app's SEO edge Worker into dist/apps/<app>/_worker.js for
// Cloudflare Pages "advanced mode" (a single _worker.js at the output root
// intercepts every request and calls env.ASSETS for the SPA).
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const app = process.argv[2]
if (app !== 'web' && app !== 'arena') {
  console.error('Usage: node tools/seo/build-worker.mjs <web|arena>')
  process.exit(1)
}

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const entry = resolve(workspaceRoot, `apps/${app}/worker/index.ts`)
const outfile = resolve(workspaceRoot, `dist/apps/${app}/_worker.js`)

if (!existsSync(entry)) {
  console.error(`No worker entry at ${entry} — skipping worker bundle for ${app}.`)
  process.exit(0)
}

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'browser', // Cloudflare Workers runtime is browser-like (fetch/Response/CompressionStream/caches)
  target: 'es2022',
  tsconfig: resolve(workspaceRoot, 'tsconfig.base.json'), // resolves @lenserfight/* path aliases
  minify: true,
  logLevel: 'info',
})

console.log(`Bundled ${app} SEO worker → dist/apps/${app}/_worker.js`)
