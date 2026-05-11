import { defineCommand } from 'citty'
import consola from 'consola'

import { findAutomationFiles, registerAutomationFiles } from '../utils/automation-objects'
import { printJson, printTable } from '../utils/output'

export default defineCommand({
  meta: {
    name: 'import',
    description: 'Register file-first automation markdown objects in the local workspace registry.',
  },
  args: {
    path: {
      type: 'positional',
      description: 'File or directory containing automation markdown objects',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output import results as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const files = findAutomationFiles(args.path)
    if (files.length === 0) {
      consola.warn('No automation markdown files found under %s.', args.path)
      consola.info('')
      consola.info('Usage: lf import <file-or-directory>')
      consola.info('  lf import my-lens.md')
      consola.info('  lf import my-workflow.md')
      consola.info('  lf import .lenserfight/')
      consola.info('')
      consola.info('Generate a template first:')
      consola.info('  lf export lens --template --out LENS.MD')
      consola.info('  lf export colens --template --out WORKFLOW.MD')
      process.exitCode = 1
      return
    }

    const outcome = registerAutomationFiles(files)

    if (args.json) {
      printJson(outcome)
      if (outcome.failures.length > 0) process.exitCode = 1
      return
    }

    if (outcome.imported.length > 0) {
      printTable(
        ['Kind', 'ID', 'Name', 'Path'],
        outcome.imported.map((entry) => [entry.kind, entry.id, entry.name, entry.path ?? '-'])
      )
      consola.success('Imported %d automation object(s).', outcome.imported.length)
    }

    if (outcome.failures.length > 0) {
      consola.error('%d file(s) failed import validation.', outcome.failures.length)
      for (const failure of outcome.failures) {
        consola.error('  %s', failure.filePath)
        for (const issue of failure.issues) {
          consola.error('    - %s: %s', issue.path, issue.message)
        }
      }
      process.exitCode = 1
    }
  },
})
