import type {
  ExportEnvelope,
  ExportFormat,
  ExportKind,
  ValidationResult,
} from '@lenserfight/domain/exports'

import type { Serializer } from '../Serializer'

/**
 * YAML serializer — GitOps-portable block style.
 *
 * Constraints (intentional, to stay deterministic and round-trippable):
 *   - block style only (no flow style `{a: 1}` or `[1, 2]`)
 *   - no anchors / aliases
 *   - keys are sorted alphabetically to match canonical JSON ordering
 *   - strings are always double-quoted with JSON-compatible escapes
 *   - integers preserved; non-finite numbers rejected
 *
 * Implementation is dependency-free so the same module loads in browser,
 * CLI (Node), and Supabase edge functions (Deno).
 */
export class YamlSerializer<T = unknown> implements Serializer<T> {
  readonly format: ExportFormat = 'yaml'
  readonly mediaType = 'application/yaml'
  readonly extension = 'yaml'
  constructor(readonly kind: ExportKind) {}

  async serialize(envelope: ExportEnvelope<T>): Promise<string> {
    return `${dumpYaml(envelope as unknown)}\n`
  }

  async validate(output: string): Promise<ValidationResult> {
    const issues: { path: string; message: string }[] = []
    if (output.length === 0) {
      issues.push({ path: '/', message: 'empty output' })
    }
    if (/(^|\n)\s*&\w/.test(output) || /(^|\n)\s*\*\w/.test(output)) {
      issues.push({ path: '/', message: 'anchors/aliases not allowed' })
    }
    if (/^\s*\{/.test(output) || /^\s*\[/.test(output)) {
      issues.push({ path: '/', message: 'flow style not allowed at root' })
    }
    return { ok: issues.length === 0, issues }
  }
}

function dumpYaml(value: unknown): string {
  const lines: string[] = []
  emit(value, 0, lines)
  return lines.join('\n')
}

function emit(value: unknown, indent: number, lines: string[]): void {
  if (value === null || value === undefined) {
    lines.push(`${pad(indent)}null`)
    return
  }
  if (typeof value === 'boolean') {
    lines.push(`${pad(indent)}${value ? 'true' : 'false'}`)
    return
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('YamlSerializer: non-finite number is not representable')
    }
    lines.push(`${pad(indent)}${String(value)}`)
    return
  }
  if (typeof value === 'string') {
    lines.push(`${pad(indent)}${quote(value)}`)
    return
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${pad(indent)}[]`)
      return
    }
    for (const item of value) {
      emitArrayItem(item, indent, lines)
    }
    return
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    if (keys.length === 0) {
      lines.push(`${pad(indent)}{}`)
      return
    }
    for (const k of keys) {
      emitMapEntry(k, obj[k], indent, lines)
    }
    return
  }
  // Functions, symbols, BigInt — refuse rather than silently corrupt.
  throw new TypeError(`YamlSerializer: unsupported value type "${typeof value}"`)
}

function emitMapEntry(key: string, value: unknown, indent: number, lines: string[]): void {
  const k = yamlKey(key)
  if (value === null || value === undefined) {
    lines.push(`${pad(indent)}${k}: null`)
    return
  }
  if (typeof value === 'boolean') {
    lines.push(`${pad(indent)}${k}: ${value ? 'true' : 'false'}`)
    return
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('YamlSerializer: non-finite number is not representable')
    }
    lines.push(`${pad(indent)}${k}: ${String(value)}`)
    return
  }
  if (typeof value === 'string') {
    lines.push(`${pad(indent)}${k}: ${quote(value)}`)
    return
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${pad(indent)}${k}: []`)
      return
    }
    lines.push(`${pad(indent)}${k}:`)
    for (const item of value) {
      emitArrayItem(item, indent + 1, lines)
    }
    return
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    if (keys.length === 0) {
      lines.push(`${pad(indent)}${k}: {}`)
      return
    }
    lines.push(`${pad(indent)}${k}:`)
    for (const childKey of keys) {
      emitMapEntry(childKey, obj[childKey], indent + 1, lines)
    }
    return
  }
  throw new TypeError(`YamlSerializer: unsupported value type "${typeof value}"`)
}

function emitArrayItem(value: unknown, indent: number, lines: string[]): void {
  if (value === null || value === undefined) {
    lines.push(`${pad(indent)}- null`)
    return
  }
  if (typeof value === 'boolean') {
    lines.push(`${pad(indent)}- ${value ? 'true' : 'false'}`)
    return
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('YamlSerializer: non-finite number is not representable')
    }
    lines.push(`${pad(indent)}- ${String(value)}`)
    return
  }
  if (typeof value === 'string') {
    lines.push(`${pad(indent)}- ${quote(value)}`)
    return
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${pad(indent)}- []`)
      return
    }
    lines.push(`${pad(indent)}-`)
    for (const item of value) {
      emitArrayItem(item, indent + 1, lines)
    }
    return
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    if (keys.length === 0) {
      lines.push(`${pad(indent)}- {}`)
      return
    }
    const [firstKey, ...rest] = keys
    const dashIndent = pad(indent)
    const childIndent = pad(indent + 1)
    emitInlineFirstEntry(firstKey, obj[firstKey], dashIndent, childIndent, lines)
    for (const k of rest) {
      emitMapEntry(k, obj[k], indent + 1, lines)
    }
    return
  }
  throw new TypeError(`YamlSerializer: unsupported value type "${typeof value}"`)
}

function emitInlineFirstEntry(
  key: string,
  value: unknown,
  dashIndent: string,
  childIndent: string,
  lines: string[],
): void {
  const k = yamlKey(key)
  if (value === null || value === undefined) {
    lines.push(`${dashIndent}- ${k}: null`)
    return
  }
  if (typeof value === 'boolean') {
    lines.push(`${dashIndent}- ${k}: ${value ? 'true' : 'false'}`)
    return
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('YamlSerializer: non-finite number is not representable')
    }
    lines.push(`${dashIndent}- ${k}: ${String(value)}`)
    return
  }
  if (typeof value === 'string') {
    lines.push(`${dashIndent}- ${k}: ${quote(value)}`)
    return
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${dashIndent}- ${k}: []`)
      return
    }
    lines.push(`${dashIndent}- ${k}:`)
    const nextIndent = childIndent.length / 2 + 1
    for (const item of value) {
      emitArrayItem(item, nextIndent, lines)
    }
    return
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    if (keys.length === 0) {
      lines.push(`${dashIndent}- ${k}: {}`)
      return
    }
    lines.push(`${dashIndent}- ${k}:`)
    const nextIndent = childIndent.length / 2 + 1
    for (const childKey of keys) {
      emitMapEntry(childKey, obj[childKey], nextIndent, lines)
    }
    return
  }
  throw new TypeError(`YamlSerializer: unsupported value type "${typeof value}"`)
}

function pad(indent: number): string {
  return '  '.repeat(indent)
}

const SAFE_KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/

function yamlKey(key: string): string {
  return SAFE_KEY.test(key) ? key : quote(key)
}

function quote(value: string): string {
  let out = '"'
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i)
    const c = value[i]
    if (c === '"') {
      out += '\\"'
    } else if (c === '\\') {
      out += '\\\\'
    } else if (c === '\n') {
      out += '\\n'
    } else if (c === '\r') {
      out += '\\r'
    } else if (c === '\t') {
      out += '\\t'
    } else if (ch < 0x20 || ch === 0x7f) {
      out += `\\x${ch.toString(16).padStart(2, '0')}`
    } else {
      out += c
    }
  }
  return `${out}"`
}
