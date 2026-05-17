import { defineCommand } from 'citty'
import consola from 'consola'

import { type WorkflowFrontmatter } from '@lenserfight/types'

import { callRpc, callRest, handleError } from '../utils/api'
import {
  buildWorkflowSimulationReport,
  parseAutomationDocument,
  writeWorkflowSimulationArtifacts,
} from '../utils/automation-objects'
import { printJson, printTable, truncate } from '../utils/output'
import { makeLifecycleCommand } from '../utils/lifecycle'

function parseInputs(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch (error) {
    throw new Error(`Invalid JSON supplied to --inputs: ${(error as Error).message}`)
  }
}

const WORKFLOW_TEMPLATES = [
  'single-agent',
  'multi-step-research',
  'code-review-pipeline',
  'judge-evaluation',
  'team-debate',
] as const

// ---------------------------------------------------------------------------
// workflow run (local simulation)
// ---------------------------------------------------------------------------

const run = defineCommand({
  meta: {
    name: 'run',
    description: 'Simulate a file-first WORKFLOW.md locally and emit a run report.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to WORKFLOW.md or COLENS.MD',
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
    if (!parsed.ok || (parsed.kind !== 'colens' && parsed.kind !== 'workflow') || !parsed.document) {
      consola.error('Workflow validation failed for %s', args.file)
      for (const issue of parsed.issues) {
        consola.error('  - %s: %s', issue.path, issue.message)
      }
      consola.info('')
      consola.info('Generate a template first:')
      consola.info('  lf export colens --template --out WORKFLOW.md')
      process.exitCode = 1
      return
    }

    const frontmatter = parsed.document.frontmatter as WorkflowFrontmatter
    const inputs = parseInputs(args.inputs || undefined)
    const steps = (frontmatter.steps ?? []).map((step) => `${step.id} (${step.type})`)
    const status = steps.length > 0 ? 'ready' : 'blocked'
    const summary = {
      source: {
        kind: parsed.kind,
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

// ---------------------------------------------------------------------------
// workflow validate
// ---------------------------------------------------------------------------

const validate = defineCommand({
  meta: {
    name: 'validate',
    description: 'Validate a workflow markdown file without running it.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to WORKFLOW.md or COLENS.MD',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output validation result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const parsed = parseAutomationDocument(args.file)

    if (args.json) {
      printJson(parsed)
      if (!parsed.ok) process.exitCode = 1
      return
    }

    if (!parsed.ok) {
      consola.error('Validation failed for %s', args.file)
      for (const issue of parsed.issues) {
        consola.error('  - %s: %s', issue.path, issue.message)
      }
      consola.info('')
      consola.info('Generate a valid template:  lf export colens --template --out WORKFLOW.md')
      process.exitCode = 1
      return
    }

    const frontmatter = parsed.document?.frontmatter as WorkflowFrontmatter | undefined
    consola.success('Valid %s: %s', parsed.kind, frontmatter?.name ?? args.file)
    const steps = (frontmatter?.steps ?? []).length
    consola.info('Steps: %d', steps)
    if (steps === 0) {
      consola.warn('No steps defined. Add steps to your workflow before running.')
    }
  },
})

// ---------------------------------------------------------------------------
// workflow create (cloud)
// ---------------------------------------------------------------------------

const create = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a cloud workflow on LenserFight.',
  },
  args: {
    name: {
      type: 'string',
      description: 'Workflow name',
      required: true,
    },
    template: {
      type: 'string',
      description: `Starter template: ${WORKFLOW_TEMPLATES.join(' | ')}`,
      default: '',
    },
    description: {
      type: 'string',
      description: 'Workflow description',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    if (args.template && !(WORKFLOW_TEMPLATES as readonly string[]).includes(args.template)) {
      consola.error('Invalid template: %s. Available: %s', args.template, WORKFLOW_TEMPLATES.join(', '))
      process.exitCode = 1
      return
    }
    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_workflow_create',
        {
          p_name: args.name,
          p_description: args.description || null,
          p_template: args.template || null,
        },
        { requireAuth: true }
      )

      if (args.json) {
        printJson(result)
        return
      }

      consola.success('Workflow created.')
      consola.info('ID:   %s', result['id'])
      consola.info('Name: %s', result['name'])
      if (args.template) consola.info('Template: %s', args.template)
      consola.info('')
      consola.info('Next steps:')
      consola.info('  lf workflow run WORKFLOW.md          — simulate locally')
      consola.info('  lf export workflow %s  — export for editing', result['id'])
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// workflow list (cloud)
// ---------------------------------------------------------------------------

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List your cloud workflows.',
  },
  args: {
    limit: {
      type: 'string',
      description: 'Maximum results',
      default: '20',
    },
    offset: {
      type: 'string',
      description: 'Pagination offset',
      default: '0',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const rows = await callRest<Array<Record<string, unknown>>>(
        'lenses',
        'workflows',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select: 'id,title,description,visibility,archived_at,deleted_at,created_at',
            order: 'created_at.desc',
            limit: args.limit,
            offset: args.offset,
          },
        }
      )

      if (!Array.isArray(rows) || rows.length === 0) {
        consola.info('No workflows found.')
        consola.info('Create one: lf workflow create --name "My Pipeline"')
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['ID', 'Name', 'State', 'Visibility', 'Created'],
        rows.map((r) => [
          String(r['id'] ?? ''),
          truncate(String(r['title'] ?? ''), 36),
          r['deleted_at'] ? 'deleted' : r['archived_at'] ? 'archived' : 'active',
          String(r['visibility'] ?? '—'),
          r['created_at'] ? new Date(String(r['created_at'])).toLocaleDateString() : '—',
        ])
      )
      consola.info('%d workflow(s) shown.', rows.length)
    } catch (err) {
      handleError(err)
    }
  },
})

const lifecycleCommand = (action: Parameters<typeof makeLifecycleCommand>[1], description: string) =>
  makeLifecycleCommand('workflow', action, description, 'Workflow UUID')

// ---------------------------------------------------------------------------
// CD: workflow trigger add
// ---------------------------------------------------------------------------

const triggerAdd = defineCommand({
  meta: { name: 'add', description: 'Add a trigger to a workflow.' },
  args: {
    id: { type: 'positional', description: 'Workflow UUID', required: true },
    type: { type: 'string', description: 'cron | battle_event | webhook | manual', default: 'battle_event' },
    condition: { type: 'string', description: 'JSON condition object', default: '{}' },
  },
  async run({ args }) {
    try {
      let cond: Record<string, unknown>
      try { cond = JSON.parse(args.condition) } catch { cond = {} }
      const result = await callRpc<{ id: string }>(
        'fn_workflow_trigger_create',
        { p_workflow_id: args.id, p_trigger_type: args.type, p_condition: cond },
        { requireAuth: true }
      )
      consola.success('Trigger created: %s', typeof result === 'string' ? result : result?.id)
    } catch (err) {
      handleError(err)
    }
  },
})

// CD: workflow trigger webhook-url
const triggerWebhookUrl = defineCommand({
  meta: { name: 'webhook-url', description: 'Print the webhook trigger URL and secret for a workflow.' },
  args: {
    id: { type: 'positional', description: 'Workflow UUID', required: true },
  },
  async run({ args }) {
    try {
      const baseUrl = process.env['PLATFORM_API_URL'] ?? 'https://api.lenserfight.io'
      consola.info('Webhook URL: %s/workflows/%s/trigger', baseUrl, args.id)
      consola.warn('Body must contain { "secret": "<your-webhook-secret>", "payload": {...} }')
      consola.warn('Treat the secret as a password — do not commit it to source control.')
    } catch (err) {
      handleError(err)
    }
  },
})

// CD: workflow trigger list
const triggerList = defineCommand({
  meta: { name: 'list', description: 'List triggers for a workflow.' },
  args: {
    id: { type: 'positional', description: 'Workflow UUID', required: true },
    json: { type: 'boolean', description: 'Output raw JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<Array<{
        id: string
        trigger_type: string
        enabled: boolean
        last_fired_at: string | null
      }>>(
        'fn_workflow_triggers_list',
        { p_workflow_id: args.id },
        { requireAuth: true }
      )
      if (args.json) { printJson(rows); return }
      if (!rows.length) { consola.info('No triggers found for workflow %s.', args.id); return }
      printTable(
        ['id', 'type', 'enabled', 'last_fired'],
        rows.map((r) => [
          r.id.slice(0, 8) + '…',
          r.trigger_type,
          r.enabled ? 'yes' : 'no',
          r.last_fired_at ? new Date(r.last_fired_at).toLocaleDateString() : '—',
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

const trigger = defineCommand({
  meta: { name: 'trigger', description: 'Manage workflow triggers.' },
  subCommands: {
    add: triggerAdd,
    'webhook-url': triggerWebhookUrl,
    list: triggerList,
  },
})

// ---------------------------------------------------------------------------
// Root command
// ---------------------------------------------------------------------------

export default defineCommand({
  meta: {
    name: 'workflow',
    description: 'Local-first workflow commands for file-based LenserFight automation objects.',
  },
  subCommands: {
    run,
    validate,
    create,
    list,
    status: lifecycleCommand('status', 'Show lifecycle state, pinned state, version snapshot, and delete blockers.'),
    archive: lifecycleCommand('archive', 'Archive a workflow without breaking historical runs or battles.'),
    restore: lifecycleCommand('restore', 'Restore an archived or tombstoned workflow when policy allows it.'),
    delete: lifecycleCommand('delete', 'Request dependency-aware workflow deletion; used workflows become tombstones.'),
    pin: lifecycleCommand('pin', 'Pin a workflow to your saved artifacts.'),
    unpin: lifecycleCommand('unpin', 'Remove your saved pin from a workflow.'),
    trigger,
  },
})
