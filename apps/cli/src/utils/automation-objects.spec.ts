import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  findAutomationFiles,
  loadUnitReference,
  parseAutomationDocument,
  registerAutomationFiles,
  resolveUnitRelativePath,
  writeWorkflowSimulationArtifacts,
} from './automation-objects'

describe('automation object utilities', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'lf-automation-'))
  const originalRuntimeDir = process.env.LENSERFIGHT_RUNTIME_DIR

  afterAll(() => {
    if (originalRuntimeDir === undefined) delete process.env.LENSERFIGHT_RUNTIME_DIR
    else process.env.LENSERFIGHT_RUNTIME_DIR = originalRuntimeDir
    rmSync(workspace, { recursive: true, force: true })
  })

  it('parses and validates a canonical workflow markdown file', () => {
    const filePath = join(workspace, 'WORKFLOW.md')
    writeFileSync(
      filePath,
      `---
kind: workflow
schema_version: 1
id: wf_test
name: Test Workflow
---

# Purpose
Run a test workflow.

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
    expect(result.kind).toBe('workflow')
  })

  it('finds and registers automation markdown files', () => {
    const filePath = join(workspace, 'AGENT.md')
    writeFileSync(
      filePath,
      `---
kind: agent
schema_version: 1
id: agent_test
name: Test Agent
---

# Purpose
Act as a test agent.

# Instructions
Follow the test instructions.

# Execution Policy
Pause on destructive actions.
`
    )

    const files = findAutomationFiles(workspace)
    expect(files).toContain(filePath)

    const result = registerAutomationFiles([filePath], workspace)
    expect(result.imported).toHaveLength(1)
    expect(result.failures).toHaveLength(0)
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
})
