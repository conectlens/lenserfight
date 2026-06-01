import { IMPORT_META_KEY } from '@lenserfight/domain/lens-parameters'
import { LensVersionParam } from '@lenserfight/types'

export {
  buildImportCsvTemplate as buildCsvTemplate,
  buildImportJsonTemplate as buildJsonTemplate,
  buildImportCsvTemplateHint,
  type LensTemplateContext,
} from '@lenserfight/domain/lens-parameters'

export interface ImportResult {
  values: Record<string, unknown>
  errors: Record<string, string>
}

// ─── Key Matching ──────────────────────────────────────────────────────────────

/** 3-tier key matching: exact → case-insensitive → whitespace-trimmed. */
function findParamKey(
  rawKey: string,
  versionParams: LensVersionParam[],
): string | null {
  // Version params: match on label
  const vExact = versionParams.find((p) => p.label === rawKey)
  if (vExact) return vExact.label
  const vCI = versionParams.find((p) => p.label.toLowerCase() === rawKey.toLowerCase())
  if (vCI) return vCI.label
  const vTrimmed = versionParams.find((p) => p.label.trim().toLowerCase() === rawKey.trim().toLowerCase())
  if (vTrimmed) return vTrimmed.label

  return null
}

// ─── Type Coercion ─────────────────────────────────────────────────────────────

function coerceVersionParam(
  rawValue: unknown,
  param: LensVersionParam,
): { value: unknown; error: string | null } {
  const type = param.tool.type
  const label = param.label

  // File params cannot be imported via text
  if (type === 'file' || type === 'files') return { value: undefined, error: null }

  if (rawValue === null || rawValue === undefined) {
    return { value: '', error: null }
  }

  const str = String(rawValue)

  switch (type) {
    case 'text':
    case 'textarea':
    case 'url':
    case 'json':
      return { value: str, error: null }

    case 'integer': {
      const n = parseInt(str, 10)
      if (isNaN(n)) return { value: null, error: `${label}: expected integer, got "${str}"` }
      return { value: n, error: null }
    }

    case 'float':
    case 'decimal':
    case 'number': {
      const n = parseFloat(str)
      if (isNaN(n)) return { value: null, error: `${label}: expected number, got "${str}"` }
      return { value: n, error: null }
    }

    case 'boolean': {
      const lower = str.toLowerCase()
      const isTrue = rawValue === true || lower === 'true' || lower === '1' || lower === 'yes'
      return { value: isTrue, error: null }
    }

    case 'date':
    case 'datetime': {
      if (isNaN(Date.parse(str))) return { value: null, error: `${label}: expected valid date, got "${str}"` }
      return { value: str, error: null }
    }

    case 'select': {
      const options = param.tool.options
      if (options && options.length > 0) {
        const match = options.find((o) => o.value === str || o.label.toLowerCase() === str.toLowerCase())
        if (!match) return { value: null, error: `${label}: "${str}" is not a valid option` }
        return { value: match.value, error: null }
      }
      return { value: str, error: null }
    }

    case 'multiselect': {
      // JSON or array: use rawValue if it's already an array
      if (Array.isArray(rawValue)) {
        return { value: rawValue as string[], error: null }
      }
      // CSV or stringified: split on | or ; or ,
      const parts = str.split(/[|;,]/).map((s) => s.trim()).filter(Boolean)
      return { value: parts, error: null }
    }

    case 'array': {
      // CSV/Text: pass raw string (user pastes comma/newline format)
      return { value: str, error: null }
    }

    default:
      return { value: str, error: null }
  }
}

// ─── JSON Import ───────────────────────────────────────────────────────────────

export function coerceJsonImport(
  raw: string,
  versionParams: LensVersionParam[],
): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown parse error'
    return { values: {}, errors: { _parse: `Invalid JSON: ${msg}` } }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { values: {}, errors: { _parse: 'JSON must be a plain object (e.g. { "key": "value" })' } }
  }

  const obj = parsed as Record<string, unknown>
  const values: Record<string, unknown> = {}
  const errors: Record<string, string> = {}

  for (const [rawKey, rawValue] of Object.entries(obj)) {
    if (rawKey === IMPORT_META_KEY) continue
    const matchedKey = findParamKey(rawKey, versionParams)
    if (!matchedKey) continue // silently ignore unmatched keys

    // Determine which param type applies
    const vp = versionParams.find((p) => p.label === matchedKey)
    if (vp) {
      if (vp.tool.type === 'file' || vp.tool.type === 'files') continue
      const { value, error } = coerceVersionParam(rawValue, vp)
      if (error) errors[matchedKey] = error
      else if (value !== undefined) values[matchedKey] = value
    }
  }

  return { values, errors }
}

// ─── CSV Parsing ───────────────────────────────────────────────────────────────

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
  delimiter: string
}

/** Detect delimiter by counting occurrences on the first line. Tie-break: , > \t > ; */
function detectDelimiter(firstLine: string): string {
  const counts = {
    ',': (firstLine.match(/,/g) ?? []).length,
    '\t': (firstLine.match(/\t/g) ?? []).length,
    ';': (firstLine.match(/;/g) ?? []).length,
  }
  if (counts[','] >= counts['\t'] && counts[','] >= counts[';']) return ','
  if (counts['\t'] >= counts[';']) return '\t'
  return ';'
}

/** Minimal RFC 4180 CSV line splitter with double-quote support. */
function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (line.startsWith(delimiter, i)) {
        fields.push(field)
        field = ''
        i += delimiter.length - 1
      } else {
        field += ch
      }
    }
  }
  fields.push(field)
  return fields
}

export function parseCsvText(raw: string): ParsedCsv {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '' && !l.trimStart().startsWith('#'))
  if (lines.length === 0) return { headers: [], rows: [], delimiter: ',' }

  const delimiter = detectDelimiter(lines[0])
  const headers = splitCsvLine(lines[0], delimiter)
  const rows = lines.slice(1).map((l) => splitCsvLine(l, delimiter))

  return { headers, rows, delimiter }
}

// ─── CSV Row Coercion ─────────────────────────────────────────────────────────

export function coerceCsvRow(
  headers: string[],
  row: string[],
  versionParams: LensVersionParam[],
): ImportResult {
  const values: Record<string, unknown> = {}
  const errors: Record<string, string> = {}

  for (let i = 0; i < headers.length; i++) {
    const rawKey = headers[i].trim()
    const rawValue = row[i] ?? ''
    const matchedKey = findParamKey(rawKey, versionParams)
    if (!matchedKey) continue

    const vp = versionParams.find((p) => p.label === matchedKey)
    if (vp) {
      if (vp.tool.type === 'file' || vp.tool.type === 'files') continue
      const { value, error } = coerceVersionParam(rawValue, vp)
      if (error) errors[matchedKey] = error
      else if (value !== undefined) values[matchedKey] = value
    }
  }

  return { values, errors }
}

