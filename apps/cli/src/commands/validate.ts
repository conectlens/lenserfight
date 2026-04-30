import { defineCommand } from 'citty'
import consola from 'consola'

import { findAutomationFiles, parseAutomationDocument } from '../utils/automation-objects'
import { printJson, printTable } from '../utils/output'

export default defineCommand({
  meta: {
    name: 'validate',
    description: 'Validate file-first LenserFight markdown objects.',
  },
  args: {
    path: {
      type: 'positional',
      description: 'File or directory containing automation markdown objects',
      default: '.',
    },
    json: {
      type: 'boolean',
      description: 'Output full validation results as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const files = findAutomationFiles(args.path || '.')
    if (files.length === 0) {
      consola.warn('No automation markdown files found under %s.', args.path || '.')
      process.exitCode = 1
      return
    }

    const results = files.map((filePath) => ({
      filePath,
      result: parseAutomationDocument(filePath),
    }))

    if (args.json) {
      printJson(results)
      if (results.some(({ result }) => !result.ok)) process.exitCode = 1
      return
    }

    printTable(
      ['File', 'Kind', 'Status', 'Issues'],
      results.map(({ filePath, result }) => [
        filePath,
        result.kind ?? '-',
        result.ok ? 'valid' : 'invalid',
        result.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' | ') || '-',
      ])
    )

    const invalidCount = results.filter(({ result }) => !result.ok).length
    if (invalidCount > 0) {
      consola.error('%d file(s) failed validation.', invalidCount)
      process.exitCode = 1
      return
    }

    consola.success('Validated %d automation markdown file(s).', results.length)
  },
})
