import { defineCommand } from 'citty'
import consola from 'consola'

import { discoverLenserfightWorkspace, findAutomationFiles, parseAutomationDocument } from '../utils/automation-objects'
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
    'no-global': {
      type: 'boolean',
      description: 'Do not include ~/.lenserfight templates in workspace validation',
      default: false,
    },
    'no-recursive': {
      type: 'boolean',
      description: 'Do not recursively discover nested .lenserfight directories',
      default: false,
    },
  },
  async run({ args }) {
    const useWorkspaceDiscovery = !args.path || args.path === '.'
    const workspace = useWorkspaceDiscovery
      ? discoverLenserfightWorkspace({
          includeGlobal: !args['no-global'],
          recursive: !args['no-recursive'],
        })
      : null

    const files = workspace ? [] : findAutomationFiles(args.path || '.')
    const results = workspace
      ? workspace.winners.map((object) => ({
          filePath: object.filePath,
          source: object.sourceScope,
          result: object.result,
        }))
      : files.map((filePath) => ({
          filePath,
          source: 'path',
          result: parseAutomationDocument(filePath),
        }))

    if (results.length === 0) {
      consola.warn('No automation markdown files found under %s.', args.path || '.')
      consola.info('')
      consola.info('Usage: lf validate <file-or-directory>')
      consola.info('  lf validate my-lens.md')
      consola.info('  lf validate my-workflow.md')
      consola.info('')
      consola.info('Generate a template first:')
      consola.info('  lf export lens --template --out SKILL.md')
      consola.info('  lf export colens --template --out SKILL.md')
      process.exitCode = 1
      return
    }

    if (args.json) {
      printJson(workspace ? { ...workspace, results } : results)
      if (results.some(({ result }) => !result.ok)) process.exitCode = 1
      return
    }

    printTable(
      ['File', 'Source', 'Kind', 'Status', 'Issues'],
      results.map(({ filePath, source, result }) => [
        filePath,
        source,
        result.kind ?? '-',
        result.ok ? 'valid' : 'invalid',
        result.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' | ') || '-',
      ])
    )

    if (workspace?.conflicts.length) {
      consola.warn('%d duplicate slug conflict(s) resolved by precedence.', workspace.conflicts.length)
      for (const conflict of workspace.conflicts) {
        consola.warn('  %s -> %s', conflict.key, conflict.winner)
      }
    }

    for (const warning of workspace?.warnings ?? []) {
      consola.warn(warning)
    }

    const invalidCount = results.filter(({ result }) => !result.ok).length
    if (invalidCount > 0) {
      consola.error('%d file(s) failed validation.', invalidCount)
      process.exitCode = 1
      return
    }

    consola.success('Validated %d automation markdown file(s).', results.length)
  },
})
