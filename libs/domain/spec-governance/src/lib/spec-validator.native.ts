/**
 * Native (Expo/React Native) override of spec-validator.
 * node:path and node:fs are not available on Hermes — validateProgressiveDisclosureRefs
 * is a no-op here (it already guards with isNode on the web version).
 * All other validation layers (JSON Schema, Markdown sections, semantic checks) run normally.
 */

import type { AutomationValidationIssue } from '@lenserfight/types'
import { extractParams } from '@lenserfight/utils/text'

import { validateFrontmatterSchema } from './schema-validator'
import { AUTOMATION_KIND_TO_SPEC_KIND, SPEC_KIND_META, type SpecKind } from './spec-kinds'

// ─── Public types ────────────────────────────────────────────────────────────

export interface SpecValidationOptions {
  skipSections?: boolean
  skipSemanticChecks?: boolean
  minimalUnit?: boolean
}

export interface SpecValidationInput {
  frontmatter: Record<string, unknown>
  body: string
  sections: Record<string, string>
  filePath?: string
}

// ─── Main entry point ────────────────────────────────────────────────────────

export function validateSpec(
  input: SpecValidationInput,
  options: SpecValidationOptions = {},
): AutomationValidationIssue[] {
  const issues: AutomationValidationIssue[] = []
  const { frontmatter, body, sections } = input
  const kind = typeof frontmatter.kind === 'string' ? frontmatter.kind : undefined

  if (kind) {
    issues.push(...validateFrontmatterSchema(kind, frontmatter))
  }

  if (!options.minimalUnit) {
    const av = frontmatter.apiVersion
    if (av === undefined) {
      issues.push({
        path: 'apiVersion',
        message:
          'Missing `apiVersion`. Add `apiVersion: lenserfight.dev/v1alpha1` to opt into the versioned spec format, or run `lf spec migrate` to add it automatically.',
        severity: 'warning',
      })
    } else if (typeof av !== 'string' || !av.startsWith('lenserfight.dev/')) {
      issues.push({
        path: 'apiVersion',
        message: `Unrecognized \`apiVersion\` value "${String(av)}". Expected: lenserfight.dev/v1alpha1.`,
        severity: 'warning',
      })
    }
  }

  if (!options.minimalUnit && typeof frontmatter.schema_version !== 'number') {
    issues.push({ path: 'schema_version', message: 'Missing numeric `schema_version`.', severity: 'error' })
  }
  if (!options.minimalUnit && (!frontmatter.id || typeof frontmatter.id !== 'string')) {
    issues.push({ path: 'id', message: 'Missing string `id`.', severity: 'error' })
  }

  if (!options.skipSections && !options.minimalUnit && kind) {
    const specKind = resolveSpecKind(kind)
    if (specKind) {
      const meta = SPEC_KIND_META[specKind]
      for (const section of meta.requiredSections) {
        if (!sections[section]) {
          issues.push({
            path: `section:${section}`,
            message: `Missing required markdown section \`# ${section}\`.`,
            severity: 'error',
          })
        }
      }
    }
  }

  if (!options.skipSemanticChecks && kind) {
    // validateProgressiveDisclosureRefs omitted: requires node:path / node:fs
    validateLensParameterContract(kind, frontmatter, body, issues)
    validateBattleReferences(kind, frontmatter, issues)
    validateDisclaimerMarkers(kind, frontmatter, body, issues)
  }

  return issues
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveSpecKind(kind: string): SpecKind | undefined {
  return AUTOMATION_KIND_TO_SPEC_KIND[kind]
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ParameterDeclaration {
  label?: string
  tool_id?: string
  toolId?: string
}

function normalizeParamLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

function validateLensParameterContract(
  kind: string,
  frontmatter: Record<string, unknown>,
  body: string,
  issues: AutomationValidationIssue[],
): void {
  if (kind !== 'lens') return

  const bodyParams = extractParams(body).map((param) => param.name)
  const rawParams = frontmatter.parameters
  const declaredParams: ParameterDeclaration[] = Array.isArray(rawParams)
    ? (rawParams as ParameterDeclaration[])
    : []
  const declaredLabels = new Set<string>()

  declaredParams.forEach((param, index) => {
    if (!param || typeof param !== 'object') {
      issues.push({ path: `parameters[${index}]`, message: 'Parameter declarations must be objects.', severity: 'error' })
      return
    }
    if (!param.label || typeof param.label !== 'string') {
      issues.push({ path: `parameters[${index}].label`, message: 'Parameter label is required.', severity: 'error' })
      return
    }
    declaredLabels.add(normalizeParamLabel(param.label))

    const toolId = param.tool_id ?? param.toolId
    if (!toolId || typeof toolId !== 'string') {
      issues.push({
        path: `parameters[${index}].tool_id`,
        message: 'Parameter declarations must include `tool_id`, mirroring lenses.version_parameters.tool_id.',
        severity: 'error',
      })
    } else if (!UUID_REGEX.test(toolId)) {
      issues.push({
        path: `parameters[${index}].tool_id`,
        message: '`tool_id` must be a UUID because lenses.version_parameters.tool_id references lenses.tools(id).',
        severity: 'error',
      })
    }
  })

  if (bodyParams.length > 0 && declaredParams.length === 0) {
    issues.push({
      path: 'parameters',
      message: 'LENS.MD body contains [[parameters]] but no frontmatter `parameters` declarations.',
      severity: 'error',
    })
    return
  }

  for (const name of bodyParams) {
    if (!declaredLabels.has(name)) {
      issues.push({
        path: `parameters.${name}`,
        message: `Placeholder [[${name}]] must be declared in frontmatter parameters.`,
        severity: 'error',
      })
    }
  }

  for (const label of declaredLabels) {
    if (!bodyParams.includes(label)) {
      issues.push({
        path: `parameters.${label}`,
        message: `Parameter \`${label}\` is declared but not used in the LENS.MD body.`,
        severity: 'warning',
      })
    }
  }
}

function validateBattleReferences(
  kind: string,
  frontmatter: Record<string, unknown>,
  issues: AutomationValidationIssue[],
): void {
  if (kind !== 'battle') return

  const participants = Array.isArray(frontmatter.participants) ? frontmatter.participants : []
  const orchestrationKeys = ['lenses', 'colenses', 'lensers', 'teams', 'evals', 'scoring', 'comparison']
  const hasOrchestration = participants.length > 0 || orchestrationKeys.some((key) => frontmatter[key] !== undefined)

  if (!hasOrchestration) {
    issues.push({
      path: 'battle',
      message: 'BATTLE.MD should declare participants or orchestration references.',
      severity: 'warning',
    })
  }

  participants.forEach((participant, index) => {
    if (!participant || typeof participant !== 'object') {
      issues.push({ path: `participants[${index}]`, message: 'Battle participants must be objects.', severity: 'error' })
      return
    }
    const row = participant as Record<string, unknown>
    if (typeof row.type !== 'string' || typeof row.ref !== 'string' || row.ref.trim() === '') {
      issues.push({
        path: `participants[${index}]`,
        message: 'Battle participants require string `type` and `ref` fields.',
        severity: 'error',
      })
    }
  })
}

function validateDisclaimerMarkers(
  kind: string,
  frontmatter: Record<string, unknown>,
  body: string,
  issues: AutomationValidationIssue[],
): void {
  const rayValues = new Set(
    [frontmatter['rays'], frontmatter['tags']]
      .flatMap((value) => (Array.isArray(value) ? value : []))
      .map((value) => String(value).toLowerCase()),
  )
  const text = `${body}\n${frontmatter.description ?? ''}`.toLowerCase()
  const isLegal = rayValues.has('legal') || rayValues.has('legal-adjacent') || text.includes('legal')
  const isFinance = rayValues.has('finance') || text.includes('financial advice') || text.includes('finance report')

  if (isLegal && !text.includes('not legal advice')) {
    issues.push({
      path: 'disclaimer.legal',
      message: 'Legal-adjacent templates must say the output is not legal advice and should be reviewed by a qualified lawyer.',
      severity: 'error',
    })
  }

  if (isFinance && !text.includes('not financial advice') && !text.includes('not certified financial advice')) {
    issues.push({
      path: 'disclaimer.finance',
      message: 'Finance templates must say the output is not financial advice.',
      severity: 'error',
    })
  }
}
