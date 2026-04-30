import { defineCommand } from 'citty'
import consola from 'consola'

import { type ToolFrontmatter } from '@lenserfight/types'

import { parseAutomationDocument } from '../utils/automation-objects'
import { printJson } from '../utils/output'

const test = defineCommand({
  meta: {
    name: 'test',
    description: 'Validate a file-first TOOL.md contract and summarize its execution policy.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to TOOL.md',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output parsed tool metadata as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const parsed = parseAutomationDocument(args.file)
    if (!parsed.ok || parsed.kind !== 'tool' || !parsed.document) {
      consola.error('Tool validation failed for %s', args.file)
      for (const issue of parsed.issues) {
        consola.error('  - %s: %s', issue.path, issue.message)
      }
      process.exitCode = 1
      return
    }

    const frontmatter = parsed.document.frontmatter as ToolFrontmatter
    const summary = {
      id: frontmatter.id,
      name: frontmatter.name,
      permission_level: frontmatter.permission_level ?? 'read',
      risk_level: frontmatter.risk_level ?? 'safe',
      cost_level: frontmatter.cost_level ?? 'low',
    }

    if (args.json) {
      printJson(summary)
      return
    }

    consola.success('Tool spec is valid.')
    consola.info('Name: %s', frontmatter.name ?? frontmatter.id)
    consola.info('Permission level: %s', summary.permission_level)
    consola.info('Risk level: %s', summary.risk_level)
    consola.info('Cost level: %s', summary.cost_level)
  },
})

export default defineCommand({
  meta: {
    name: 'tool',
    description: 'Local-first tool commands for canonical TOOL.md contracts.',
  },
  subCommands: {
    test,
  },
})
