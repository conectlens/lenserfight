import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  findAutomationFiles,
  discoverLenserfightWorkspace,
  exportAutomationTemplate,
  loadUnitReference,
  parseAutomationDocument,
  planTerminologyMigration,
  registerAutomationFiles,
  resolveUnitRelativePath,
  writeWorkflowSimulationArtifacts,
} from './automation-objects'

describe('automation object utilities', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'lf-automation-'))
  const originalRuntimeDir = process.env.LENSERFIGHT_RUNTIME_DIR
  const originalLenserfightHome = process.env.LENSERFIGHT_HOME

  afterAll(() => {
    if (originalRuntimeDir === undefined) delete process.env.LENSERFIGHT_RUNTIME_DIR
    else process.env.LENSERFIGHT_RUNTIME_DIR = originalRuntimeDir
    if (originalLenserfightHome === undefined) delete process.env.LENSERFIGHT_HOME
    else process.env.LENSERFIGHT_HOME = originalLenserfightHome
    rmSync(workspace, { recursive: true, force: true })
  })

  it('parses and validates a canonical colens markdown file', () => {
    const filePath = join(workspace, 'COLENS.MD')
    writeFileSync(
      filePath,
      `---
kind: colens
schema_version: 1
id: colens_test
name: Test Colens
description: Test colens.
---

# Purpose
Run a test colens.

# Inputs
Describe inputs.

# Steps
1. Do the work.

# Outputs
Describe outputs.
`
    )

    const result = parseAutomationDocument(filePath)
    expect(result.ok).toBe(true)
    expect(result.kind).toBe('colens')
  })

  it('finds and registers canonical lenser markdown files', () => {
    const filePath = join(workspace, 'LENSER.MD')
    writeFileSync(
      filePath,
      `---
kind: lenser
schema_version: 1
id: lenser_test
name: Test Lenser
description: Test lenser.
---

# Mission
Act as a test lenser.

# Activation
Use for smoke tests.

# Operating Rules
Pause on destructive actions.
`
    )

    const files = findAutomationFiles(workspace)
    expect(files).toContain(filePath)

    const result = registerAutomationFiles([filePath], workspace)
    expect(result.imported).toHaveLength(1)
    expect(result.failures).toHaveLength(0)
  })

  it('keeps AGENT.MD and WORKFLOW.MD compatibility while inferring legacy kinds', () => {
    const agentPath = join(workspace, 'AGENT.MD')
    const workflowPath = join(workspace, 'WORKFLOW.MD')
    writeFileSync(agentPath, legacyAgent('compat-agent'))
    writeFileSync(workflowPath, legacyWorkflow('compat-workflow'))

    expect(findAutomationFiles(workspace)).toEqual(expect.arrayContaining([agentPath, workflowPath]))
    expect(parseAutomationDocument(agentPath).kind).toBe('agent')
    expect(parseAutomationDocument(workflowPath).kind).toBe('workflow')
  })

  it('accepts a simple native LENS.MD with Agent Skills-style frontmatter', () => {
    const unit = join(workspace, 'lenses', 'repo-architect')
    mkdirSync(unit, { recursive: true })
    const filePath = join(unit, 'LENS.MD')
    writeFileSync(
      filePath,
      `---
name: repo-architect
description: Use when the repository architecture must be discovered before planning changes.
---

# Repository Discovery
Inspect the codebase before proposing abstractions.
`
    )

    const result = parseAutomationDocument(filePath)
    expect(result.ok).toBe(true)
    expect(result.kind).toBe('lens')
    expect(result.document?.frontmatter.id).toBe('lens_repo-architect')
  })

  it('requires LENS.MD placeholders to be declared as version parameters', () => {
    const unit = join(workspace, 'lenses', 'parameterized')
    mkdirSync(unit, { recursive: true })
    const filePath = join(unit, 'LENS.MD')
    writeFileSync(
      filePath,
      `---
name: parameterized-lens
description: Use when a topic-specific response is needed.
---

# Prompt
Write about [[topic]].
`
    )

    const result = parseAutomationDocument(filePath)
    expect(result.ok).toBe(false)
    expect(result.issues.map((issue) => issue.path)).toContain('parameters')
  })

  it('validates declared parameters and progressive disclosure paths from the unit root', () => {
    const unit = join(workspace, 'lenses', 'complete')
    mkdirSync(join(unit, 'references'), { recursive: true })
    mkdirSync(join(unit, 'scripts'), { recursive: true })
    mkdirSync(join(unit, 'assets'), { recursive: true })
    mkdirSync(join(unit, 'evals'), { recursive: true })
    writeFileSync(join(unit, 'references', 'style.md'), 'Use concise prose.')
    writeFileSync(join(unit, 'scripts', 'render.mjs'), 'console.log(JSON.stringify({ ok: true }))')
    writeFileSync(join(unit, 'assets', 'template.txt'), 'Template')
    writeFileSync(join(unit, 'evals', 'smoke.yaml'), 'cases: []')

    const filePath = join(unit, 'LENS.MD')
    writeFileSync(
      filePath,
      `---
name: complete-lens
description: Use when a rendered response needs supporting assets.
parameters:
  - label: topic
    tool_id: 11111111-1111-4111-8111-111111111111
references:
  - path: references/style.md
scripts:
  - path: scripts/render.mjs
assets:
  - path: assets/template.txt
evals:
  - path: evals/smoke.yaml
---

# Prompt
Write about [[topic]].
`
    )

    const result = parseAutomationDocument(filePath)
    expect(result.ok).toBe(true)
    expect(loadUnitReference(unit, 'references/style.md')).toContain('concise')
    expect(() => resolveUnitRelativePath(unit, '../secret.txt')).toThrow(/unit root/)
  })

  it('treats BATTLE.MD as a first-class orchestration document', () => {
    const unit = join(workspace, 'battles', 'lens-smoke')
    mkdirSync(unit, { recursive: true })
    const filePath = join(unit, 'BATTLE.MD')
    writeFileSync(
      filePath,
      `---
name: lens-smoke-battle
description: Use when comparing two lenses with the same prompt.
participants:
  - type: lens
    ref: ../lenses/a/LENS.MD
  - type: lens
    ref: ../lenses/b/LENS.MD
---

# Purpose
Compare two LENS packages.
`
    )

    const result = parseAutomationDocument(filePath)
    expect(result.ok).toBe(true)
    expect(result.kind).toBe('battle')
  })

  it('writes workflow simulation artifacts to user runtime storage instead of project .lenserfight', () => {
    process.env.LENSERFIGHT_RUNTIME_DIR = join(workspace, 'runtime')

    const artifact = writeWorkflowSimulationArtifacts(
      'smoke',
      { ok: true },
      '# Report\n',
      workspace
    )

    expect(artifact.jsonPath).toContain(join(workspace, 'runtime'))
    expect(artifact.reportPath).toContain(join(workspace, 'runtime'))
    expect(artifact.jsonPath).not.toContain(join(workspace, '.lenserfight', 'runs'))
    expect(existsSync(artifact.jsonPath)).toBe(true)
    expect(existsSync(artifact.reportPath)).toBe(true)
  })

  it('discovers user-global, project-root, and nested .lenserfight roots without using the real home directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'lf-discovery-'))
    const globalHome = join(root, 'home', '.lenserfight')
    const project = join(root, 'project')
    const nested = join(project, 'apps', 'web')
    mkdirSync(join(globalHome, 'lenses', 'personal-summary'), { recursive: true })
    mkdirSync(join(project, '.lenserfight', 'lenses', 'team-summary'), { recursive: true })
    mkdirSync(join(nested, '.lenserfight', 'lenses', 'screen-review'), { recursive: true })
    process.env.LENSERFIGHT_HOME = globalHome

    writeFileSync(
      join(globalHome, 'lenses', 'personal-summary', 'LENS.MD'),
      minimalLens('personal-summary', 'Personal Summary')
    )
    writeFileSync(
      join(project, '.lenserfight', 'lenses', 'team-summary', 'LENS.MD'),
      minimalLens('team-summary', 'Team Summary')
    )
    writeFileSync(
      join(nested, '.lenserfight', 'lenses', 'screen-review', 'LENS.MD'),
      minimalLens('screen-review', 'Screen Review')
    )

    const discovery = discoverLenserfightWorkspace({ cwd: nested })
    expect(discovery.roots.map((rootInfo) => rootInfo.scope)).toEqual(['global', 'project', 'nested'])
    expect(discovery.winners.map((item) => item.key)).toEqual([
      'lens:personal-summary',
      'lens:screen-review',
      'lens:team-summary',
    ])

    rmSync(root, { recursive: true, force: true })
  })

  it('merges config defaults from global to project to nearest nested .lenserfight', () => {
    const root = mkdtempSync(join(tmpdir(), 'lf-config-'))
    const globalHome = join(root, 'home', '.lenserfight')
    const project = join(root, 'project')
    const nested = join(project, 'packages', 'api')
    mkdirSync(globalHome, { recursive: true })
    mkdirSync(join(project, '.lenserfight'), { recursive: true })
    mkdirSync(join(nested, '.lenserfight'), { recursive: true })
    process.env.LENSERFIGHT_HOME = globalHome

    writeFileSync(join(globalHome, 'config.json'), JSON.stringify({ defaults: { author: '@me', model: 'openai:gpt-5', rays: ['personal'] } }))
    writeFileSync(join(project, '.lenserfight', 'config.json'), JSON.stringify({ defaults: { author: '@team', provider: 'openai', rays: ['team'] } }))
    writeFileSync(join(nested, '.lenserfight', 'config.json'), JSON.stringify({ defaults: { model: 'anthropic:claude-sonnet-4-6', rays: ['api'] } }))

    const discovery = discoverLenserfightWorkspace({ cwd: nested, recursive: false })
    expect(discovery.config.defaults).toEqual(
      expect.objectContaining({
        author: '@team',
        model: 'anthropic:claude-sonnet-4-6',
        provider: 'openai',
        rays: ['personal', 'team', 'api'],
      })
    )

    rmSync(root, { recursive: true, force: true })
  })

  it('resolves duplicate slugs deterministically with local templates overriding global templates', () => {
    const root = mkdtempSync(join(tmpdir(), 'lf-duplicates-'))
    const globalHome = join(root, 'home', '.lenserfight')
    const project = join(root, 'project')
    mkdirSync(join(globalHome, 'lenses', 'brief'), { recursive: true })
    mkdirSync(join(project, '.lenserfight', 'lenses', 'brief'), { recursive: true })
    process.env.LENSERFIGHT_HOME = globalHome

    writeFileSync(join(globalHome, 'lenses', 'brief', 'LENS.MD'), minimalLens('brief', 'Global Brief'))
    writeFileSync(join(project, '.lenserfight', 'lenses', 'brief', 'LENS.MD'), minimalLens('brief', 'Project Brief'))

    const discovery = discoverLenserfightWorkspace({ cwd: project })
    expect(discovery.conflicts).toHaveLength(1)
    expect(discovery.conflicts[0].key).toBe('lens:brief')
    expect(discovery.conflicts[0].winner).toBe(join(project, '.lenserfight', 'lenses', 'brief', 'LENS.MD'))
    expect(discovery.winners.find((item) => item.key === 'lens:brief')?.filePath).toBe(join(project, '.lenserfight', 'lenses', 'brief', 'LENS.MD'))

    rmSync(root, { recursive: true, force: true })
  })

  it('parses RAY.MD and validates workflow, battle, ray, legal, and finance references in discovery', () => {
    const root = mkdtempSync(join(tmpdir(), 'lf-refs-'))
    const lf = join(root, '.lenserfight')
    mkdirSync(join(lf, 'rays', 'legal'), { recursive: true })
    mkdirSync(join(lf, 'lenses', 'legal-review'), { recursive: true })
    mkdirSync(join(lf, 'lenses', 'finance-review'), { recursive: true })
    mkdirSync(join(lf, 'colenses', 'review'), { recursive: true })
    mkdirSync(join(lf, 'battles', 'review'), { recursive: true })

    writeFileSync(join(lf, 'rays', 'legal', 'RAY.MD'), `---
name: legal
description: Legal-adjacent work. This is not legal advice and must be reviewed by a qualified lawyer.
---

# Purpose
Organize legal-adjacent templates. This is not legal advice and must be reviewed by a qualified lawyer.

# Related Items
List related legal templates.

# Routing
Use /ray/legal.
`)
    writeFileSync(join(lf, 'lenses', 'legal-review', 'LENS.MD'), `---
name: legal-review
description: Review contract risk. This is not legal advice and must be reviewed by a qualified lawyer.
rays: [legal]
---

# Prompt
Summarize legal risk. This is not legal advice and must be reviewed by a qualified lawyer.
`)
    writeFileSync(join(lf, 'lenses', 'finance-review', 'LENS.MD'), `---
name: finance-review
description: Explain financial variance. This is not financial advice.
rays: [finance]
---

# Prompt
Explain the financial report. This is not financial advice.
`)
    writeFileSync(join(lf, 'colenses', 'review', 'COLENS.MD'), `---
name: review
description: Combine legal and finance review. This is not legal advice and not financial advice.
nodes:
  - id: legal
    kind: lens
    lens: legal-review
---

# Purpose
Run review. This is not legal advice and not financial advice.
`)
    writeFileSync(join(lf, 'battles', 'review', 'BATTLE.MD'), `---
name: review-battle
description: Compare legal review lens outputs. This is not legal advice and must be reviewed by a qualified lawyer.
participants:
  - type: lens
    ref: legal-review
---

# Purpose
Compare useful review outputs. This is not legal advice and must be reviewed by a qualified lawyer.
`)

    const discovery = discoverLenserfightWorkspace({ cwd: root, includeGlobal: false })
    expect(discovery.winners.find((item) => item.key === 'ray:legal')?.result.ok).toBe(true)
    expect(discovery.winners.find((item) => item.key === 'colens:review')?.result.ok).toBe(true)
    expect(discovery.winners.find((item) => item.key === 'battle:review-battle')?.result.ok).toBe(true)
    expect(discovery.winners.find((item) => item.key === 'lens:finance-review')?.result.issues.some((issue) => issue.path === 'rays.finance')).toBe(true)

    rmSync(root, { recursive: true, force: true })
  })

  it('discovers lensers and colenses from canonical directories', () => {
    const root = mkdtempSync(join(tmpdir(), 'lf-canonical-dirs-'))
    const lf = join(root, '.lenserfight')
    mkdirSync(join(lf, 'lensers', 'reviewer'), { recursive: true })
    mkdirSync(join(lf, 'colenses', 'release-flow'), { recursive: true })
    writeFileSync(join(lf, 'lensers', 'reviewer', 'LENSER.MD'), minimalLenser('reviewer', 'Reviewer'))
    writeFileSync(join(lf, 'colenses', 'release-flow', 'COLENS.MD'), minimalColens('release-flow', 'Release Flow'))

    const discovery = discoverLenserfightWorkspace({ cwd: root, includeGlobal: false })

    expect(discovery.winners.map((item) => item.key)).toEqual(['colens:release-flow', 'lenser:reviewer'])
    expect(discovery.warnings).toHaveLength(0)
    rmSync(root, { recursive: true, force: true })
  })

  it('supports legacy agents and workflows directories as compatibility aliases', () => {
    const root = mkdtempSync(join(tmpdir(), 'lf-legacy-dirs-'))
    const lf = join(root, '.lenserfight')
    mkdirSync(join(lf, 'agents', 'reviewer'), { recursive: true })
    mkdirSync(join(lf, 'workflows', 'release-flow'), { recursive: true })
    writeFileSync(join(lf, 'agents', 'reviewer', 'AGENT.MD'), legacyAgent('reviewer'))
    writeFileSync(join(lf, 'workflows', 'release-flow', 'WORKFLOW.MD'), legacyWorkflow('release-flow'))

    const discovery = discoverLenserfightWorkspace({ cwd: root, includeGlobal: false })

    expect(discovery.winners.map((item) => item.key)).toEqual(['colens:release-flow', 'lenser:reviewer'])
    expect(discovery.warnings.some((warning) => warning.includes('Legacy automation path'))).toBe(true)
    rmSync(root, { recursive: true, force: true })
  })

  it('prefers canonical lensers and colenses over duplicate legacy paths', () => {
    const root = mkdtempSync(join(tmpdir(), 'lf-mixed-state-'))
    const lf = join(root, '.lenserfight')
    mkdirSync(join(lf, 'agents', 'reviewer'), { recursive: true })
    mkdirSync(join(lf, 'lensers', 'reviewer'), { recursive: true })
    mkdirSync(join(lf, 'workflows', 'release-flow'), { recursive: true })
    mkdirSync(join(lf, 'colenses', 'release-flow'), { recursive: true })
    writeFileSync(join(lf, 'agents', 'reviewer', 'AGENT.MD'), legacyAgent('reviewer'))
    writeFileSync(join(lf, 'lensers', 'reviewer', 'LENSER.MD'), minimalLenser('reviewer', 'Canonical Reviewer'))
    writeFileSync(join(lf, 'workflows', 'release-flow', 'WORKFLOW.MD'), legacyWorkflow('release-flow'))
    writeFileSync(join(lf, 'colenses', 'release-flow', 'COLENS.MD'), minimalColens('release-flow', 'Canonical Release Flow'))

    const discovery = discoverLenserfightWorkspace({ cwd: root, includeGlobal: false })

    expect(discovery.winners.find((item) => item.key === 'lenser:reviewer')?.filePath).toBe(join(lf, 'lensers', 'reviewer', 'LENSER.MD'))
    expect(discovery.winners.find((item) => item.key === 'colens:release-flow')?.filePath).toBe(join(lf, 'colenses', 'release-flow', 'COLENS.MD'))
    expect(discovery.conflicts).toHaveLength(2)
    expect(discovery.warnings.some((warning) => warning.includes('Duplicate legacy/canonical automation object conflict'))).toBe(true)
    rmSync(root, { recursive: true, force: true })
  })

  it('plans and applies terminology migration for folders and filenames', () => {
    const root = mkdtempSync(join(tmpdir(), 'lf-migrate-'))
    const lf = join(root, '.lenserfight')
    mkdirSync(join(lf, 'agents', 'reviewer'), { recursive: true })
    mkdirSync(join(lf, 'workflows', 'release-flow'), { recursive: true })
    writeFileSync(join(lf, 'agents', 'reviewer', 'AGENT.MD'), legacyAgent('reviewer'))
    writeFileSync(join(lf, 'workflows', 'release-flow', 'WORKFLOW.MD'), legacyWorkflow('release-flow'))

    const dryRun = planTerminologyMigration({ roots: [lf], dryRun: true })
    expect(dryRun.operations.filter((operation) => operation.status === 'planned')).toHaveLength(4)
    expect(existsSync(join(lf, 'agents', 'reviewer', 'AGENT.MD'))).toBe(true)

    const applied = planTerminologyMigration({ roots: [lf], dryRun: false })
    expect(applied.operations.every((operation) => operation.status === 'applied')).toBe(true)
    expect(existsSync(join(lf, 'lensers', 'reviewer', 'LENSER.MD'))).toBe(true)
    expect(existsSync(join(lf, 'colenses', 'release-flow', 'COLENS.MD'))).toBe(true)
    rmSync(root, { recursive: true, force: true })
  })

  it('reports migration conflicts without overwriting canonical targets', () => {
    const root = mkdtempSync(join(tmpdir(), 'lf-migrate-conflict-'))
    const lf = join(root, '.lenserfight')
    mkdirSync(join(lf, 'agents', 'reviewer'), { recursive: true })
    mkdirSync(join(lf, 'lensers'), { recursive: true })
    writeFileSync(join(lf, 'agents', 'reviewer', 'AGENT.MD'), legacyAgent('reviewer'))

    const result = planTerminologyMigration({ roots: [lf], dryRun: true })
    expect(result.operations.some((operation) => operation.status === 'conflict' && operation.to.endsWith('/lensers'))).toBe(true)
    rmSync(root, { recursive: true, force: true })
  })

  it('generates canonical templates for legacy agent and workflow kinds by default', () => {
    const root = mkdtempSync(join(tmpdir(), 'lf-export-'))

    const agentTarget = exportAutomationTemplate('agent', undefined, root)
    const workflowTarget = exportAutomationTemplate('workflow', undefined, root)

    expect(agentTarget).toBe(join(root, 'LENSER.MD'))
    expect(workflowTarget).toBe(join(root, 'COLENS.MD'))
    expect(existsSync(agentTarget)).toBe(true)
    expect(existsSync(workflowTarget)).toBe(true)
    rmSync(root, { recursive: true, force: true })
  })
})

function minimalLens(slug: string, name: string): string {
  return `---
name: ${slug}
description: ${name} lens.
---

# Prompt
Write a useful brief.
`
}

function minimalLenser(slug: string, name: string): string {
  return `---
name: ${slug}
description: ${name} lenser.
---

# Mission
Review repository context.

# Activation
Use for review requests.

# Operating Rules
Stay within the requested scope.
`
}

function minimalColens(slug: string, name: string): string {
  return `---
name: ${slug}
description: ${name} colens.
---

# Purpose
Coordinate repeated work.

# Inputs
Describe inputs.

# Steps
1. Run the relevant lenses.

# Outputs
Describe outputs.
`
}

function legacyAgent(slug: string): string {
  return `---
kind: agent
schema_version: 1
id: ${slug}
name: ${slug}
---

# Purpose
Act as a compatibility agent.

# Instructions
Follow instructions.

# Execution Policy
Pause on risky actions.
`
}

function legacyWorkflow(slug: string): string {
  return `---
kind: workflow
schema_version: 1
id: ${slug}
name: ${slug}
---

# Purpose
Run a compatibility workflow.

# Inputs
Describe inputs.

# Steps
1. Do the work.

# Outputs
Describe outputs.
`
}
