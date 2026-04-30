import { defineCommand } from 'citty'
import consola from 'consola'

import { type WorkflowFrontmatter } from '@lenserfight/types'

import {
  buildWorkflowSimulationReport,
  parseAutomationDocument,
  writeWorkflowSimulationArtifacts,
} from '../utils/automation-objects'
import { printJson } from '../utils/output'

function parseInputs(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch (error) {
    throw new Error(`Invalid JSON supplied to --inputs: ${(error as Error).message}`)
  }
}

const run = defineCommand({
  meta: {
    name: 'run',
    description: 'Simulate a file-first WORKFLOW.md locally and emit a run report.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to WORKFLOW.md',
      required: true,
    },
    inputs: {
      type: 'string',
      description: 'Optional JSON object of workflow inputs',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Print the generated run summary as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const parsed = parseAutomationDocument(args.file)
    if (!parsed.ok || parsed.kind !== 'workflow' || !parsed.document) {
      consola.error('Workflow validation failed for %s', args.file)
      for (const issue of parsed.issues) {
        consola.error('  - %s: %s', issue.path, issue.message)
      }
      process.exitCode = 1
      return
    }

    const frontmatter = parsed.document.frontmatter as WorkflowFrontmatter
    const inputs = parseInputs(args.inputs || undefined)
    const steps = (frontmatter.steps ?? []).map((step) => `${step.id} (${step.type})`)
    const status = steps.length > 0 ? 'ready' : 'blocked'
    const summary = {
      source: {
        kind: 'workflow',
        id: frontmatter.id,
        name: frontmatter.name,
      },
      status,
      inputs: inputs ?? {},
      step_count: steps.length,
      steps,
      generated_at: new Date().toISOString(),
    }
    const report = buildWorkflowSimulationReport(frontmatter.name ?? frontmatter.id, status, steps, inputs)
    const artifacts = writeWorkflowSimulationArtifacts(frontmatter.slug ?? frontmatter.id, summary, report)

    if (args.json) {
      printJson({ ...summary, artifacts })
      return
    }

    consola.success('Simulated workflow %s', frontmatter.name ?? frontmatter.id)
    consola.info('Status: %s', status)
    consola.info('Steps: %d', steps.length)
    consola.info('JSON report: %s', artifacts.jsonPath)
    consola.info('Markdown report: %s', artifacts.reportPath)
  },
})

export default defineCommand({
  meta: {
    name: 'workflow',
    description: 'Local-first workflow commands for file-based LenserFight automation objects.',
  },
  subCommands: {
    run,
  },
})
