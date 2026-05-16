#!/usr/bin/env node
/**
 * gen-cli-docs.mjs — Generate Markdown reference pages for top-level CLI
 * commands by parsing each `apps/cli/src/commands/<name>.ts` file for the
 * defineCommand({ meta: { name, description }, args: {...}, subCommands })
 * shape.
 *
 * Output: docs/en/reference/cli/<name>.md, with manual prose preserved between
 * <!-- AUTO-GEN-START --> and <!-- AUTO-GEN-END --> sentinels.
 *
 * Flags:
 *   --check  Run gen, then `git status --porcelain docs/en/reference/cli/`. Exit
 *            1 if any output changed (CI drift gate).
 *
 * Implementation note: we do not import the compiled CLI at runtime — that
 * pulls in the entire dependency graph including @supabase/supabase-js and
 * the LenserFight providers, which would slow down the docs CI step
 * dramatically. Regex-parsing the source is sufficient for the public
 * subset of the API we want to document.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')

const COMMANDS_DIR = resolve(repoRoot, 'apps/cli/src/commands')
const OUT_DIR = resolve(repoRoot, 'docs/en/reference/cli')
const SENTINEL_START = '<!-- AUTO-GEN-START -->'
const SENTINEL_END = '<!-- AUTO-GEN-END -->'

const checkMode = process.argv.includes('--check')

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

// ─── 1. Discover top-level commands ───────────────────────────────────────
//
// A "top-level" command is a .ts file (not a .spec.ts) whose default
// defineCommand has a `meta.name` and at least one `subCommands:` block. We
// also include single-command files (no subCommands).

const files = readdirSync(COMMANDS_DIR)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
  .map((f) => ({ name: f.replace(/\.ts$/, ''), path: join(COMMANDS_DIR, f) }))

function extractMeta(src) {
  const m = src.match(/meta\s*:\s*\{([\s\S]*?)\}/)
  if (!m) return null
  const block = m[1]
  const name = (block.match(/name\s*:\s*['"]([^'"]+)['"]/) || [])[1]
  const desc = (block.match(/description\s*:\s*['"]([^'"]+)['"]/) || [])[1]
  return name ? { name, description: desc ?? '' } : null
}

function extractSubCommands(src) {
  // Find `subCommands: { ... }` block at the top-level export.
  const idx = src.indexOf('subCommands')
  if (idx === -1) return []
  const tail = src.slice(idx)
  const open = tail.indexOf('{')
  if (open === -1) return []
  let depth = 0
  let end = -1
  for (let i = open; i < tail.length; i++) {
    if (tail[i] === '{') depth++
    else if (tail[i] === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) return []
  const block = tail.slice(open + 1, end)
  // Pull each "key: identifier" or "'key': identifier" entry.
  const subRe = /(?:'([^']+)'|([\w-]+))\s*:\s*([\w$]+)/g
  const out = []
  let mm
  while ((mm = subRe.exec(block)) !== null) {
    const key = mm[1] || mm[2]
    const ref = mm[3]
    if (key) out.push({ key, identifier: ref })
  }
  return out
}

function extractCommandDef(src, identifier) {
  // Find `const <identifier> = defineCommand({ ... })` block.
  const re = new RegExp(`const\\s+${identifier}\\s*=\\s*defineCommand\\s*\\(\\s*\\{`, 'm')
  const m = src.match(re)
  if (!m) return null
  const start = (m.index ?? 0) + m[0].length - 1 // index of opening {
  let depth = 0
  let end = -1
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) return null
  const block = src.slice(start, end + 1)
  const meta = extractMeta(block)
  return { meta, raw: block }
}

function extractArgs(block) {
  // Find `args: { ... }` and parse each top-level key.
  const idx = block.indexOf('args')
  if (idx === -1) return []
  const tail = block.slice(idx)
  const open = tail.indexOf('{')
  if (open === -1) return []
  let depth = 0
  let end = -1
  for (let i = open; i < tail.length; i++) {
    if (tail[i] === '{') depth++
    else if (tail[i] === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) return []
  const argsBlock = tail.slice(open + 1, end)
  // Split on top-level commas.
  const entries = []
  let buf = ''
  let d = 0
  for (const ch of argsBlock) {
    if (ch === '{') d++
    if (ch === '}') d--
    if (ch === ',' && d === 0) {
      if (buf.trim()) entries.push(buf)
      buf = ''
    } else buf += ch
  }
  if (buf.trim()) entries.push(buf)

  const args = []
  for (const e of entries) {
    const km = e.match(/^\s*(?:'([^']+)'|([\w-]+))\s*:\s*\{([\s\S]*)\}\s*$/)
    if (!km) continue
    const key = km[1] || km[2]
    const body = km[3]
    const type = (body.match(/type\s*:\s*['"]([^'"]+)['"]/) || [])[1] ?? 'string'
    const desc = (body.match(/description\s*:\s*['"]([^'"]+)['"]/) || [])[1] ?? ''
    const required = /required\s*:\s*true/.test(body)
    args.push({ key, type, description: desc, required })
  }
  return args
}

// ─── 2. Build markdown for each top-level command ─────────────────────────

function renderArgs(args) {
  if (!args.length) return ''
  const lines = ['', '| Flag | Type | Required | Description |', '|---|---|---|---|']
  for (const a of args) {
    const flag = a.type === 'positional' ? `\`<${a.key}>\`` : `\`--${a.key}\``
    lines.push(`| ${flag} | ${a.type} | ${a.required ? 'yes' : 'no'} | ${a.description} |`)
  }
  return lines.join('\n')
}

function renderCommand({ name, description }, src) {
  const lines = []
  lines.push(SENTINEL_START)
  lines.push('')
  lines.push(`# \`lf ${name}\``)
  lines.push('')
  if (description) lines.push(description)

  const subs = extractSubCommands(src)
  for (const sub of subs) {
    const def = extractCommandDef(src, sub.identifier)
    if (!def?.meta) continue
    lines.push('')
    lines.push(`## \`lf ${name} ${def.meta.name}\``)
    lines.push('')
    if (def.meta.description) lines.push(def.meta.description)
    const argTable = renderArgs(extractArgs(def.raw))
    if (argTable) lines.push(argTable)
  }

  if (subs.length === 0) {
    // Single-command file: emit args of the default export.
    const exportRe = /export\s+default\s+defineCommand\s*\(\s*\{/
    const m = src.match(exportRe)
    if (m) {
      const start = (m.index ?? 0) + m[0].length - 1
      let depth = 0
      let end = -1
      for (let i = start; i < src.length; i++) {
        if (src[i] === '{') depth++
        else if (src[i] === '}') {
          depth--
          if (depth === 0) { end = i; break }
        }
      }
      if (end !== -1) {
        const block = src.slice(start, end + 1)
        const argTable = renderArgs(extractArgs(block))
        if (argTable) lines.push(argTable)
      }
    }
  }

  lines.push('')
  lines.push(SENTINEL_END)
  return lines.join('\n')
}

function mergeWithExisting(generated, existingPath) {
  if (!existsSync(existingPath)) {
    return ['---', `title: lf ${generated.cmdName}`, `description: ${generated.description}`, '---', '', generated.body, ''].join('\n')
  }
  const existing = readFileSync(existingPath, 'utf-8')
  const startIdx = existing.indexOf(SENTINEL_START)
  const endIdx = existing.indexOf(SENTINEL_END)
  if (startIdx === -1 || endIdx === -1) {
    // No sentinels = hand-authored prose page. Leave it alone — contributors
    // can opt in to auto-gen by adding empty sentinels at the bottom of the
    // file. Previously this branch appended a generated block, which
    // (a) overwrote curated prose authors did not opt into, and
    // (b) caused `gen-cli-docs:check` to "fix" pages without sentinels by
    // permanently appending machine output.
    return null
  }
  const existingGeneratedBlock = existing.slice(
    startIdx + SENTINEL_START.length,
    endIdx
  )
  if (existingGeneratedBlock.trim().length > 0) {
    return existing
  }
  const before = existing.slice(0, startIdx)
  const after = existing.slice(endIdx + SENTINEL_END.length)
  return before + generated.body + after
}

const generated = []
const stale = []
for (const f of files) {
  const src = readFileSync(f.path, 'utf-8')
  // Find the default export's meta.
  const defaultIdx = src.indexOf('export default defineCommand')
  if (defaultIdx === -1) continue
  const tail = src.slice(defaultIdx)
  const meta = extractMeta(tail)
  if (!meta) continue

  const body = renderCommand(meta, src)
  const outPath = join(OUT_DIR, `${meta.name}.md`)
  const merged = mergeWithExisting({ cmdName: meta.name, description: meta.description, body }, outPath)
  if (merged === null) continue // hand-authored page with no sentinels — opt-in only
  const existing = existsSync(outPath) ? readFileSync(outPath, 'utf-8') : ''
  if (checkMode) {
    if (merged !== existing) stale.push(outPath)
  } else {
    writeFileSync(outPath, merged, 'utf-8')
    generated.push(outPath)
  }
}

if (checkMode) {
  console.log(`Checked ${files.length} CLI command source file(s).`)
  if (stale.length > 0) {
    console.error('\nCLI reference docs are out of date. Run: node tools/gen-cli-docs.mjs')
    for (const file of stale) console.error(` M ${file.replace(`${repoRoot}/`, '')}`)
    process.exit(1)
  }
  console.log('CLI reference docs are up to date.')
} else {
  console.log(`Generated/updated ${generated.length} CLI doc page(s).`)
}
