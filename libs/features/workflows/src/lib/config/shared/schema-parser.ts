/**
 * schema-parser — bidirectional conversion between SchemaFieldEntry[] (form state)
 * and canonical JSON schema (the format stored in param_overrides / node config).
 *
 * Also handles legacy raw JSON schema → form state parsing when safe.
 */

import type { SchemaFieldEntry, SchemaFieldType } from '../../types'

// ── Constants ──────────────────────────────────────────────────────────────

const SCHEMA_FIELD_TYPE_TO_JSON: Record<SchemaFieldType, { type: string; format?: string }> = {
  text: { type: 'string' },
  long_text: { type: 'string', format: 'textarea' },
  number: { type: 'number' },
  boolean: { type: 'boolean' },
  select: { type: 'string', format: 'select' },
  multi_select: { type: 'array', format: 'multi_select' },
  json: { type: 'object' },
  array: { type: 'array' },
  file: { type: 'string', format: 'file' },
  image: { type: 'string', format: 'image' },
  audio: { type: 'string', format: 'audio' },
  video: { type: 'string', format: 'video' },
  url: { type: 'string', format: 'uri' },
  datetime: { type: 'string', format: 'date-time' },
}

const JSON_TYPE_TO_SCHEMA_FIELD: Record<string, SchemaFieldType> = {
  'string': 'text',
  'string:textarea': 'long_text',
  'string:select': 'select',
  'string:file': 'file',
  'string:image': 'image',
  'string:audio': 'audio',
  'string:video': 'video',
  'string:uri': 'url',
  'string:date-time': 'datetime',
  'number': 'number',
  'integer': 'number',
  'boolean': 'boolean',
  'object': 'json',
  'array': 'array',
  'array:multi_select': 'multi_select',
}

// ── Form State → JSON Schema ──────────────────────────────────────────────

export interface GeneratedSchema {
  type: 'object'
  properties: Record<string, Record<string, unknown>>
  required: string[]
}

export function schemaFieldsToJsonSchema(fields: SchemaFieldEntry[]): GeneratedSchema {
  const properties: Record<string, Record<string, unknown>> = {}
  const required: string[] = []

  for (const field of fields) {
    if (!field.name.trim()) continue

    const mapping = SCHEMA_FIELD_TYPE_TO_JSON[field.type] ?? { type: 'string' }
    const prop: Record<string, unknown> = { type: mapping.type }

    if (mapping.format) prop['format'] = mapping.format
    if (field.description) prop['description'] = field.description
    if (field.defaultValue) prop['default'] = coerceDefault(field.defaultValue, field.type)
    if (field.example) prop['examples'] = [field.example]
    if (field.options && (field.type === 'select' || field.type === 'multi_select')) {
      prop['enum'] = field.options.split('|').map((o) => o.trim()).filter(Boolean)
    }

    if (field.required) required.push(field.name)
    properties[field.name] = prop
  }

  return { type: 'object', properties, required }
}

function coerceDefault(value: string, type: SchemaFieldType): unknown {
  switch (type) {
    case 'number':
      return Number(value) || 0
    case 'boolean':
      return value === 'true'
    case 'json':
    case 'array':
      try { return JSON.parse(value) } catch { return value }
    default:
      return value
  }
}

// ── JSON Schema → Form State ──────────────────────────────────────────────

export type ParseResult =
  | { ok: true; fields: SchemaFieldEntry[] }
  | { ok: false; reason: string }

let nextId = 0
function generateId(): string {
  return `sf_${Date.now()}_${nextId++}`
}

export function jsonSchemaToFields(raw: string): ParseResult {
  if (!raw.trim()) return { ok: true, fields: [] }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'Invalid JSON — cannot parse as schema.' }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'Schema must be a JSON object.' }
  }

  const schema = parsed as Record<string, unknown>

  // Accept both full JSON Schema objects and simplified property maps
  const properties = (schema['properties'] ?? schema) as Record<string, unknown>
  if (typeof properties !== 'object' || properties === null) {
    return { ok: false, reason: 'Cannot find properties in schema.' }
  }

  const requiredSet = new Set<string>(
    Array.isArray(schema['required']) ? (schema['required'] as string[]) : []
  )

  const fields: SchemaFieldEntry[] = []

  for (const [name, propRaw] of Object.entries(properties)) {
    if (typeof propRaw !== 'object' || propRaw === null) continue
    const prop = propRaw as Record<string, unknown>

    const jsonType = String(prop['type'] ?? 'string')
    const format = prop['format'] as string | undefined
    const lookupKey = format ? `${jsonType}:${format}` : jsonType
    const fieldType: SchemaFieldType = JSON_TYPE_TO_SCHEMA_FIELD[lookupKey] ?? JSON_TYPE_TO_SCHEMA_FIELD[jsonType] ?? 'text'

    const enumValues = Array.isArray(prop['enum']) ? (prop['enum'] as string[]).join(' | ') : undefined
    const examples = Array.isArray(prop['examples']) ? String(prop['examples'][0] ?? '') : ''
    const defaultVal = prop['default'] !== undefined ? String(prop['default']) : ''

    fields.push({
      id: generateId(),
      name,
      type: fieldType,
      required: requiredSet.has(name),
      defaultValue: defaultVal,
      description: String(prop['description'] ?? ''),
      example: examples,
      options: enumValues,
    })
  }

  return { ok: true, fields }
}

// ── Serialization helpers for param_overrides storage ──────────────────────

/**
 * Serialize SchemaFieldEntry[] to a string for storage in param_overrides.
 * Uses JSON format compatible with schemaFieldsToJsonSchema output.
 */
export function serializeSchemaFields(fields: SchemaFieldEntry[]): string {
  if (fields.length === 0) return ''
  return JSON.stringify(schemaFieldsToJsonSchema(fields), null, 2)
}

/**
 * Attempt to deserialize stored value back to SchemaFieldEntry[].
 * Returns null if it cannot be safely parsed (caller should show raw mode).
 */
export function deserializeSchemaFields(stored: string): SchemaFieldEntry[] | null {
  if (!stored.trim()) return []
  const result = jsonSchemaToFields(stored)
  return result.ok ? result.fields : null
}

// ── Validation ─────────────────────────────────────────────────────────────

export interface SchemaValidationError {
  fieldIndex: number
  field: string
  message: string
}

export function validateSchemaFields(fields: SchemaFieldEntry[]): SchemaValidationError[] {
  const errors: SchemaValidationError[] = []
  const names = new Set<string>()

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i]

    if (!f.name.trim()) {
      errors.push({ fieldIndex: i, field: 'name', message: 'Field name is required' })
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f.name)) {
      errors.push({ fieldIndex: i, field: 'name', message: 'Field name must be a valid identifier (letters, numbers, underscore; cannot start with a number)' })
    } else if (names.has(f.name)) {
      errors.push({ fieldIndex: i, field: 'name', message: `Duplicate field name "${f.name}"` })
    }

    if (f.name.trim()) names.add(f.name)

    if ((f.type === 'select' || f.type === 'multi_select') && !f.options?.trim()) {
      errors.push({ fieldIndex: i, field: 'options', message: 'Select fields require at least one option (pipe-separated)' })
    }

    if (f.defaultValue && f.type === 'number' && isNaN(Number(f.defaultValue))) {
      errors.push({ fieldIndex: i, field: 'defaultValue', message: 'Default value must be a number' })
    }
  }

  return errors
}
