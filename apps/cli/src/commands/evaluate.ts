import { defineCommand } from 'citty'
import consola from 'consola'

import { type EvaluationFrontmatter } from '@lenserfight/types'

import { parseAutomationDocument } from '../utils/automation-objects'
import { printJson } from '../utils/output'

export default defineCommand({
  meta: {
    name: 'evaluate',
    description: 'Validate and summarize a file-first EVALUATION.md spec.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to EVALUATION.md',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output the parsed evaluation summary as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const parsed = parseAutomationDocument(args.file)
    if (!parsed.ok || parsed.kind !== 'evaluation' || !parsed.document) {
      consola.error('Evaluation validation failed for %s', args.file)
      for (const issue of parsed.issues) {
        consola.error('  - %s: %s', issue.path, issue.message)
      }
      process.exitCode = 1
      return
    }

    const frontmatter = parsed.document.frontmatter as EvaluationFrontmatter
    const summary = {
      id: frontmatter.id,
      name: frontmatter.name,
      rubric_ref: frontmatter.rubric_ref ?? null,
      dataset_ref: frontmatter.dataset_ref ?? null,
      metrics: frontmatter.metrics ?? [],
      judge_agent_ref: frontmatter.judge_agent_ref ?? null,
    }

    if (args.json) {
      printJson(summary)
      return
    }

    consola.success('Evaluation spec is valid.')
    consola.info('Name: %s', frontmatter.name ?? frontmatter.id)
    consola.info('Rubric: %s', frontmatter.rubric_ref ?? 'not set')
    consola.info('Dataset: %s', frontmatter.dataset_ref ?? 'not set')
    consola.info('Metrics: %s', (frontmatter.metrics ?? []).join(', ') || 'none')
  },
})
