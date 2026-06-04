/**
 * AJV-based JSON Schema validator for LenserFight spec frontmatter.
 *
 * GRASP: Information Expert — owns schema compilation and error formatting.
 * All JSON Schema files are loaded and compiled once at module init.
 * Validators are pre-compiled functions with microsecond execution time.
 */

import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js'
import type { AutomationValidationIssue } from '@lenserfight/types'

import commonSchema from './schemas/common.schema.json'
import lensSchema from './schemas/lens.schema.json'
import lenserSchema from './schemas/lenser.schema.json'
import colensSchema from './schemas/colens.schema.json'
import battleSchema from './schemas/battle.schema.json'
import raySchema from './schemas/ray.schema.json'
import evaluationSchema from './schemas/evaluation.schema.json'
import executionSchema from './schemas/execution.schema.json'
import teamSchema from './schemas/team.schema.json'
import agentSchema from './schemas/agent.schema.json'
import agentTeamSchema from './schemas/agent-team.schema.json'
import toolSchema from './schemas/tool.schema.json'
import workflowSchema from './schemas/workflow.schema.json'
import privateBattleSchema from './schemas/private-battle.schema.json'
import skillSchema from './schemas/skill.schema.json'
import memoryPolicySchema from './schemas/memory-policy.schema.json'
import datasetSchema from './schemas/dataset.schema.json'
import benchmarkSchema from './schemas/benchmark.schema.json'
import runReportSchema from './schemas/run-report.schema.json'

// ─── AJV instance ────────────────────────────────────────────────────────────

const ajv = new Ajv2020({ allErrors: true, strict: false })

/**
 * Strip $id from schemas before loading into AJV. This prevents URI-based
 * $ref resolution issues. Without $id, AJV resolves $ref values like
 * "common.schema.json#/$defs/baseSpec" as direct key lookups instead of
 * trying to resolve them relative to the containing schema's base URI.
 */
function stripId(schema: Record<string, unknown>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $id, ...rest } = schema
  return rest
}

// Register common schema first so $ref: "common.schema.json#/$defs/..." resolves.
ajv.addSchema(stripId(commonSchema as unknown as Record<string, unknown>), 'common.schema.json')

// ─── Schema registry ─────────────────────────────────────────────────────────

/**
 * Maps lowercase `kind` const (as it appears in YAML frontmatter)
 * to the compiled AJV validate function.
 */
const validators = new Map<string, ValidateFunction>()

const kindSchemaMap: Array<{ kind: string; schema: Record<string, unknown> }> = [
  { kind: 'lens', schema: lensSchema as unknown as Record<string, unknown> },
  { kind: 'lenser', schema: lenserSchema as unknown as Record<string, unknown> },
  { kind: 'colens', schema: colensSchema as unknown as Record<string, unknown> },
  { kind: 'battle', schema: battleSchema as unknown as Record<string, unknown> },
  { kind: 'ray', schema: raySchema as unknown as Record<string, unknown> },
  { kind: 'evaluation', schema: evaluationSchema as unknown as Record<string, unknown> },
  { kind: 'execution', schema: executionSchema as unknown as Record<string, unknown> },
  { kind: 'team', schema: teamSchema as unknown as Record<string, unknown> },
  { kind: 'agent', schema: agentSchema as unknown as Record<string, unknown> },
  { kind: 'agent_team', schema: agentTeamSchema as unknown as Record<string, unknown> },
  { kind: 'tool', schema: toolSchema as unknown as Record<string, unknown> },
  { kind: 'workflow', schema: workflowSchema as unknown as Record<string, unknown> },
  { kind: 'private_battle', schema: privateBattleSchema as unknown as Record<string, unknown> },
  { kind: 'skill', schema: skillSchema as unknown as Record<string, unknown> },
  { kind: 'memory_policy', schema: memoryPolicySchema as unknown as Record<string, unknown> },
  { kind: 'dataset', schema: datasetSchema as unknown as Record<string, unknown> },
  { kind: 'benchmark', schema: benchmarkSchema as unknown as Record<string, unknown> },
  { kind: 'run_report', schema: runReportSchema as unknown as Record<string, unknown> },
]

for (const { kind, schema } of kindSchemaMap) {
  validators.set(kind, ajv.compile(stripId(schema)))
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Returns the compiled AJV validate function for a given lowercase kind, or null. */
export function getSchemaValidator(kind: string): ValidateFunction | null {
  return validators.get(kind) ?? null
}

/** Whether a JSON Schema exists for the given lowercase kind. */
export function hasSchema(kind: string): boolean {
  return validators.has(kind)
}

/**
 * Validate a frontmatter object against the JSON Schema for the given kind.
 * Returns an empty array if the kind has no schema or validation passes.
 */
export function validateFrontmatterSchema(
  kind: string,
  frontmatter: Record<string, unknown>,
): AutomationValidationIssue[] {
  const validate = validators.get(kind)
  if (!validate) return []

  const valid = validate(frontmatter)
  if (valid) return []

  return deduplicateIssues(
    (validate.errors ?? []).map(ajvErrorToIssue),
  )
}

// ─── Error formatting ────────────────────────────────────────────────────────

function ajvErrorToIssue(error: ErrorObject): AutomationValidationIssue {
  const path = resolvePath(error)
  const message = formatMessage(error, path)
  return { path, message, severity: 'error' }
}

function resolvePath(error: ErrorObject): string {
  if (error.keyword === 'required') {
    const prop = (error.params as { missingProperty?: string }).missingProperty ?? ''
    const prefix = error.instancePath ? error.instancePath.slice(1).replace(/\//g, '.') : ''
    return prefix ? `${prefix}.${prop}` : prop
  }
  if (error.instancePath) {
    return error.instancePath.slice(1).replace(/\//g, '.')
  }
  return 'frontmatter'
}

function formatMessage(error: ErrorObject, path: string): string {
  switch (error.keyword) {
    case 'required': {
      const prop = (error.params as { missingProperty?: string }).missingProperty ?? path
      return `Missing required field \`${prop}\`.`
    }
    case 'type': {
      const expected = (error.params as { type?: string }).type ?? 'unknown'
      return `Field \`${path}\` must be ${expected}.`
    }
    case 'enum': {
      const values = (error.params as { allowedValues?: unknown[] }).allowedValues ?? []
      return `Field \`${path}\` must be one of: ${values.join(', ')}.`
    }
    case 'const': {
      const expected = (error.params as { allowedValue?: unknown }).allowedValue
      return `Field \`${path}\` must be \`${String(expected)}\`.`
    }
    case 'pattern':
      return `Field \`${path}\` does not match the expected format.`
    case 'minLength': {
      const limit = (error.params as { limit?: number }).limit ?? 1
      return limit === 1
        ? `Field \`${path}\` must not be empty.`
        : `Field \`${path}\` must be at least ${limit} characters.`
    }
    case 'maxLength': {
      const limit = (error.params as { limit?: number }).limit ?? 0
      return `Field \`${path}\` must be at most ${limit} characters.`
    }
    case 'minimum': {
      const limit = (error.params as { limit?: number }).limit ?? 0
      return `Field \`${path}\` must be at least ${limit}.`
    }
    case 'maximum': {
      const limit = (error.params as { limit?: number }).limit ?? 0
      return `Field \`${path}\` must be at most ${limit}.`
    }
    case 'uniqueItems':
      return `Field \`${path}\` must not contain duplicate items.`
    case 'additionalProperties': {
      const prop = (error.params as { additionalProperty?: string }).additionalProperty ?? ''
      return `Field \`${path}\` has unexpected property \`${prop}\`.`
    }
    default:
      return error.message ?? `Validation failed at \`${path}\`.`
  }
}

/**
 * AJV `allOf` can produce duplicate errors when both the parent schema
 * and the allOf target have the same constraint. Deduplicate by path+message.
 */
function deduplicateIssues(issues: AutomationValidationIssue[]): AutomationValidationIssue[] {
  const seen = new Set<string>()
  return issues.filter((issue) => {
    const key = `${issue.path}::${issue.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
