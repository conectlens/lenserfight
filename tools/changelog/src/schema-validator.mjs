/**
 * schema-validator.mjs — AJV wrapper for .changes/schema.json.
 *
 * Mirrors the error-formatting approach in
 * libs/domain/spec-governance/src/lib/schema-validator.ts, kept self-contained
 * here since tools/ scripts should not depend on a domain library.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import Ajv from 'ajv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = resolve(__dirname, '../../../.changes/schema.json')

let cachedValidate = null

function loadValidator() {
  if (cachedValidate) return cachedValidate
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'))
  const ajv = new Ajv({ allErrors: true, strict: false })
  cachedValidate = ajv.compile(schema)
  return cachedValidate
}

function formatMessage(error) {
  const path = error.instancePath ? error.instancePath.slice(1).replace(/\//g, '.') : 'frontmatter'
  switch (error.keyword) {
    case 'required':
      return `Missing required field \`${error.params.missingProperty}\`.`
    case 'enum':
      return `Field \`${path}\` must be one of: ${error.params.allowedValues.join(', ')}.`
    case 'type':
      return `Field \`${path}\` must be ${error.params.type}.`
    case 'minLength':
      return `Field \`${path}\` must not be empty.`
    case 'maxLength':
      return `Field \`${path}\` must be at most ${error.params.limit} characters.`
    case 'additionalProperties':
      return `Unexpected field \`${error.params.additionalProperty}\`.`
    case 'if':
      return null // paired 'then'/'required' error carries the real message
    default:
      return `${path}: ${error.message ?? 'invalid'}`
  }
}

/**
 * Validate a fragment front-matter object against .changes/schema.json.
 * Returns { valid: true } or { valid: false, errors: string[] }.
 */
export function validateFragmentSchema(frontmatter) {
  const validate = loadValidator()
  const valid = validate(frontmatter)
  if (valid) return { valid: true, errors: [] }
  const errors = (validate.errors ?? [])
    .map(formatMessage)
    .filter((m) => m !== null)
  return { valid: false, errors: [...new Set(errors)] }
}
