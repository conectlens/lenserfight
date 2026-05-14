import type { LensParam, LensVersionParam } from '@lenserfight/types'

// Double-square-bracket syntax [[param_name]] is intentional and injection-safe.
// Unlike {{param}}, double-square-brackets do not appear in Jinja2/Handlebars/Mustache
// templates that users may paste into their lens body, preventing accidental
// parameter extraction of unrelated curly-brace patterns.
const VARIABLE_REGEX = /\[\[(\w+)\]\]/g

// UUID-reference syntax [[:uuid]] used in stored template bodies (lenses.versions.template_body).
// The colon prefix distinguishes param refs from named params.
const PARAM_REF_REGEX = /\[\[:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\]/gi

export function extractParams(template: string): { name: string }[] {
  const seen = new Set<string>()
  const params: { name: string }[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(VARIABLE_REGEX.source, VARIABLE_REGEX.flags)
  while ((match = re.exec(template)) !== null) {
    const name = match[1].trim().toLowerCase()
    if (!seen.has(name)) {
      seen.add(name)
      params.push({ name })
    }
  }
  return params
}

/**
 * Extracts all `[[:uuid]]` parameter reference tokens from a stored template body.
 * Used during execution to resolve parameter values by version_parameter id.
 */
export function extractParamRefs(template: string): string[] {
  const seen = new Set<string>()
  const refs: string[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(PARAM_REF_REGEX.source, PARAM_REF_REGEX.flags)
  while ((match = re.exec(template)) !== null) {
    const id = match[1].toLowerCase()
    if (!seen.has(id)) {
      seen.add(id)
      refs.push(id)
    }
  }
  return refs
}

function escapeHtml(value: string): string {
  return value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function coerceValue(value: any, param: LensParam): string {
  if (value === undefined || value === null) return ''

  switch (param.type) {
    case 'boolean':
      return value ? 'true' : 'false'
    case 'number':
      return String(value)
    case 'array': {
      const arr = Array.isArray(value) ? value : [value]
      const format = param.arrayFormat ?? 'comma'
      if (format === 'newline') return arr.join('\n')
      if (format === 'json') return JSON.stringify(arr)
      return arr.join(', ')
    }
    case 'select':
    case 'multiselect':
      return String(value)
    case 'string':
    default:
      return escapeHtml(String(value))
  }
}

export function renderLens(
  template: string,
  values: Record<string, any>,
  params: LensParam[]
): string {
  const paramMap = new Map(params.map((p) => [p.name, p]))
  return template.replace(/\[\[(\w+)\]\]/g, (_, name) => {
    const param = paramMap.get(name) ?? { name, type: 'string' as const, required: true }
    const value = values[name]
    if (value === undefined || value === null || value === '') return ''
    return coerceValue(value, param)
  })
}

// ─── Content Segment Parsing ──────────────────────────────────────────────

export type LensContentSegment =
  | { type: 'text'; content: string }
  | { type: 'param'; name: string }
  | { type: 'param-ref'; id: string }

// Combined regex that matches both [[name]] and [[:uuid]] tokens
const COMBINED_REGEX = /\[\[(?::([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})|(\w+))\]\]/gi

/**
 * Splits lens content into typed segments for rendering.
 * - `[[name]]` → { type: 'param', name }  (editor/display format)
 * - `[[:uuid]]` → { type: 'param-ref', id } (stored template body format)
 * - plain text → { type: 'text', content }
 */
export function parseContentSegments(content: string): LensContentSegment[] {
  if (!content) return []

  const segments: LensContentSegment[] = []
  const re = new RegExp(COMBINED_REGEX.source, COMBINED_REGEX.flags)
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    if (match[1]) {
      // [[:uuid]] format
      segments.push({ type: 'param-ref', id: match[1].toLowerCase() })
    } else {
      // [[name]] format
      segments.push({ type: 'param', name: match[2].trim().toLowerCase() })
    }
    lastIndex = re.lastIndex
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) })
  }

  return segments
}

/**
 * Renders lens content the way `LensContentReadonly` displays it: normalizes
 * `{{param}}` → `[[param]]`, resolves `[[:uuid]]` refs to `[[label]]` via the
 * supplied version params, and leaves text untouched. Use this when copying
 * displayed lens content to the clipboard so the user gets what they see.
 */
export function renderLensContentForCopy(
  rawContent: string,
  versionParams: LensVersionParam[] = [],
): string {
  if (!rawContent) return ''
  const normalized = rawContent.replace(/\{\{(\w+)\}\}/g, '[[$1]]')
  const paramById = new Map(versionParams.map((vp) => [vp.id, vp]))
  return parseContentSegments(normalized)
    .map((seg) => {
      if (seg.type === 'text') return seg.content
      if (seg.type === 'param') return `[[${seg.name}]]`
      const vp = paramById.get(seg.id)
      return `[[${vp?.label ?? seg.id.slice(0, 8)}]]`
    })
    .join('')
}

export async function copyTextToClipboard(text: string): Promise<void> {
  let clipboardError: unknown

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch (error) {
      clipboardError = error
    }
  }

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-9999px'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()

    try {
      if (document.execCommand('copy')) {
        return
      }
    } finally {
      document.body.removeChild(textarea)
    }
  }

  throw clipboardError instanceof Error ? clipboardError : new Error('Clipboard write failed')
}

// ─── Mismatch Detection ──────────────────────────────────────────────────

export interface ParamMismatch {
  /** {{var}} in content but not in params array */
  orphanedInContent: string[]
  /** param exists in array but no {{var}} in content */
  orphanedInParams: string[]
}

/**
 * Detects mismatches between {{variable}} tokens in content and the params array.
 */
export function detectParamMismatches(content: string, params: LensParam[]): ParamMismatch {
  const contentParamNames = new Set(
    extractParams(content).map((p) => p.name)
  )
  const arrayParamNames = new Set(params.map((p) => p.name))

  return {
    orphanedInContent: [...contentParamNames].filter((n) => !arrayParamNames.has(n)),
    orphanedInParams: [...arrayParamNames].filter((n) => !contentParamNames.has(n)),
  }
}

// ─── Validation ──────────────────────────────────────────────────────────

export function validateParamValues(
  values: Record<string, any>,
  params: LensParam[]
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const param of params) {
    const value = values[param.name]
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)

    if (param.required && isEmpty) {
      errors[param.name] = `${param.name} is required`
      continue
    }

    if (isEmpty) continue

    if (param.type === 'number') {
      const num = Number(value)
      if (isNaN(num)) {
        errors[param.name] = `${param.name} must be a number`
        continue
      }
      if (param.min !== undefined && num < param.min) {
        errors[param.name] = `${param.name} must be at least ${param.min}`
        continue
      }
      if (param.max !== undefined && num > param.max) {
        errors[param.name] = `${param.name} must be at most ${param.max}`
        continue
      }
    }

    if (param.type === 'string' && param.regex) {
      try {
        if (!new RegExp(param.regex).test(String(value))) {
          errors[param.name] = `${param.name} does not match the required format`
        }
      } catch {
        // invalid regex — skip validation
      }
    }

    if (param.type === 'select' && param.options?.length) {
      const allowed = param.options.map((o) => o.value)
      if (!allowed.includes(String(value))) {
        errors[param.name] = `${param.name} must be one of: ${allowed.join(', ')}`
      }
    }

    if (param.type === 'multiselect' && param.options?.length) {
      const allowed = new Set(param.options.map((o) => o.value))
      const selected = Array.isArray(value) ? value : [value]
      const invalid = selected.filter((v) => !allowed.has(String(v)))
      if (invalid.length > 0) {
        errors[param.name] = `${param.name} contains invalid options: ${invalid.join(', ')}`
      }
    }
  }

  return errors
}

// ─── Battle Execution Helpers ─────────────────────────────────────────────────

/**
 * Normalises [[:uuid]] refs in a raw template body back to [[label]] tokens.
 * Stored template bodies are served in rendered [[label]] form by fn_render_version_body,
 * but draft versions may still contain UUID refs. This pass is a safety net.
 */
export function resolveUuidRefs(
  templateBody: string,
  versionParams: LensVersionParam[],
): string {
  const paramById = new Map(versionParams.map((p) => [p.id.toLowerCase(), p.label]))
  return templateBody.replace(
    /\[\[:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\]/gi,
    (_, id: string) => {
      const label = paramById.get(id.toLowerCase())
      return label ? `[[${label}]]` : ''
    },
  )
}

function mapToolTypeToLegacyType(toolType: string): LensParam['type'] {
  if (['number', 'integer', 'float', 'decimal'].includes(toolType)) return 'number'
  if (toolType === 'boolean') return 'boolean'
  if (toolType === 'select') return 'select'
  return 'string'
}

/**
 * Renders a lens template body with a contender's input snapshot, supporting
 * both [[label]] (normal) and [[:uuid]] (draft fallback) token formats.
 *
 * snapshot is keyed by param.label, matching how VersionParamFields stores values.
 */
export function renderLensWithSnapshot(
  templateBody: string,
  snapshot: Record<string, unknown>,
  versionParams: LensVersionParam[],
): string {
  const normalised = resolveUuidRefs(templateBody, versionParams)
  const legacyParams: LensParam[] = versionParams.map((p) => ({
    name: p.label,
    type: mapToolTypeToLegacyType(p.tool.type),
    required: p.tool.required,
  }))
  return renderLens(normalised, snapshot as Record<string, any>, legacyParams)
}
