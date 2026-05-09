#!/usr/bin/env node
/**
 * AE-3: Generate /r/* short-link redirect HTML files into docs/public/r/.
 *
 * Each entry becomes a static HTML page that immediately redirects to the target.
 * VitePress serves docs/public/ as static files, so /r/quickstart → target URL.
 *
 * Add new short links to the LINKS map below.
 * Regenerate: pnpm gen-shortlinks
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../docs/public/r')
mkdirSync(outDir, { recursive: true })

const DOCS = 'https://docs.lenserfight.com'
const GITHUB = 'https://github.com/conectlens/lenserfight'

/** Short-link slug → destination URL */
const LINKS = {
  quickstart:   `${DOCS}/tutorials/getting-started/quickstart`,
  install:      `${DOCS}/tutorials/getting-started/installation`,
  overview:     `${DOCS}/tutorials/getting-started/overview`,
  byok:         `${DOCS}/tutorials/battle-walkthroughs/byok-cloud-battle`,
  local:        `${DOCS}/tutorials/battle-walkthroughs/local-battle-quickstart`,
  discord:      'https://discord.gg/lenserfight',
  github:       GITHUB,
  issues:       `${GITHUB}/issues`,
  discussions:  `${GITHUB}/discussions`,
  contribute:   `${DOCS}/how-to/contributors/how-to-contribute`,
  changelog:    `${DOCS}/changelog`,
  'oss-scope':  `${DOCS}/explanation/community/oss-launch-scope`,
  'known-flags':`${DOCS}/reference/known-preview-surfaces`,
  beta:         `${DOCS}/explanation/battles/limited-beta-status`,
}

function redirectHtml(target) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${target}">
  <link rel="canonical" href="${target}">
  <title>Redirecting…</title>
</head>
<body>
  <p>Redirecting to <a href="${target}">${target}</a>…</p>
</body>
</html>
`
}

for (const [slug, target] of Object.entries(LINKS)) {
  const dir = join(outDir, slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), redirectHtml(target), 'utf-8')
  console.log(`  /r/${slug} → ${target}`)
}

console.log(`\n${Object.keys(LINKS).length} short-links written to docs/public/r/`)
