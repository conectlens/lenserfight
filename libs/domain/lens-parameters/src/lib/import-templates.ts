import type { LensVersionParam, LensVersionParamType } from '@lenserfight/types'

import { paramTokenBracket } from './label-normalizer'

export const IMPORT_META_KEY = '_import'
export const IMPORT_FORMAT_VERSION = 'lenserfight-lens-snapshot-v1'

export interface ImportTemplateParamMeta {
  label: string
  type: LensVersionParamType
  optional: boolean
  token: string
  importable: boolean
}

export interface ImportTemplateMeta {
  format: string
  keys: string
  fileParams: string
  parameters: ImportTemplateParamMeta[]
}

/** Example value for JSON/CSV import templates, aligned with lab coercion expectations. */
export function importTemplatePlaceholder(param: LensVersionParam): unknown {
  const type = param.tool.type

  switch (type) {
    case 'text':
      return 'text value'
    case 'textarea':
      return 'multiline text'
    case 'json':
      return { example: true }
    case 'integer':
      return 0
    case 'float':
    case 'decimal':
    case 'number':
      return 0
    case 'boolean':
      return true
    case 'date':
      return '2024-01-15'
    case 'datetime':
      return '2024-01-15T10:00:00'
    case 'url':
      return 'https://example.com'
    case 'select':
      return param.tool.options?.[0]?.value ?? 'option_value'
    case 'multiselect':
      return [param.tool.options?.[0]?.value ?? 'option1']
    case 'array':
      return 'item1, item2'
    case 'file':
    case 'files':
      return undefined
    default:
      return 'value'
  }
}

function buildImportMeta(versionParams: LensVersionParam[]): ImportTemplateMeta {
  return {
    format: IMPORT_FORMAT_VERSION,
    keys: 'Object keys must match parameter labels (input_snapshot keys), not [[token]] syntax.',
    fileParams:
      'File and files parameters cannot be imported via JSON/CSV — upload them in the lab panel.',
    parameters: versionParams.map((p) => ({
      label: p.label,
      type: p.tool.type,
      optional: !!(p.optional ?? (p.tool.required === false)),
      token: paramTokenBracket(p.label, !!p.optional, p.tool.type),
      importable: p.tool.type !== 'file' && p.tool.type !== 'files',
    })),
  }
}

function isImportable(param: LensVersionParam): boolean {
  return param.tool.type !== 'file' && param.tool.type !== 'files'
}

/**
 * JSON import template: `_import` metadata block + label-keyed example values.
 */
export function buildImportJsonTemplate(versionParams: LensVersionParam[]): string {
  if (versionParams.length === 0) return ''

  const obj: Record<string, unknown> = {
    [IMPORT_META_KEY]: buildImportMeta(versionParams),
  }

  for (const p of versionParams) {
    if (!isImportable(p)) continue
    const placeholder = importTemplatePlaceholder(p)
    const optional = !!(p.optional ?? (p.tool.required === false))
    obj[p.label] = optional ? null : placeholder
  }

  return JSON.stringify(obj, null, 2)
}

function escapeCsvField(value: string): string {
  if (/[",\n\r\t]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function placeholderToCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return escapeCsvField(value.join('|'))
  if (typeof value === 'object') return escapeCsvField(JSON.stringify(value))
  return escapeCsvField(String(value))
}

/**
 * Two-line CSV template: header row = labels; data row = typed example values.
 * File-type columns are omitted (not importable via paste).
 */
export function buildImportCsvTemplate(versionParams: LensVersionParam[]): string {
  if (versionParams.length === 0) return ''

  const importable = versionParams.filter(isImportable)
  if (importable.length === 0) {
    return '# No importable columns (file-type params only — upload attachments in the lab)'
  }

  const headers = importable.map((p) => p.label)
  const values = importable.map((p) => {
    const optional = !!(p.optional ?? (p.tool.required === false))
    const placeholder = importTemplatePlaceholder(p)
    return placeholderToCsvCell(optional ? null : placeholder)
  })

  return `${headers.map(escapeCsvField).join(',')}\n${values.join(',')}`
}

/** One-line hint for CSV dialog placeholders (lists omitted file params). */
export function buildImportCsvTemplateHint(versionParams: LensVersionParam[]): string {
  const fileLabels = versionParams
    .filter((p) => p.tool.type === 'file' || p.tool.type === 'files')
    .map((p) => p.label)
  if (fileLabels.length === 0) {
    return 'Headers must match parameter labels. Types are inferred from each parameter tool.'
  }
  return `Headers must match parameter labels. File params (${fileLabels.join(', ')}) are omitted — upload in the lab.`
}
