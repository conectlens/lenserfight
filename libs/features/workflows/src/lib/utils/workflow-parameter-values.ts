import type { LensVersionParam } from '@lenserfight/types'

export type WorkflowParameterEditorValues = Record<string, unknown>

export function normalizeWorkflowParameterEditorValues(
  values: Record<string, unknown>,
  params: LensVersionParam[]
): WorkflowParameterEditorValues {
  const paramsByLabel = new Map(params.map((param) => [param.label, param]))

  return Object.fromEntries(
    Object.entries(values).map(([label, value]) => {
      const param = paramsByLabel.get(label)
      if (!param) return [label, value]
      return [label, normalizeWorkflowParameterEditorValue(value, param)]
    })
  )
}

export function serializeWorkflowParameterValues(
  values: WorkflowParameterEditorValues
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([label, value]) => [label, serializeWorkflowParameterValue(value)])
  )
}

export function serializeWorkflowParameterValue(value: unknown): string {
  if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
    return JSON.stringify(value)
  }
  return String(value ?? '')
}

export function isWorkflowParameterValuePresent(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  return true
}

function normalizeWorkflowParameterEditorValue(value: unknown, param: LensVersionParam): unknown {
  if (param.tool.type === 'boolean') {
    if (typeof value === 'boolean') return value
    if (typeof value !== 'string') return Boolean(value)
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase())
  }

  if (param.tool.type === 'multiselect') {
    if (Array.isArray(value)) return value.map(String)
    if (typeof value !== 'string' || value.trim() === '') return []

    try {
      const parsed: unknown = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      // Existing workflow values may use comma, semicolon, or pipe delimiters.
    }

    return value
      .split(/[|;,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return value
}
