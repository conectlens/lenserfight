#!/usr/bin/env node
/**
 * Mentor handle sync — substitutes placeholders in mentor-rotation.md and
 * CODEOWNERS from the canonical .github/mentor-handles.json source.
 *
 * Usage:
 *   node tools/sync-mentor-handles.mjs           # rewrites the files
 *   node tools/sync-mentor-handles.mjs --check   # exit 1 if rewrite would change anything
 *
 * Idempotent: re-running with the same JSON produces zero diff.
 *
 * Substitution rules:
 *   - mentor-rotation.md gets the rotation table replaced between
 *     <!-- AUTO-GEN-START rotation --> / <!-- AUTO-GEN-END rotation -->
 *   - CODEOWNERS placeholder lines (lines containing @maintainer-auth,
 *     @maintainer-providers, @maintainer-scoring) are replaced with the
 *     `owners` array from the JSON for the matching area.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { argv, exit } from 'node:process'
import { resolve } from 'node:path'

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname)
const HANDLES_PATH = resolve(REPO_ROOT, '.github/mentor-handles.json')
const ROTATION_MD = resolve(REPO_ROOT, 'docs/how-to/contributors/mentor-rotation.md')
const CODEOWNERS = resolve(REPO_ROOT, 'CODEOWNERS')

const isCheck = argv.includes('--check')

const handles = JSON.parse(readFileSync(HANDLES_PATH, 'utf-8'))
const { areas, rotation_start_iso, rotation_weeks } = handles

function buildRotationTable() {
  const start = new Date(rotation_start_iso + 'T00:00:00Z')
  const lines = []
  lines.push('| Week | Auth | Providers | Scoring |')
  lines.push('|---|---|---|---|')
  for (let w = 0; w < rotation_weeks; w++) {
    const monday = new Date(start.getTime() + w * 7 * 86400000)
    const iso = monday.toISOString().slice(0, 10)
    const auth = w % 2 === 0 ? areas.auth.primary : areas.auth.secondary
    const providers = w % 2 === 0 ? areas.providers.primary : areas.providers.secondary
    const scoring = w % 2 === 0 ? areas.scoring.primary : areas.scoring.secondary
    lines.push(`| Week of ${iso} | ${auth} | ${providers} | ${scoring} |`)
  }
  return lines.join('\n')
}

function rewriteRotationMd(md) {
  const table = buildRotationTable()
  const startMarker = '<!-- AUTO-GEN-START rotation -->'
  const endMarker = '<!-- AUTO-GEN-END rotation -->'
  const block = `${startMarker}\n${table}\n${endMarker}`

  if (md.includes(startMarker) && md.includes(endMarker)) {
    return md.replace(
      new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`),
      block,
    )
  }
  // First run: append the block at the end of the file (after a blank line).
  return md.replace(/\n*$/, `\n\n${block}\n`)
}

function rewriteCodeowners(text) {
  const ownersByArea = {
    'auth': areas.auth.owners.join(' '),
    'providers': areas.providers.owners.join(' '),
    'scoring': areas.scoring.owners.join(' '),
  }

  // Replace any line that mentions the placeholder handle for an area; preserve
  // the leading path token and any whitespace.
  const placeholderToArea = {
    '@maintainer-auth': 'auth',
    '@maintainer-providers': 'providers',
    '@maintainer-scoring': 'scoring',
  }

  return text
    .split('\n')
    .map((line) => {
      for (const [placeholder, area] of Object.entries(placeholderToArea)) {
        if (line.includes(placeholder)) {
          // Keep the leading path token; replace the rest of the line with the owner list.
          const [path] = line.trim().split(/\s+/)
          if (!path || path.startsWith('#')) return line
          return `${path} ${ownersByArea[area]}`
        }
      }
      return line
    })
    .join('\n')
}

const beforeRotation = readFileSync(ROTATION_MD, 'utf-8')
const beforeCodeowners = readFileSync(CODEOWNERS, 'utf-8')

const afterRotation = rewriteRotationMd(beforeRotation)
const afterCodeowners = rewriteCodeowners(beforeCodeowners)

const rotationChanged = afterRotation !== beforeRotation
const codeownersChanged = afterCodeowners !== beforeCodeowners

if (isCheck) {
  if (rotationChanged || codeownersChanged) {
    console.error('Mentor handles out of sync. Run `node tools/sync-mentor-handles.mjs` to refresh.')
    if (rotationChanged) console.error('  - docs/how-to/contributors/mentor-rotation.md needs rewrite')
    if (codeownersChanged) console.error('  - CODEOWNERS needs rewrite')
    exit(1)
  }
  console.log('Mentor handles in sync.')
  exit(0)
}

if (rotationChanged) {
  writeFileSync(ROTATION_MD, afterRotation)
  console.log('Rewrote docs/how-to/contributors/mentor-rotation.md')
}
if (codeownersChanged) {
  writeFileSync(CODEOWNERS, afterCodeowners)
  console.log('Rewrote CODEOWNERS')
}
if (!rotationChanged && !codeownersChanged) {
  console.log('No changes — files already in sync.')
}
