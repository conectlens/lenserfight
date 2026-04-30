import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'

import {
  AUTOMATION_OBJECT_KINDS,
  type AutomationMarkdownDocument,
  type AutomationObjectFrontmatter,
  type AutomationObjectKind,
  type AutomationObjectSummary,
  type AutomationValidationIssue,
  type AutomationValidationResult,
} from '@lenserfight/types'
import { parse } from 'yaml'

export const AUTOMATION_FILE_NAMES: Record<AutomationObjectKind, string> = {
  lens: 'LENS.md',
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
  lens: ['name'],
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
const AUTOMATION_RUNS_DIR = '.lenserfight/runs'
const AUTOMATION_REPORTS_DIR = '.lenserfight/reports'

export interface AutomationRegistryEntry extends AutomationObjectSummary {
  imported_at: string
}

export interface WorkflowSimulationArtifact {
  reportPath: string
  jsonPath: string
}

export function isAutomationObjectKind(value: string): value is AutomationObjectKind {
  return (AUTOMATION_OBJECT_KINDS as readonly string[]).includes(value)
}

export function resolveAutomationFileName(kind: AutomationObjectKind): string {
  return AUTOMATION_FILE_NAMES[kind]
}

export function templateForKind(kind: AutomationObjectKind): string {
  switch (kind) {
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

  const body = frontmatterMatch[2]
  const sections = parseSections(body)
  const document: AutomationMarkdownDocument = {
    filePath,
    frontmatter,
    body,
    sections,
  }

  return validateAutomationDocument(document, issues)
}

export function validateAutomationDocument(
  document: AutomationMarkdownDocument,
  initialIssues: AutomationValidationIssue[] = []
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

  if (typeof frontmatter.schema_version !== 'number') {
    issues.push({ path: 'schema_version', message: 'Missing numeric `schema_version`.', severity: 'error' })
  }

  if (!frontmatter.id || typeof frontmatter.id !== 'string') {
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
  mkdirSync(resolve(cwd, AUTOMATION_RUNS_DIR), { recursive: true })
  mkdirSync(resolve(cwd, AUTOMATION_REPORTS_DIR), { recursive: true })
}

export function writeWorkflowSimulationArtifacts(
  slug: string,
  summary: Record<string, unknown>,
  markdown: string,
  cwd = process.cwd()
): WorkflowSimulationArtifact {
  ensureAutomationRunDirs(cwd)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safeSlug = slug || 'automation-run'
  const jsonPath = resolve(cwd, AUTOMATION_RUNS_DIR, `${safeSlug}-${timestamp}.json`)
  const reportPath = resolve(cwd, AUTOMATION_REPORTS_DIR, `${safeSlug}-${timestamp}.md`)
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
