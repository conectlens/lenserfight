import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  findAutomationFiles,
  parseAutomationDocument,
  registerAutomationFiles,
} from './automation-objects'

describe('automation object utilities', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'lf-automation-'))

  afterAll(() => {
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
})
