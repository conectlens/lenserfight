import { defineCommand } from 'citty'
import consola from 'consola'
import type { AutomationObjectKind } from '@lenserfight/types'
import {
  assertSupabaseLocalForSync,
  planFileToSupabase,
  pullRegistryEntry,
  pushAllFromRegistry,
} from '../lib/workspace-sync'
import { findAutomationFiles, registerAutomationFiles } from '../utils/automation-objects'
import { printJson, printTable } from '../utils/output'
import { handleError } from '../utils/api'

const statusCmd = defineCommand({
  meta: {
    name: 'status',
    description: 'Show file-workspace registry entries ready to sync with Supabase local.',
  },
  args: {
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const rows = planFileToSupabase()
      if (args.json) {
        printJson(rows)
        return
      }
      if (!rows.length) {
        consola.info('No entries in .lenserfight/automation-registry.json. Run `lf import <path>` first.')
        return
      }
      printTable(
        ['Kind', 'ID', 'Name', 'Path', 'Action'],
        rows.map((r) => [r.kind, r.id, r.name, r.path, r.action])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

const planCmd = defineCommand({
  meta: {
    name: 'plan',
    description: 'Dry-run: show what lf sync push would apply to Supabase local.',
  },
  args: {
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      assertSupabaseLocalForSync()
      const rows = planFileToSupabase()
      if (args.json) {
        printJson(rows)
        return
      }
      printTable(
        ['Kind', 'ID', 'Name', 'Path', 'Detail'],
        rows.map((r) => [r.kind, r.id, r.name, r.path, r.detail])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

const pushCmd = defineCommand({
  meta: {
    name: 'push',
    description: 'Push file-workspace registry objects to Supabase local (requires lf use local).',
  },
  args: {
    kind: { type: 'string', description: 'Filter: lens | lenser | colens', default: '' },
    id: { type: 'string', description: 'Registry object id', default: '' },
    path: { type: 'string', description: 'Import and push a single markdown file', default: '' },
    all: { type: 'boolean', description: 'Push all registry entries', default: false },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      if (args.path) {
        assertSupabaseLocalForSync()
        registerAutomationFiles(findAutomationFiles(args.path))
      }
      if (!args.all && !args.path && !args.id) {
        consola.error('Specify --all, --path <file>, or --id with --kind.')
        process.exitCode = 1
        return
      }
      const result = await pushAllFromRegistry({
        kind: (args.kind || undefined) as AutomationObjectKind | undefined,
        id: args.id || undefined,
      })
      if (args.json) {
        printJson(result)
        return
      }
      consola.success('Push complete. pushed=%d skipped=%d', result.pushed, result.skipped)
    } catch (err) {
      handleError(err)
    }
  },
})

const pullCmd = defineCommand({
  meta: {
    name: 'pull',
    description: 'Export a registry object from disk snapshot to .lenserfight/ (refresh files).',
  },
  args: {
    kind: { type: 'string', description: 'lens | lenser | colens', required: true },
    id: { type: 'string', description: 'Registry object id', required: true },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const { target } = pullRegistryEntry(args.kind as AutomationObjectKind, args.id)
      if (args.json) {
        printJson({ target })
        return
      }
      consola.success('Wrote %s', target)
    } catch (err) {
      handleError(err)
    }
  },
})

export default defineCommand({
  meta: {
    name: 'sync',
    description:
      'Sync file-workspace markdown objects with Supabase local (not Cloud). Requires lf use local.',
  },
  subCommands: {
    status: statusCmd,
    plan: planCmd,
    push: pushCmd,
    pull: pullCmd,
  },
})
