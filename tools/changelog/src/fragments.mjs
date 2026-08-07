/**
 * fragments.mjs — parse and load .changes/<pr-number>.md fragments.
 *
 * This is the only place PR-level user-facing prose enters the pipeline.
 * Nothing here reads git commit messages.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parse as parseYaml } from 'yaml'

import { validateFragmentSchema } from './schema-validator.mjs'

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

/**
 * Parse one fragment file's raw content.
 * Returns { valid: true, fragment, body } or { valid: false, errors }.
 */
export function parseFragmentContent(raw) {
  const match = FRONT_MATTER_RE.exec(raw)
  if (!match) {
    return { valid: false, errors: ['Fragment is missing YAML front matter (--- ... ---).'] }
  }
  let frontmatter
  try {
    frontmatter = parseYaml(match[1]) ?? {}
  } catch (err) {
    return { valid: false, errors: [`Front matter is not valid YAML: ${err.message}`] }
  }
  const result = validateFragmentSchema(frontmatter)
  if (!result.valid) return { valid: false, errors: result.errors }
  return { valid: true, fragment: frontmatter, body: match[2].trim() }
}

const PR_NUMBER_FILENAME_RE = /^(\d+)\.md$/

/**
 * Load and validate every fragment in `dir` (typically the repo's .changes/ dir).
 * Returns { fragments: Map<prNumber, {fragment, body}>, invalid: Array<{file, errors}> }.
 * Never throws on a single bad fragment — malformed files surface as `invalid`
 * entries so the CI gate can report them without crashing the whole build.
 */
export function loadFragments(dir) {
  const fragments = new Map()
  const invalid = []
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return { fragments, invalid }
  }
  for (const file of entries) {
    const m = PR_NUMBER_FILENAME_RE.exec(file)
    if (!m) continue
    const prNumber = Number(m[1])
    const raw = readFileSync(join(dir, file), 'utf-8')
    const parsed = parseFragmentContent(raw)
    if (!parsed.valid) {
      invalid.push({ file, errors: parsed.errors })
      continue
    }
    if (fragments.has(prNumber)) {
      invalid.push({ file, errors: [`Duplicate fragment for PR #${prNumber}.`] })
      continue
    }
    fragments.set(prNumber, { ...parsed.fragment, prNumber, body: parsed.body })
  }
  return { fragments, invalid }
}
