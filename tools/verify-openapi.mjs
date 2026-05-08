#!/usr/bin/env node
/**
 * verify-openapi.mjs — Drift check between the platform-api router
 * (apps/platform-api/src/http/main.ts) and its OpenAPI document
 * (docs/reference/platform-api/openapi.yaml).
 *
 * Mechanism (intentionally simple — no parser dependency):
 *   1. Read main.ts. Extract `(method, [path, parts])` tuples by regex over
 *      the if-conditional chain that drives the router.
 *   2. Translate the part-array shape into an OpenAPI path template
 *      (e.g. parts[0]='v1' parts[1]='lenses' parts[2]=…dynamic… parts[3]='execute'
 *      → /v1/lenses/{p2}/execute, then we ignore the placeholder name and
 *      compare structurally against the openapi spec).
 *   3. Read openapi.yaml, pull every top-level key under `paths:` (lines
 *      that begin with `^  /`).
 *   4. Diff. Exit 1 if either side has a path the other doesn't.
 *
 * Intentional allowlist: `/health` is registered conditionally and we
 * recognise it explicitly.
 */

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')

const MAIN_PATH = resolve(repoRoot, 'apps/platform-api/src/http/main.ts')
const SPEC_PATH = resolve(repoRoot, 'docs/reference/platform-api/openapi.yaml')

if (!existsSync(MAIN_PATH)) {
  console.error(`Cannot find ${MAIN_PATH}`)
  process.exit(2)
}
if (!existsSync(SPEC_PATH)) {
  console.error(`Cannot find ${SPEC_PATH}`)
  process.exit(2)
}

// ─── 1. Parse main.ts route conditionals ──────────────────────────────────
//
// We look for blocks like:
//   if (req.method === 'POST' && parts[0] === 'v1' && parts[1] === 'lenses' && parts[3] === 'execute') {
// and reconstruct the path template.

const mainSrc = readFileSync(MAIN_PATH, 'utf-8')

// Walk the source tracking nesting so child if-blocks inherit literal/dynamic
// constraints from their ancestor if-blocks. This matches the partner-route
// pattern in main.ts where the parent if narrows parts[0]/parts[1] and the
// inner ifs only assert parts[3].

function parseConditions(body) {
  const partLiteral = new Map()
  const partRe = /parts\[(\d+)\]\s*===\s*['"]([^'"]+)['"]/g
  let pm
  while ((pm = partRe.exec(body)) !== null) {
    partLiteral.set(Number(pm[1]), pm[2])
  }
  const dynamicIdxs = new Set()
  const truthyRe = /parts\[(\d+)\]\s*(?:&&|\)|\s*$)/g
  let tm
  while ((tm = truthyRe.exec(body)) !== null) {
    const idx = Number(tm[1])
    if (!partLiteral.has(idx)) dynamicIdxs.add(idx)
  }
  const methodMatch = body.match(/req\.method\s*===\s*['"](\w+)['"]/)
  const lenMatch = body.match(/parts\.length\s*===\s*(\d+)/)
  return {
    method: methodMatch ? methodMatch[1] : null,
    partLiteral,
    dynamicIdxs,
    explicitLen: lenMatch ? Number(lenMatch[1]) : null,
  }
}

const routes = []
const stack = [] // each entry: { method, partLiteral, dynamicIdxs, explicitLen, endPos }

function findMatchingBrace(src, openIdx) {
  let d = 0
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === '{') d++
    else if (src[i] === '}') {
      d--
      if (d === 0) return i
    }
  }
  return src.length
}

let i = 0
const ifRe = /if\s*\(/g
while (i < mainSrc.length) {
  // Pop frames whose body we have walked past.
  while (stack.length > 0 && i >= stack[stack.length - 1].endPos) {
    stack.pop()
  }
  ifRe.lastIndex = i
  const m = ifRe.exec(mainSrc)
  if (!m) break
  if (m.index < i) {
    i++
    continue
  }
  // Pop frames whose body we have walked past (now that we know m.index).
  while (stack.length > 0 && m.index >= stack[stack.length - 1].endPos) {
    stack.pop()
  }
  // Parse the condition: balance parens.
  let pos = m.index + m[0].length
  let parenDepth = 1
  const start = pos
  while (pos < mainSrc.length && parenDepth > 0) {
    const c = mainSrc[pos]
    if (c === '(') parenDepth++
    else if (c === ')') parenDepth--
    pos++
  }
  const condition = mainSrc.slice(start, pos - 1)
  const parsed = parseConditions(condition)

  // Merge with ancestor frames.
  const merged = {
    method: parsed.method,
    partLiteral: new Map(),
    dynamicIdxs: new Set(),
    explicitLen: parsed.explicitLen,
  }
  for (const frame of stack) {
    if (!merged.method && frame.method) merged.method = frame.method
    for (const [k, v] of frame.partLiteral) merged.partLiteral.set(k, v)
    for (const d of frame.dynamicIdxs) merged.dynamicIdxs.add(d)
    if (!merged.explicitLen && frame.explicitLen) merged.explicitLen = frame.explicitLen
  }
  for (const [k, v] of parsed.partLiteral) merged.partLiteral.set(k, v)
  for (const d of parsed.dynamicIdxs) {
    if (!merged.partLiteral.has(d)) merged.dynamicIdxs.add(d)
  }

  // Find the body braces (if any).
  let braceOpen = pos
  while (braceOpen < mainSrc.length && mainSrc[braceOpen] !== '{' && mainSrc[braceOpen] !== '\n') {
    braceOpen++
  }
  let braceEnd = pos
  if (mainSrc[braceOpen] === '{') {
    braceEnd = findMatchingBrace(mainSrc, braceOpen) + 1
  }

  // Emit a route if we have a method and at least one parts constraint.
  const indices = [...merged.partLiteral.keys(), ...merged.dynamicIdxs]
  if (merged.method && indices.length > 0) {
    const maxIdx = Math.max(...indices)
    const length = merged.explicitLen ?? maxIdx + 1
    const segments = []
    for (let k = 0; k < length; k++) {
      if (merged.partLiteral.has(k)) segments.push(merged.partLiteral.get(k))
      else segments.push(`{p${k}}`)
    }
    routes.push({ method: merged.method, path: '/' + segments.join('/') })
  }

  // Push the frame so child ifs inherit ancestor constraints.
  stack.push({
    method: merged.method,
    partLiteral: merged.partLiteral,
    dynamicIdxs: merged.dynamicIdxs,
    explicitLen: merged.explicitLen,
    endPos: braceEnd,
  })

  i = pos
}

// Collapse duplicate routes that come from the same handler chain.
const codeRoutes = new Map()
for (const r of routes) {
  codeRoutes.set(`${r.method} ${r.path}`, r)
}

// ─── 2. Parse openapi.yaml — top-level path keys ──────────────────────────

const specSrc = readFileSync(SPEC_PATH, 'utf-8')
const specPaths = new Set()
{
  const specLines = specSrc.split(/\r?\n/)
  let inPaths = false
  for (const line of specLines) {
    if (/^paths\s*:\s*$/.test(line)) {
      inPaths = true
      continue
    }
    if (inPaths) {
      // A new top-level key (no leading spaces) ends the paths block.
      if (/^[A-Za-z]/.test(line)) {
        inPaths = false
        continue
      }
      const m = line.match(/^ {2}(\/[^\s:]+)\s*:\s*$/)
      if (m) specPaths.add(m[1])
    }
  }
}

// ─── 3. Normalise both sides for structural comparison ────────────────────

function normalise(p) {
  // Replace any {placeholder} with {} to compare structure regardless of
  // parameter naming.
  return p.replace(/\{[^}]+\}/g, '{}')
}

const codeNormalised = new Set([...codeRoutes.values()].map((r) => normalise(r.path)))
const specNormalised = new Set([...specPaths].map(normalise))

const missingFromSpec = [...codeNormalised].filter((p) => !specNormalised.has(p))
const missingFromCode = [...specNormalised].filter((p) => !codeNormalised.has(p))

let exitCode = 0
if (missingFromSpec.length > 0) {
  console.error('\nRoutes present in main.ts but missing from openapi.yaml:')
  for (const p of missingFromSpec) console.error('  + ' + p)
  exitCode = 1
}
if (missingFromCode.length > 0) {
  console.error('\nPaths present in openapi.yaml but missing from main.ts:')
  for (const p of missingFromCode) console.error('  - ' + p)
  exitCode = 1
}

if (exitCode === 0) {
  console.log(`OpenAPI in sync. ${codeNormalised.size} route(s) verified against spec.`)
}
process.exit(exitCode)
