import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'

import {
  AUTOMATION_OBJECT_KINDS,
  type AutomationMarkdownDocument,
  type AutomationObjectFrontmatter,
  type AutomationObjectKind,
  type AutomationObjectSummary,
  type AutomationValidationIssue,
  type AutomationValidationResult,
  type LensVersionParameterDeclaration,
} from '@lenserfight/types'
import { extractParams } from '@lenserfight/utils/text'
import { parse } from 'yaml'
import { getLenserfightRuntimeDir } from './local-battle-paths'

export const AUTOMATION_FILE_NAMES: Record<AutomationObjectKind, string> = {
  lens: 'LENS.MD',
  lenser: 'LENSER.MD',
  colens: 'COLENS.MD',
  battle: 'BATTLE.MD',
  team: 'TEAM.MD',
  agent: 'AGENT.md',
  agent_team: 'AGENT_TEAM.md',
  tool: 'TOOL.md',
  workflow: 'WORKFLOW.md',
  private_battle: 'PRIVATE_BATTLE.md',
  skill: 'SKILL.md',
  memory_policy: 'MEMORY_POLICY.md',
  evaluation: 'EVALUATION.md',
  run_report: 'RUN_REPORT.md',
}

const REQUIRED_FRONTMATTER_KEYS: Record<AutomationObjectKind, string[]> = {
  lens: ['name', 'description'],
  lenser: ['name', 'description'],
  colens: ['name', 'description'],
  battle: ['name', 'description'],
  team: ['name', 'description'],
  agent: ['name'],
  agent_team: ['name'],
  tool: ['name'],
  workflow: ['name'],
  private_battle: ['name'],
  skill: ['name', 'description'],
  memory_policy: ['name'],
  evaluation: ['name'],
  run_report: ['name'],
}

const REQUIRED_SECTIONS: Record<AutomationObjectKind, string[]> = {
  lens: ['Purpose', 'Prompt', 'Inputs', 'Outputs'],
  lenser: ['Mission', 'Activation', 'Operating Rules'],
  colens: ['Purpose', 'Inputs', 'Steps', 'Outputs'],
  battle: ['Purpose', 'Participants', 'Evaluation', 'Report'],
  team: ['Team Purpose', 'LENSERS', 'Collaboration Rules'],
  agent: ['Purpose', 'Instructions', 'Execution Policy'],
  agent_team: ['Team Purpose', 'Members', 'Collaboration Rules'],
  tool: ['Capability Description', 'Inputs', 'Outputs', 'Failure Modes'],
  workflow: ['Purpose', 'Inputs', 'Steps', 'Outputs'],
  private_battle: ['Purpose', 'Participants', 'Evaluation', 'Report'],
  skill: ['Purpose', 'When To Use', 'Workflow'],
  memory_policy: ['Purpose', 'What To Store', 'What Not To Store'],
  evaluation: ['Purpose', 'Dataset', 'Metrics', 'Judging'],
  run_report: ['Summary', 'Inputs', 'Results'],
}

const AUTOMATION_REGISTRY_FILE = '.lenserfight/automation-registry.json'
const AUTOMATION_RUNS_DIR = 'runs'
const AUTOMATION_REPORTS_DIR = 'reports'
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DISCLOSURE_DIRS = {
  references: 'references',
  scripts: 'scripts',
  assets: 'assets',
  evals: 'evals',
} as const

const PRIMARY_FILE_KIND_BY_NAME: Record<string, AutomationObjectKind> = Object.fromEntries(
  Object.entries(AUTOMATION_FILE_NAMES).map(([kind, fileName]) => [
    fileName.toLowerCase(),
    kind as AutomationObjectKind,
  ])
) as Record<string, AutomationObjectKind>

export interface AutomationRegistryEntry extends AutomationObjectSummary {
  imported_at: string
}

export interface WorkflowSimulationArtifact {
  reportPath: string
  jsonPath: string
}

function runtimeWorkspaceDir(cwd = process.cwd()): string {
  const workspaceId = createHash('sha256').update(resolve(cwd)).digest('hex').slice(0, 12)
  return resolve(getLenserfightRuntimeDir(), 'workspaces', workspaceId)
}

export function isAutomationObjectKind(value: string): value is AutomationObjectKind {
  return (AUTOMATION_OBJECT_KINDS as readonly string[]).includes(value)
}

export function resolveAutomationFileName(kind: AutomationObjectKind): string {
  return AUTOMATION_FILE_NAMES[kind]
}

export function templateForKind(kind: AutomationObjectKind): string {
  switch (kind) {
    case 'lenser':
      return LENSER_TEMPLATE
    case 'colens':
      return COLENS_TEMPLATE
    case 'battle':
      return BATTLE_TEMPLATE
    case 'team':
      return TEAM_TEMPLATE
    case 'agent':
      return AGENT_TEMPLATE
    case 'agent_team':
      return AGENT_TEAM_TEMPLATE
    case 'tool':
      return TOOL_TEMPLATE
    case 'workflow':
      return WORKFLOW_TEMPLATE
    case 'private_battle':
      return PRIVATE_BATTLE_TEMPLATE
    case 'skill':
      return SKILL_TEMPLATE
    case 'memory_policy':
      return MEMORY_POLICY_TEMPLATE
    case 'evaluation':
      return EVALUATION_TEMPLATE
    case 'run_report':
      return RUN_REPORT_TEMPLATE
    case 'lens':
      return LENS_TEMPLATE
  }
}

export function parseAutomationDocument(filePath: string): AutomationValidationResult {
  const issues: AutomationValidationIssue[] = []
  let raw = ''

  try {
    raw = readFileSync(filePath, 'utf-8')
  } catch (error) {
    return {
      ok: false,
      issues: [{ path: 'file', message: (error as Error).message, severity: 'error' }],
    }
  }

  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!frontmatterMatch) {
    return {
      ok: false,
      issues: [{ path: 'frontmatter', message: 'Missing YAML frontmatter block.', severity: 'error' }],
    }
  }

  let frontmatter: AutomationObjectFrontmatter
  try {
    frontmatter = parse(frontmatterMatch[1]) as AutomationObjectFrontmatter
  } catch (error) {
    return {
      ok: false,
      issues: [{ path: 'frontmatter', message: `YAML parse failed: ${(error as Error).message}`, severity: 'error' }],
    }
  }

  if (!frontmatter || typeof frontmatter !== 'object') {
    return {
      ok: false,
      issues: [{ path: 'frontmatter', message: 'Frontmatter must parse to an object.', severity: 'error' }],
    }
  }

  const inferredKind = inferKindFromFilePath(filePath)
  const minimalUnit =
    Boolean(inferredKind) &&
    !Object.prototype.hasOwnProperty.call(frontmatter, 'kind') &&
    !Object.prototype.hasOwnProperty.call(frontmatter, 'schema_version')

  if (!frontmatter.kind && inferredKind) {
    frontmatter = {
      ...frontmatter,
      kind: inferredKind,
      schema_version: 1,
      id: typeof frontmatter.id === 'string' ? frontmatter.id : `${inferredKind}_${slugFragment(frontmatter.name ?? basename(dirname(filePath)))}`,
    }
  }

  const body = frontmatterMatch[2]
  const sections = parseSections(body)
  const document: AutomationMarkdownDocument = {
    filePath,
    frontmatter,
    body,
    sections,
  }

  return validateAutomationDocument(document, issues, { minimalUnit })
}

export function validateAutomationDocument(
  document: AutomationMarkdownDocument,
  initialIssues: AutomationValidationIssue[] = [],
  options: { minimalUnit?: boolean } = {}
): AutomationValidationResult {
  const issues = [...initialIssues]
  const { frontmatter, sections } = document

  if (!frontmatter.kind) {
    issues.push({ path: 'kind', message: 'Missing required frontmatter key `kind`.', severity: 'error' })
  } else if (!isAutomationObjectKind(frontmatter.kind)) {
    issues.push({
      path: 'kind',
      message: `Unknown kind \`${String(frontmatter.kind)}\`. Expected one of: ${AUTOMATION_OBJECT_KINDS.join(', ')}.`,
      severity: 'error',
    })
  }

  if (!options.minimalUnit && typeof frontmatter.schema_version !== 'number') {
    issues.push({ path: 'schema_version', message: 'Missing numeric `schema_version`.', severity: 'error' })
  }

  if (!options.minimalUnit && (!frontmatter.id || typeof frontmatter.id !== 'string')) {
    issues.push({ path: 'id', message: 'Missing string `id`.', severity: 'error' })
  }

  if (frontmatter.kind && isAutomationObjectKind(frontmatter.kind)) {
    for (const key of REQUIRED_FRONTMATTER_KEYS[frontmatter.kind]) {
      if (!(key in frontmatter)) {
        issues.push({
          path: key,
          message: `Missing required frontmatter key \`${key}\` for ${frontmatter.kind}.`,
          severity: 'error',
        })
      }
    }

    if (!options.minimalUnit) {
      for (const section of REQUIRED_SECTIONS[frontmatter.kind]) {
        if (!sections[section]) {
          issues.push({
            path: `section:${section}`,
            message: `Missing required markdown section \`# ${section}\`.`,
            severity: 'error',
          })
        }
      }
    }

    validateProgressiveDisclosureRefs(document, issues)
    validateLensParameterContract(document, issues)
    validateBattleReferences(document, issues)
  }

  return {
    ok: !issues.some((issue) => issue.severity === 'error'),
    kind: frontmatter.kind && isAutomationObjectKind(frontmatter.kind) ? frontmatter.kind : undefined,
    document,
    issues,
  }
}

export function findAutomationFiles(inputPath: string): string[] {
  const resolved = resolve(inputPath)
  if (!existsSync(resolved)) return []

  const stats = statSync(resolved)
  if (stats.isFile()) return extname(resolved).toLowerCase() === '.md' ? [resolved] : []

  const results: string[] = []
  walkMarkdownFiles(resolved, results)
  return results
}

export function inferKindFromFilePath(filePath: string): AutomationObjectKind | undefined {
  return PRIMARY_FILE_KIND_BY_NAME[basename(filePath).toLowerCase()]
}

export function resolveUnitRoot(filePath: string): string {
  return dirname(resolve(filePath))
}

export function resolveUnitRelativePath(unitRoot: string, relativePath: string): string {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error('Unit reference path must be a non-empty string.')
  }
  if (isAbsolute(relativePath) || relativePath.split(/[\\/]+/).includes('..')) {
    throw new Error(`Unit reference must stay inside the unit root: ${relativePath}`)
  }
  return resolve(unitRoot, relativePath)
}

export function loadUnitReference(unitRoot: string, relativePath: string): string {
  return readFileSync(resolveUnitRelativePath(unitRoot, relativePath), 'utf-8')
}

function walkMarkdownFiles(dir: string, results: string[]) {
  const knownFileNames = new Set(
    Object.values(AUTOMATION_FILE_NAMES).map((value) => value.toLowerCase())
  )

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      walkMarkdownFiles(fullPath, results)
      continue
    }

    if (extname(entry).toLowerCase() !== '.md') continue
    const isKnownByName = knownFileNames.has(entry.toLowerCase())
    const raw = readFileSync(fullPath, 'utf-8')
    if (isKnownByName || /^---\n[\s\S]*?\nkind:\s+/m.test(raw)) {
      results.push(fullPath)
    }
  }
}

function parseSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {}
  let current = ''

  for (const line of body.split('\n')) {
    const headingMatch = line.match(/^#\s+(.+)$/)
    if (headingMatch) {
      current = headingMatch[1].trim()
      sections[current] = ''
      continue
    }

    if (!current) continue
    sections[current] = sections[current]
      ? `${sections[current]}\n${line}`.trimEnd()
      : line.trimEnd()
  }

  return sections
}

function getDisclosurePath(entry: unknown): string | null {
  if (typeof entry === 'string') return entry
  if (entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).path === 'string') {
    return (entry as Record<string, string>).path
  }
  return null
}

function disclosureEntries(frontmatter: AutomationObjectFrontmatter, key: keyof typeof DISCLOSURE_DIRS): unknown[] {
  const value = (frontmatter as unknown as Record<string, unknown>)[key]
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function validateProgressiveDisclosureRefs(
  document: AutomationMarkdownDocument,
  issues: AutomationValidationIssue[]
): void {
  if (!document.filePath) return
  const unitRoot = resolveUnitRoot(document.filePath)

  for (const [key, expectedDir] of Object.entries(DISCLOSURE_DIRS) as Array<[keyof typeof DISCLOSURE_DIRS, string]>) {
    const entries = disclosureEntries(document.frontmatter, key)
    entries.forEach((entry, index) => {
      const relPath = getDisclosurePath(entry)
      if (!relPath) {
        issues.push({
          path: `${key}[${index}]`,
          message: 'Disclosure entries must be strings or objects with a `path` string.',
          severity: 'error',
        })
        return
      }

      try {
        const resolved = resolveUnitRelativePath(unitRoot, relPath)
        if (!relPath.replace(/\\/g, '/').startsWith(`${expectedDir}/`)) {
          issues.push({
            path: `${key}[${index}]`,
            message: `Path must live under \`${expectedDir}/\` and be relative to the unit root.`,
            severity: 'error',
          })
        }
        if (!existsSync(resolved)) {
          issues.push({
            path: `${key}[${index}]`,
            message: `Referenced file does not exist: ${relPath}`,
            severity: 'error',
          })
        }
      } catch (error) {
        issues.push({
          path: `${key}[${index}]`,
          message: (error as Error).message,
          severity: 'error',
        })
      }

      if (
        key === 'scripts' &&
        entry &&
        typeof entry === 'object' &&
        (entry as Record<string, unknown>).interactive === true
      ) {
        issues.push({
          path: `${key}[${index}].interactive`,
          message: 'Scripts referenced by automation units must be non-interactive.',
          severity: 'warning',
        })
      }
    })
  }
}

function normalizeParamLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

function getLensParameters(frontmatter: AutomationObjectFrontmatter): LensVersionParameterDeclaration[] {
  const raw = (frontmatter as unknown as Record<string, unknown>).parameters
  if (!Array.isArray(raw)) return []
  return raw as LensVersionParameterDeclaration[]
}

function validateLensParameterContract(
  document: AutomationMarkdownDocument,
  issues: AutomationValidationIssue[]
): void {
  if (document.frontmatter.kind !== 'lens') return

  const bodyParams = extractParams(document.body).map((param) => param.name)
  const declaredParams = getLensParameters(document.frontmatter)
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
  document: AutomationMarkdownDocument,
  issues: AutomationValidationIssue[]
): void {
  if (document.frontmatter.kind !== 'battle') return

  const frontmatter = document.frontmatter as unknown as Record<string, unknown>
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

export function toSummary(result: AutomationValidationResult): AutomationObjectSummary | null {
  const doc = result.document
  if (!result.ok || !doc?.frontmatter.kind || !isAutomationObjectKind(doc.frontmatter.kind)) return null

  return {
    kind: doc.frontmatter.kind,
    id: doc.frontmatter.id,
    name: doc.frontmatter.name ?? basename(doc.filePath ?? '', '.md'),
    path: doc.filePath,
    version: doc.frontmatter.version,
    visibility: doc.frontmatter.visibility,
    status: doc.frontmatter.status,
  }
}

export function loadAutomationRegistry(cwd = process.cwd()): AutomationRegistryEntry[] {
  const registryPath = resolve(cwd, AUTOMATION_REGISTRY_FILE)
  if (!existsSync(registryPath)) return []

  try {
    return JSON.parse(readFileSync(registryPath, 'utf-8')) as AutomationRegistryEntry[]
  } catch {
    return []
  }
}

export function saveAutomationRegistry(entries: AutomationRegistryEntry[], cwd = process.cwd()) {
  const registryPath = resolve(cwd, AUTOMATION_REGISTRY_FILE)
  mkdirSync(dirname(registryPath), { recursive: true })
  writeFileSync(registryPath, JSON.stringify(entries, null, 2) + '\n')
}

export function registerAutomationFiles(filePaths: string[], cwd = process.cwd()) {
  const existing = loadAutomationRegistry(cwd)
  const byKey = new Map(existing.map((entry) => [`${entry.kind}:${entry.id}`, entry]))
  const imported: AutomationRegistryEntry[] = []
  const failures: Array<{ filePath: string; issues: AutomationValidationIssue[] }> = []

  for (const filePath of filePaths) {
    const result = parseAutomationDocument(filePath)
    if (!result.ok) {
      failures.push({ filePath, issues: result.issues })
      continue
    }

    const summary = toSummary(result)
    if (!summary) {
      failures.push({
        filePath,
        issues: [{ path: 'summary', message: 'Could not build object summary.', severity: 'error' }],
      })
      continue
    }

    const entry: AutomationRegistryEntry = {
      ...summary,
      path: relative(cwd, summary.path ?? filePath),
      imported_at: new Date().toISOString(),
    }

    byKey.set(`${entry.kind}:${entry.id}`, entry)
    imported.push(entry)
  }

  saveAutomationRegistry([...byKey.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)), cwd)

  return { imported, failures }
}

export function exportAutomationTemplate(kind: AutomationObjectKind, outPath?: string, cwd = process.cwd()) {
  const fileName = resolveAutomationFileName(kind)
  const target = resolve(cwd, outPath || fileName)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, templateForKind(kind))
  return target
}

export function exportAutomationObject(kind: AutomationObjectKind, id: string, outPath?: string, cwd = process.cwd()) {
  const registry = loadAutomationRegistry(cwd)
  const entry = registry.find((candidate) => candidate.kind === kind && candidate.id === id)
  if (!entry?.path) {
    throw new Error(`No imported ${kind} with id ${id} found in ${AUTOMATION_REGISTRY_FILE}.`)
  }

  const source = resolve(cwd, entry.path)
  const target = resolve(cwd, outPath || resolveAutomationFileName(kind))
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(source, target)
  return { source, target }
}

export function ensureAutomationRunDirs(cwd = process.cwd()) {
  const base = runtimeWorkspaceDir(cwd)
  mkdirSync(resolve(base, AUTOMATION_RUNS_DIR), { recursive: true })
  mkdirSync(resolve(base, AUTOMATION_REPORTS_DIR), { recursive: true })
}

export function writeWorkflowSimulationArtifacts(
  slug: string,
  summary: Record<string, unknown>,
  markdown: string,
  cwd = process.cwd()
): WorkflowSimulationArtifact {
  ensureAutomationRunDirs(cwd)
  const base = runtimeWorkspaceDir(cwd)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safeSlug = slug || 'automation-run'
  const jsonPath = resolve(base, AUTOMATION_RUNS_DIR, `${safeSlug}-${timestamp}.json`)
  const reportPath = resolve(base, AUTOMATION_REPORTS_DIR, `${safeSlug}-${timestamp}.md`)
  writeFileSync(jsonPath, JSON.stringify(summary, null, 2) + '\n')
  writeFileSync(reportPath, markdown)
  return { jsonPath, reportPath }
}

export function buildWorkflowSimulationReport(
  name: string,
  status: 'ready' | 'blocked' | 'failed',
  steps: string[],
  inputs?: Record<string, unknown>
) {
  const inputBlock = inputs ? `\n## Inputs\n\n\`\`\`json\n${JSON.stringify(inputs, null, 2)}\n\`\`\`\n` : ''
  const stepsBlock = steps.map((step, index) => `${index + 1}. ${step}`).join('\n')

  return `---
kind: run_report
schema_version: 1
id: run_report_${slugFragment(name)}
name: ${name} simulation report
status: active
version: 0.1.0
---

# Summary

- Source: ${name}
- Status: ${status}
- Step count: ${steps.length}
${inputBlock}
# Inputs

${inputs ? 'See the JSON block above for the exact simulation inputs.' : 'No runtime inputs were supplied.'}

# Results

${stepsBlock || '1. No executable steps were declared in the source workflow.'}

# Notes

This report was generated locally by the LenserFight CLI simulation scaffold. It does not represent a hosted execution record.
`
}

function slugFragment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'automation'
}

const LENS_TEMPLATE = `---
kind: lens
schema_version: 1
id: lens_<uuid>
slug: market-brief
name: Market Brief Lens
description: Structured task unit for a reusable market brief prompt.
owner:
  workspace_id: ws_<uuid>
visibility: workspace
status: draft
version: 0.1.0
tags:
  - research
input_schema:
  type: object
output_schema:
  type: object
evaluation_refs: []
---

# Purpose
Explain what this lens is meant to do.

# Prompt
Write the structured prompt body here.

# Inputs
Describe runtime inputs and validation.

# Outputs
Describe the expected output shape and quality bar.
`

const LENSER_TEMPLATE = `---
name: repository-lenser
description: Use when a LENSER should inspect a repository, follow local rules, and return implementation-ready guidance.
---

# Mission
Describe what this LENSER owns and when it should activate.

# Activation
Name the signals, files, or user requests that should trigger this LENSER.

# Operating Rules
Define boundaries, safety checks, scripts, references, and handoff expectations.
`

const COLENS_TEMPLATE = `---
name: review-to-fix-colens
description: Use when coordinating multiple LENS or LENSER steps into one repeatable workflow.
---

# Purpose
Describe the workflow outcome.

# Inputs
List required inputs, defaults, and validation expectations.

# Steps
1. Resolve the source material.
2. Run the referenced LENS or LENSER steps.
3. Produce the final artifact and validation report.

# Outputs
Describe the final artifact, side effects, and acceptance criteria.
`

const BATTLE_TEMPLATE = `---
name: implementation-battle
description: Use when comparing LENS, COLENS, LENSER, team, model, or human outputs against shared evals.
participants:
  - type: lens
    ref: ../lenses/example-lens/LENS.MD
---

# Purpose
State the comparison goal and decision this BATTLE should support.

# Participants
List LENS, COLENS, LENSER, team, model, prompt, or human contenders.

# Evaluation
Define evals, scoring method, judges, and tie handling.

# Report
Define the result format and what evidence must be included.
`

const TEAM_TEMPLATE = `---
name: implementation-team
description: Use when a group of LENSERS coordinates on a shared outcome.
---

# Team Purpose
Describe what this team owns.

# LENSERS
List members, roles, and responsibility boundaries.

# Collaboration Rules
Define delegation, review, conflict resolution, and escalation rules.
`

const AGENT_TEMPLATE = `---
kind: agent
schema_version: 1
id: agent_<uuid>
slug: research-analyst
name: Research Analyst
description: Investigates topics, synthesizes findings, and drafts reports.
owner:
  workspace_id: ws_<uuid>
  created_by: user_<uuid>
visibility: private
version: 0.1.0
status: draft
role: researcher
capabilities:
  - workspace_exploration
  - competitor_research
model_policy:
  mode: dynamic
  preferred_models:
    - openai:gpt-5
tool_policy:
  allow:
    - web.search
memory_policy_ref: memory_policy_workspace_default
workspace_permissions:
  read_scopes:
    - lenses/*
allowed_actions:
  - read
  - suggest
  - draft
---

# Purpose
What the agent is for, where it should be used, and where it should not be used.

# Instructions
System-level operating instructions, decision rules, and output expectations.

# Execution Policy
When the agent may act autonomously, when it must pause, and how it handles ambiguity.
`

const AGENT_TEAM_TEMPLATE = `---
kind: agent_team
schema_version: 1
id: team_<uuid>
slug: research-ops
name: Research Ops Team
description: Multi-agent team for researching, validating, and reporting findings.
owner:
  workspace_id: ws_<uuid>
visibility: workspace
version: 0.1.0
status: active
purpose: Produce validated research reports with human approval for publication.
team_lead_agent: agent_research_lead
members:
  - agent_id: agent_research_lead
    role: lead
shared_tools:
  - web.search
---

# Team Purpose
Why the team exists and what outcomes it owns.

# Members
Member list, roles, responsibilities, and lead/backup structure.

# Collaboration Rules
Delegation, review, conflict resolution, and communication norms.
`

const TOOL_TEMPLATE = `---
kind: tool
schema_version: 1
id: tool_<uuid>
slug: web-search
name: Web Search
description: Query public web sources and return ranked results.
owner:
  workspace_id: ws_<uuid>
visibility: workspace
status: active
version: 0.1.0
category: read_only
permission_level: read
cost_level: low
risk_level: safe
input_schema:
  type: object
output_schema:
  type: object
---

# Capability Description
What the tool does and what it does not do.

# Inputs
Describe accepted inputs and validation.

# Outputs
Describe the output contract.

# Failure Modes
Timeout, rate limit, auth error, malformed upstream data, and empty result.
`

const WORKFLOW_TEMPLATE = `---
kind: workflow
schema_version: 1
id: wf_<uuid>
slug: competitor-research-report
name: Competitor Research Report
description: Research competitors, validate findings, and generate a report.
owner:
  workspace_id: ws_<uuid>
visibility: private
version: 0.1.0
status: draft
workflow_type: scheduled
triggers:
  - type: schedule
steps:
  - id: plan
    type: agent_task
    agent_ref: agent_research_lead
---

# Purpose
What the workflow automates and expected business outcome.

# Inputs
Input contract, defaults, and validation.

# Steps
Ordered steps, branches, tool and agent bindings, and failure behavior.

# Outputs
Primary outputs, artifacts, and storage destinations.
`

const PRIVATE_BATTLE_TEMPLATE = `---
kind: private_battle
schema_version: 1
id: pb_<uuid>
slug: support-agent-a-b
name: Support Agent A vs B
owner:
  workspace_id: ws_<uuid>
visibility: private
status: draft
version: 0.1.0
participants:
  - type: agent
    ref: agent_support_v1
evaluation_method: rubric_plus_judge
---

# Purpose
Comparison goal and decision this battle supports.

# Participants
Agents, workflows, models, prompts, or humans under test.

# Evaluation
Judge agent, human review, rubric, thresholds, and tie rules.

# Report
Required sections in the exported report.
`

const SKILL_TEMPLATE = `---
kind: skill
schema_version: 1
id: skill_<uuid>
slug: competitor-research-skill
name: Competitor Research Skill
description: Repeatable method for researching competitors and building structured reports.
owner:
  workspace_id: ws_<uuid>
visibility: workspace
version: 0.1.0
status: active
activation:
  keywords:
    - competitor research
---

# Purpose
What the skill helps accomplish.

# When To Use
Activation conditions, preconditions, and anti-patterns.

# Workflow
Step-by-step instructions the agent should follow.
`

const MEMORY_POLICY_TEMPLATE = `---
kind: memory_policy
schema_version: 1
id: memory_policy_<uuid>
slug: workspace-default-memory
name: Workspace Default Memory
owner:
  workspace_id: ws_<uuid>
visibility: workspace
status: active
version: 0.1.0
scope:
  readable:
    - workspace
retention:
  short_term_days: 14
---

# Purpose
What memory supports and for whom.

# What To Store
Durable facts, stable preferences, approved summaries, and reusable artifacts.

# What Not To Store
Sensitive data, noisy transcripts, low-confidence claims, and temporary failures.
`

const EVALUATION_TEMPLATE = `---
kind: evaluation
schema_version: 1
id: evaluation_<uuid>
slug: research-quality-eval
name: Research Quality Evaluation
owner:
  workspace_id: ws_<uuid>
visibility: workspace
status: draft
version: 0.1.0
rubric_ref: rubric_research_quality
dataset_ref: dataset_research_cases_v1
metrics:
  - completeness
  - citation_quality
---

# Purpose
What quality signal this evaluation is responsible for.

# Dataset
Describe the cases, fixtures, or benchmark dataset.

# Metrics
Define the metrics, thresholds, and pass conditions.

# Judging
Describe rubric scoring, judge agent use, and human overrides.
`

const RUN_REPORT_TEMPLATE = `---
kind: run_report
schema_version: 1
id: run_report_<uuid>
slug: workflow-run-report
name: Workflow Run Report
owner:
  workspace_id: ws_<uuid>
visibility: workspace
status: active
version: 0.1.0
---

# Summary
Top-line outcome, cost, and latency.

# Inputs
Describe runtime inputs and references.

# Results
Summarize outputs, failures, and next actions.
`
