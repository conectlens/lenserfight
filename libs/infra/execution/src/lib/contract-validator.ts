import {
  NODE_OUTPUT_ENVELOPE_REQUIRED_FIELDS,
  type ContractFieldSchema,
  type ContractValidationError,
  type ContractValidationResult,
  type LensInputContract,
  type LensOutputContract,
  type NodeOutputEnvelope,
} from '@lenserfight/types'

/**
 * Validate a rendered-input map against a lens's input contract.
 * Used by the workflow engine before calling the provider.
 */
export function validateInputs(
  inputs: Record<string, unknown>,
  contract: LensInputContract | null | undefined,
): ContractValidationResult {
  if (!contract) return { ok: true, errors: [] }
  const errors: ContractValidationError[] = []

  for (const [field, schema] of Object.entries(contract.fields ?? {})) {
    const value = inputs[field]
    const fieldErrors = validateField(field, value, schema)
    errors.push(...fieldErrors)
  }

  if (contract.requireAnyOf?.length) {
    for (const anyGroup of contract.requireAnyOf) {
      const hasAny = anyGroup.some((f) => isPresent(inputs[f]))
      if (!hasAny) {
        errors.push({
          field: anyGroup.join('|'),
          reason: 'missing_required',
          details: `At least one of [${anyGroup.join(', ')}] must be provided.`,
        })
      }
    }
  }

  if (contract.strict) {
    const allowed = new Set(Object.keys(contract.fields ?? {}))
    for (const key of Object.keys(inputs)) {
      if (!allowed.has(key)) {
        errors.push({ field: key, reason: 'unknown_field' })
      }
    }
  }

  return { ok: errors.length === 0, errors }
}

/**
 * Validate a node output envelope against a lens's output contract.
 * Used by the workflow engine after the provider returns.
 */
export function validateOutput(
  envelope: NodeOutputEnvelope | null | undefined,
  contract: LensOutputContract | null | undefined,
): ContractValidationResult {
  const errors: ContractValidationError[] = []

  if (!envelope) {
    return {
      ok: false,
      errors: [{ field: '<envelope>', reason: 'invalid_envelope', details: 'Envelope is null or undefined.' }],
    }
  }

  for (const key of NODE_OUTPUT_ENVELOPE_REQUIRED_FIELDS) {
    if (!isPresent((envelope as unknown as Record<string, unknown>)[key])) {
      errors.push({ field: key, reason: 'missing_required' })
    }
  }
  if (envelope.output !== undefined && typeof envelope.output !== 'string') {
    errors.push({ field: 'output', reason: 'type_mismatch', details: 'envelope.output must be a string' })
  }

  if (!contract) return { ok: errors.length === 0, errors }

  if (envelope.kind !== contract.kind) {
    errors.push({
      field: 'kind',
      reason: 'enum_mismatch',
      details: `Expected kind=${contract.kind}, got ${envelope.kind}`,
    })
  }
  if (envelope.artifactKind !== contract.artifactKind) {
    errors.push({
      field: 'artifactKind',
      reason: 'enum_mismatch',
      details: `Expected artifactKind=${contract.artifactKind}, got ${envelope.artifactKind}`,
    })
  }

  if (contract.schema) {
    const data = envelope.data ?? {}
    for (const [field, schema] of Object.entries(contract.schema)) {
      const fieldErrors = validateField(`data.${field}`, data[field], schema)
      errors.push(...fieldErrors)
    }
  }

  return { ok: errors.length === 0, errors }
}

function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string' && value.length === 0) return false
  return true
}

function validateField(field: string, value: unknown, schema: ContractFieldSchema): ContractValidationError[] {
  const errors: ContractValidationError[] = []
  const present = isPresent(value)

  if (!present) {
    if (schema.required) errors.push({ field, reason: 'missing_required' })
    return errors
  }

  const typeErr = checkType(field, value, schema)
  if (typeErr) {
    errors.push(typeErr)
    return errors
  }

  if (schema.type === 'string' || schema.type === 'url') {
    const s = value as string
    if (schema.minLength !== undefined && s.length < schema.minLength) {
      errors.push({ field, reason: 'too_short', details: `min ${schema.minLength}` })
    }
    if (schema.maxLength !== undefined && s.length > schema.maxLength) {
      errors.push({ field, reason: 'too_long', details: `max ${schema.maxLength}` })
    }
    if (schema.pattern) {
      try {
        if (!new RegExp(schema.pattern).test(s)) {
          errors.push({ field, reason: 'pattern_mismatch', details: schema.pattern })
        }
      } catch {
        // malformed pattern — treat as mismatch so the version can be fixed
        errors.push({ field, reason: 'pattern_mismatch', details: 'invalid_regex' })
      }
    }
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    const n = value as number
    if (schema.min !== undefined && n < schema.min) errors.push({ field, reason: 'below_min', details: `min ${schema.min}` })
    if (schema.max !== undefined && n > schema.max) errors.push({ field, reason: 'above_max', details: `max ${schema.max}` })
  }

  if (schema.enum && schema.enum.length > 0) {
    const s = String(value)
    if (!schema.enum.includes(s)) {
      errors.push({ field, reason: 'enum_mismatch', details: schema.enum.join('|') })
    }
  }

  return errors
}

function checkType(field: string, value: unknown, schema: ContractFieldSchema): ContractValidationError | null {
  switch (schema.type) {
    case 'any':
      return null
    case 'string':
      return typeof value === 'string' ? null : { field, reason: 'type_mismatch', details: 'expected string' }
    case 'url':
      if (typeof value !== 'string') return { field, reason: 'type_mismatch', details: 'expected url string' }
      try {
        new URL(value)
        return null
      } catch {
        return { field, reason: 'pattern_mismatch', details: 'not a valid url' }
      }
    case 'boolean':
      return typeof value === 'boolean' ? null : { field, reason: 'type_mismatch', details: 'expected boolean' }
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? null
        : { field, reason: 'type_mismatch', details: 'expected number' }
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value)
        ? null
        : { field, reason: 'type_mismatch', details: 'expected integer' }
    case 'array':
      if (!Array.isArray(value)) return { field, reason: 'type_mismatch', details: 'expected array' }
      if (schema.itemType && schema.itemType !== 'any') {
        for (let i = 0; i < value.length; i++) {
          const itemErr = checkType(`${field}[${i}]`, value[i], { type: schema.itemType })
          if (itemErr) return itemErr
        }
      }
      return null
    case 'json':
      return value !== null && typeof value === 'object' ? null : { field, reason: 'type_mismatch', details: 'expected object' }
    default:
      return null
  }
}
