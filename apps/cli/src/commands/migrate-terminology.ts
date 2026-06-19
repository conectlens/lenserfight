import { defineCommand } from 'citty'
import consola from 'consola'

import { planTerminologyMigration } from '../utils/automation-objects'
import { printJson, printTable } from '../utils/output'

export default defineCommand({
  meta: {
    name: 'migrate-terminology',
    description: 'Migrate legacy file-mode terminology to lensers/colenses and SKILL.md.',
  },
  args: {
    apply: {
      type: 'boolean',
      description: 'Apply the migration. Without this flag, the command runs in dry-run mode.',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output migration plan as JSON',
      default: false,
    },
    'no-global': {
      type: 'boolean',
      description: 'Do not include ~/.lenserfight in the migration plan',
      default: false,
    },
    'no-recursive': {
      type: 'boolean',
      description: 'Do not recursively discover nested .lenserfight directories',
      default: false,
    },
  },
  async run({ args }) {
    const result = planTerminologyMigration({
      dryRun: !args.apply,
      includeGlobal: !args['no-global'],
      recursive: !args['no-recursive'],
    })

    if (args.json) {
      printJson(result)
      if (result.operations.some((operation) => operation.status === 'conflict')) process.exitCode = 1
      return
    }

    if (result.operations.length === 0) {
      consola.success('No legacy file-mode terminology found.')
      return
    }

    printTable(
      ['Status', 'From', 'To', 'Reason'],
      result.operations.map((operation) => [
        operation.status,
        operation.from,
        operation.to,
        operation.reason ?? '-',
      ])
    )

    const conflicts = result.operations.filter((operation) => operation.status === 'conflict')
    if (conflicts.length > 0) {
      consola.error('%d migration conflict(s) detected. Resolve targets before applying.', conflicts.length)
      process.exitCode = 1
      return
    }

    if (result.dryRun) {
      consola.info('Dry-run only. Re-run with --apply to rename folders and files.')
      return
    }

    consola.success('Applied %d terminology migration operation(s).', result.operations.length)
  },
})
