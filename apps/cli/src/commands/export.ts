import { defineCommand } from 'citty'
import consola from 'consola'

import { canonicalAutomationKind, exportAutomationObject, exportAutomationTemplate, isAutomationObjectKind } from '../utils/automation-objects'

export default defineCommand({
  meta: {
    name: 'export',
    description: 'Export a local automation object or generate a canonical markdown template.',
  },
  args: {
    kind: {
      type: 'positional',
      description: 'Object kind: lens | lenser | colens | battle | ray | team | tool | skill | memory_policy | evaluation | run_report',
      required: true,
    },
    id: {
      type: 'positional',
      description: 'Imported object id. Omit when using --template.',
    },
    out: {
      type: 'string',
      description: 'Destination path',
      default: '',
    },
    template: {
      type: 'boolean',
      description: 'Generate the canonical template file instead of exporting a registered object',
      default: false,
    },
    legacy: {
      type: 'boolean',
      description: 'Generate a legacy compatibility template for legacy kinds such as agent or workflow',
      default: false,
    },
  },
  async run({ args }) {
    if (!isAutomationObjectKind(args.kind)) {
      consola.error('Invalid kind: %s', args.kind)
      process.exitCode = 1
      return
    }

    if (args.template || !args.id) {
      if ((args.kind === 'agent' || args.kind === 'workflow') && !args.legacy) {
        consola.warn('`%s` is legacy terminology; generating canonical `%s` instead.', args.kind, canonicalAutomationKind(args.kind))
      }
      const target = exportAutomationTemplate(args.kind, args.out || undefined, process.cwd(), { legacy: args.legacy })
      consola.success('Wrote %s template to %s', args.legacy ? args.kind : canonicalAutomationKind(args.kind), target)
      return
    }

    try {
      const { source, target } = exportAutomationObject(args.kind, args.id, args.out || undefined)
      consola.success('Exported %s %s', args.kind, args.id)
      consola.info('Source: %s', source)
      consola.info('Target: %s', target)
    } catch (error) {
      consola.error((error as Error).message)
      process.exitCode = 1
    }
  },
})
