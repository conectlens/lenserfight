import { defineCommand } from 'citty'
import consola from 'consola'

import { callRpc, handleError } from '../utils/api'
import { printJson, printTable, truncate } from '../utils/output'

interface MemoryProfileRow {
  id: string
  name: string
  scope_type: string
  isolation_mode: string
  retention_days: number
  is_default: boolean
}

interface MemoryEntryRow {
  id: string
  scope: string
  source: string
  content: string
  confidence: number
  created_at: string
  is_redacted?: boolean
}

interface MemorySearchRow {
  id: string
  profile_id: string
  ai_lenser_id: string
  scope: string
  source: string
  content: string
  confidence: number
  created_at: string
  rank: number
}

const listProfiles = defineCommand({
  meta: {
    name: 'list-profiles',
    description: 'List memory profiles for an agent.',
  },
  args: {
    agent: {
      type: 'string',
      description: 'AI lenser ID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const profiles = await callRpc<MemoryProfileRow[]>(
        'fn_get_agent_memory_profiles',
        { p_ai_lenser_id: args.agent },
        { requireAuth: true },
      )
      if (!profiles || profiles.length === 0) {
        consola.info('No memory profiles for agent %s', args.agent)
        return
      }
      if (args.json) return printJson(profiles)
      printTable(
        ['ID', 'Name', 'Scope', 'Isolation', 'Retain', 'Default'],
        profiles.map((p) => [
          p.id.slice(0, 8),
          truncate(p.name, 24),
          p.scope_type,
          p.isolation_mode,
          `${p.retention_days}d`,
          p.is_default ? 'yes' : '',
        ]),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

interface MemoryWorkflowEntryRow extends MemoryEntryRow {
  team_run_id: string | null
}

const listEntries = defineCommand({
  meta: {
    name: 'list-entries',
    description: 'Read memory entries from a profile (or roll up across all runs of a workflow).',
  },
  args: {
    profile: { type: 'string', description: 'Memory profile ID', default: '' },
    workflow: {
      type: 'string',
      description: 'Workflow UUID — show entries from any team_run of this workflow',
      default: '',
    },
    scope: { type: 'string', description: 'Scope filter (only with --profile)', default: '' },
    limit: { type: 'string', description: 'Max entries', default: '20' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      if (!args.profile && !args.workflow) {
        consola.error('Provide one of --profile <id> or --workflow <id>.')
        process.exitCode = 1
        return
      }

      if (args.workflow) {
        const limit = Math.max(1, Math.min(500, parseInt(args.limit, 10) || 100))
        const rows = await callRpc<MemoryWorkflowEntryRow[]>(
          'fn_get_memory_entries_by_workflow',
          { p_workflow_id: args.workflow, p_limit: limit },
          { requireAuth: true },
        )
        if (!rows || rows.length === 0) {
          consola.info('No memory entries for workflow %s', args.workflow)
          return
        }
        if (args.json) return printJson(rows)
        printTable(
          ['ID', 'Run', 'Scope', 'Source', 'Conf', 'Content', 'Created'],
          rows.map((e) => [
            e.id.slice(0, 8),
            e.team_run_id ? e.team_run_id.slice(0, 8) : '—',
            e.scope,
            e.source,
            e.confidence.toFixed(2),
            truncate(e.content, 40),
            new Date(e.created_at).toLocaleString(),
          ]),
        )
        return
      }

      const limit = Math.max(1, Math.min(500, parseInt(args.limit, 10) || 20))
      const entries = await callRpc<MemoryEntryRow[]>(
        'fn_read_memory_entries',
        {
          p_profile_id: args.profile,
          p_scope: args.scope || null,
          p_limit: limit,
          p_team_run_id: null,
        },
        { requireAuth: true },
      )
      if (!entries || entries.length === 0) {
        consola.info('No memory entries for profile %s', args.profile)
        return
      }
      if (args.json) return printJson(entries)
      printTable(
        ['ID', 'Scope', 'Source', 'Conf', 'Content', 'Created'],
        entries.map((e) => [
          e.id.slice(0, 8),
          e.scope,
          e.source,
          e.confidence.toFixed(2),
          truncate(e.content, 50),
          new Date(e.created_at).toLocaleString(),
        ]),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

const writeEntry = defineCommand({
  meta: {
    name: 'write-entry',
    description: 'Write a manual memory entry (visible to the agent on the next run).',
  },
  args: {
    profile: { type: 'string', description: 'Memory profile ID', required: true },
    scope: { type: 'string', description: 'Scope (project|conversation|global)', default: 'project' },
    source: { type: 'string', description: 'Source (manual|user|agent|tool|eval)', default: 'manual' },
    content: { type: 'string', description: 'Memory content', required: true },
    confidence: { type: 'string', description: 'Confidence 0-1', default: '0.7' },
  },
  async run({ args }) {
    try {
      const parsedConfidence = parseFloat(args.confidence)
      const confidence = Math.max(0, Math.min(1, Number.isNaN(parsedConfidence) ? 0.7 : parsedConfidence))
      const id = await callRpc<string>(
        'fn_write_memory_entry',
        {
          p_profile_id: args.profile,
          p_scope: args.scope,
          p_source: args.source,
          p_content: args.content,
          p_confidence: confidence,
          p_expires_at: null,
          p_team_run_id: null,
          p_metadata: {},
        },
        { requireAuth: true },
      )
      consola.success('Memory entry written: %s', id)
    } catch (err) {
      handleError(err)
    }
  },
})

const redact = defineCommand({
  meta: {
    name: 'redact',
    description: 'Redact a memory entry (replaces content with [redacted]).',
  },
  args: {
    id: { type: 'positional', description: 'Memory entry ID', required: true },
    reason: { type: 'string', description: 'Reason recorded in the audit log', default: '' },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_redact_memory_entry',
        { p_memory_id: args.id, p_reason: args.reason || null },
        { requireAuth: true },
      )
      consola.success('Memory entry redacted: %s', args.id)
    } catch (err) {
      handleError(err)
    }
  },
})

const search = defineCommand({
  meta: {
    name: 'search',
    description: 'Full-text search over memory entries (Postgres english tsvector + GIN).',
  },
  args: {
    query: { type: 'positional', description: 'Search query', required: true },
    profile: { type: 'string', description: 'Restrict to a single memory profile', default: '' },
    limit: { type: 'string', description: 'Max results (1-50)', default: '20' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const limit = Math.max(1, Math.min(50, parseInt(args.limit, 10) || 20))
      const rows = await callRpc<MemorySearchRow[]>(
        'fn_search_memory_entries',
        {
          p_query: args.query,
          p_profile_id: args.profile || null,
          p_limit: limit,
        },
        { requireAuth: true },
      )
      if (!rows || rows.length === 0) {
        consola.info('No memory entries match "%s".', args.query)
        return
      }
      if (args.json) return printJson(rows)
      printTable(
        ['ID', 'Scope', 'Source', 'Conf', 'Rank', 'Content'],
        rows.map((r) => [
          r.id.slice(0, 8),
          r.scope,
          r.source,
          r.confidence.toFixed(2),
          r.rank.toFixed(3),
          truncate(r.content, 60),
        ]),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

const summarize = defineCommand({
  meta: {
    name: 'summarize',
    description: 'Summarize a memory profile (count, scopes, last write).',
  },
  args: {
    profile: { type: 'string', description: 'Memory profile ID', required: true },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const summary = await callRpc<Record<string, unknown>>(
        'fn_summarize_memory_profile',
        { p_profile_id: args.profile },
        { requireAuth: true },
      )
      if (args.json) return printJson(summary)
      consola.info('Profile:         %s', summary.profile_id)
      consola.info('Total entries:   %s', summary.count)
      consola.info('Last written at: %s', summary.last_written_at ?? '(none)')
      consola.info('Scopes:          %s', JSON.stringify(summary.scopes ?? {}))
    } catch (err) {
      handleError(err)
    }
  },
})

const contextPreview = defineCommand({
  meta: {
    name: 'context-preview',
    description: 'Preview the memory context block that will be prepended to lens templates at run time.',
  },
  args: {
    lenser: {
      type: 'string',
      description: 'AI lenser UUID',
      required: true,
    },
    scope: { type: 'string', description: 'Filter by scope', default: '' },
    limit: { type: 'string', description: 'Max entries (1-50)', default: '20' },
  },
  async run({ args }) {
    try {
      const limit = Math.max(1, Math.min(50, parseInt(args.limit, 10) || 20))
      const block = await callRpc<string | null>(
        'fn_build_lenser_prompt_context',
        {
          p_ai_lenser_id: args.lenser,
          p_scope: args.scope || null,
          p_limit: limit,
        },
        { useServiceRole: true, schema: 'agents' },
      )
      if (!block) {
        consola.info('No memory entries for lenser %s — nothing will be prepended.', args.lenser)
        return
      }
      process.stdout.write(block)
    } catch (err) {
      handleError(err)
    }
  },
})

const createProfile = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new memory profile for an AI lenser.',
  },
  args: {
    lenser: {
      type: 'string',
      description: 'AI lenser UUID',
      required: true,
    },
    name: { type: 'string', description: 'Profile name', default: 'default' },
    scope: {
      type: 'string',
      description: 'Scope type: project | conversation | global',
      default: 'project',
    },
    isolation: {
      type: 'string',
      description: 'Isolation mode: shared | isolated',
      default: 'isolated',
    },
    'retention-days': {
      type: 'string',
      description: 'Retention period in days (default 90)',
      default: '90',
    },
    json: { type: 'boolean', description: 'Output result as JSON', default: false },
  },
  async run({ args }) {
    try {
      const profile = await callRpc<Record<string, unknown>>(
        'fn_create_memory_profile',
        {
          p_ai_lenser_id: args.lenser,
          p_name: args.name,
          p_scope_type: args.scope,
          p_isolation_mode: args.isolation,
          p_retention_days: parseInt(args['retention-days'], 10) || 90,
        },
        { requireAuth: true },
      )
      if (args.json) return printJson(profile)
      consola.success('Memory profile created.')
      consola.info('Profile ID: %s', profile['id'])
      consola.info('Name:       %s', profile['name'])
      consola.info('Scope:      %s', profile['scope_type'])
      consola.info('')
      consola.info('Write an entry:  lf memory write-entry --profile %s --content "..."', profile['id'])
    } catch (err) {
      handleError(err)
    }
  },
})

export default defineCommand({
  meta: {
    name: 'memory',
    description: 'Manage per-agent memory profiles and entries.',
  },
  subCommands: {
    create: createProfile,
    'list-profiles': listProfiles,
    'list-entries': listEntries,
    'write-entry': writeEntry,
    'context-preview': contextPreview,
    search,
    redact,
    summarize,
  },
})
