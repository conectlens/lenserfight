import { PromptParam } from '@lenserfight/types'

const VARIABLE_REGEX = /\{\{(\w+)\}\}/g

export function extractParams(template: string): PromptParam[] {
  const seen = new Set<string>()
  const params: PromptParam[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(VARIABLE_REGEX.source, VARIABLE_REGEX.flags)
  while ((match = re.exec(template)) !== null) {
    const name = match[1].trim().toLowerCase()
    if (!seen.has(name)) {
      seen.add(name)
      params.push({ name, type: 'string', required: true })
    }
  }
  return params
}

function escapeHtml(value: string): string {
  return value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function coerceValue(value: any, param: PromptParam): string {
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

export function renderPrompt(
  template: string,
  values: Record<string, any>,
  params: PromptParam[]
): string {
  const paramMap = new Map(params.map((p) => [p.name, p]))
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const param = paramMap.get(name) ?? { name, type: 'string' as const, required: true }
    const value = values[name]
    if (value === undefined || value === null || value === '') return ''
    return coerceValue(value, param)
  })
}

export function validateParamValues(
  values: Record<string, any>,
  params: PromptParam[]
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
