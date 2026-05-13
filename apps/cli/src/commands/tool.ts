import { defineCommand } from 'citty'
import consola from 'consola'

import { type ToolFrontmatter } from '@lenserfight/types'

import { callRpc, handleError } from '../utils/api'
import { parseAutomationDocument } from '../utils/automation-objects'
import { printJson, printTable, truncate } from '../utils/output'

// ─── test ────────────────────────────────────────────────────────────────────

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

// ─── register ────────────────────────────────────────────────────────────────

const register = defineCommand({
  meta: {
    name: 'register',
    description: 'Register a tool from a TOOL.md file into the registry.',
  },
  args: {
    file: { type: 'string', description: 'Path to TOOL.md', required: true },
    apply: { type: 'boolean', description: 'Actually write to registry (dry-run by default)', default: false },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
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

    const fm = parsed.document.frontmatter as ToolFrontmatter
    if (!args.apply) {
      consola.info('[dry-run] Would register tool: %s (%s)', fm.name, fm.id)
      return
    }

    try {
      const id = await callRpc<string>(
        'fn_register_tool',
        {
          p_key: fm.id,
          p_name: fm.name,
          p_description: parsed.document.body ?? '',
          p_permission_level: fm.permission_level ?? 'read',
          p_risk_level: fm.risk_level ?? 'safe',
          p_cost_level: fm.cost_level ?? 'low',
          p_schema: fm.input_schema ?? {},
        },
        { requireAuth: true },
      )
      if (args.json) return printJson({ id })
      consola.success('Tool registered: %s', id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── list ─────────────────────────────────────────────────────────────────────

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List tools from registry, assignments, or profiles.',
  },
  args: {
    registry: { type: 'boolean', description: 'List registry entries', default: false },
    assignments: { type: 'boolean', description: 'List tool assignments', default: false },
    profiles: { type: 'boolean', description: 'List tool profiles', default: false },
    agent: { type: 'string', description: 'Filter by AI lenser ID', default: '' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    const mode = args.assignments ? 'assignments' : args.profiles ? 'profiles' : 'registry'
    try {
      let rows: Record<string, unknown>[]
      if (mode === 'registry') {
        rows = await callRpc<Record<string, unknown>[]>(
          'fn_list_tools_registry',
          { p_owner_lenser_id: args.agent || null },
          { requireAuth: true },
        )
      } else if (mode === 'assignments') {
        rows = await callRpc<Record<string, unknown>[]>(
          'fn_list_tool_assignments',
          { p_ai_lenser_id: args.agent || null },
          { requireAuth: true },
        )
      } else {
        rows = await callRpc<Record<string, unknown>[]>(
          'fn_list_tool_profiles',
          { p_ai_lenser_id: args.agent || null },
          { requireAuth: true },
        )
      }
      if (!rows || rows.length === 0) {
        consola.info('No tools found for mode=%s', mode)
        return
      }
      if (args.json) return printJson(rows)
      if (mode === 'registry') {
        printTable(
          ['ID', 'Key', 'Name', 'Egress', 'Approval', 'Dangerous'],
          rows.map((r) => [
            String(r.id ?? '').slice(0, 8),
            truncate(String(r.key ?? ''), 20),
            truncate(String(r.name ?? ''), 24),
            String(r.egress_class ?? 'none'),
            r.requires_approval ? 'yes' : '',
            r.is_dangerous ? 'yes' : '',
          ]),
        )
      } else {
        printTable(
          ['ID', 'Tool', 'Agent', 'Profile'],
          rows.map((r) => [
            String(r.id ?? '').slice(0, 8),
            truncate(String(r.tool_name ?? r.tool_id ?? ''), 24),
            String(r.ai_lenser_id ?? '').slice(0, 8),
            String(r.profile_id ?? '').slice(0, 8),
          ]),
        )
      }
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── assign ───────────────────────────────────────────────────────────────────

const assign = defineCommand({
  meta: {
    name: 'assign',
    description: 'Assign a tool to an AI lenser.',
  },
  args: {
    tool: { type: 'string', description: 'Tool ID', required: true },
    agent: { type: 'string', description: 'AI lenser ID', required: true },
    profile: { type: 'string', description: 'Tool profile ID (optional)', default: '' },
  },
  async run({ args }) {
    try {
      const id = await callRpc<string>(
        'fn_assign_tool_to_agent',
        {
          p_tool_id: args.tool,
          p_ai_lenser_id: args.agent,
          p_tool_profile_id: args.profile || null,
        },
        { requireAuth: true },
      )
      consola.success('Tool assigned: %s', id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── revoke ───────────────────────────────────────────────────────────────────

const revoke = defineCommand({
  meta: {
    name: 'revoke',
    description: 'Revoke a tool assignment from an AI lenser.',
  },
  args: {
    tool: { type: 'string', description: 'Tool ID', required: true },
    agent: { type: 'string', description: 'AI lenser ID', required: true },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_revoke_tool_from_agent',
        { p_tool_id: args.tool, p_ai_lenser_id: args.agent },
        { requireAuth: true },
      )
      consola.success('Tool assignment revoked.')
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── invocations ──────────────────────────────────────────────────────────────

interface ToolInvocationRow {
  id: string
  tool_name?: string
  tool_key?: string
  tool_id: string
  status: string
  approval_status: string
  egress_class?: string
  team_run_id: string
  cost_estimate?: number
  created_at: string
}

const invocations = defineCommand({
  meta: {
    name: 'invocations',
    description: 'List tool invocations (all statuses or filtered).',
  },
  args: {
    status: { type: 'string', description: 'Status filter (pending|approved|rejected|running|completed|failed)', default: '' },
    agent: { type: 'string', description: 'AI lenser ID filter', default: '' },
    teamRun: { type: 'string', description: 'Team run ID filter', default: '' },
    limit: { type: 'string', description: 'Max rows', default: '20' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<ToolInvocationRow[]>(
        'fn_list_tool_invocations',
        {
          p_ai_lenser_id: args.agent || null,
          p_team_run_id: args.teamRun || null,
          p_status: args.status || null,
          p_limit: parseInt(args.limit, 10),
        },
        { requireAuth: true },
      )
      if (!rows || rows.length === 0) {
        consola.info('No tool invocations found.')
        return
      }
      if (args.json) return printJson(rows)
      printTable(
        ['ID', 'Tool', 'Status', 'Approval', 'Egress', 'Run', 'Created'],
        rows.map((r) => [
          r.id.slice(0, 8),
          truncate(r.tool_name ?? r.tool_key ?? r.tool_id.slice(0, 8), 20),
          r.status,
          r.approval_status,
          r.egress_class ?? 'none',
          r.team_run_id.slice(0, 8),
          new Date(r.created_at).toLocaleString(),
        ]),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── approve ──────────────────────────────────────────────────────────────────

const approve = defineCommand({
  meta: {
    name: 'approve',
    description: 'Approve a pending tool invocation.',
  },
  args: {
    id: { type: 'positional', description: 'Tool invocation ID', required: true },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_approve_tool_invocation',
        { p_invocation_id: args.id },
        { requireAuth: true },
      )
      consola.success('Tool invocation approved: %s', args.id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── reject ───────────────────────────────────────────────────────────────────

const reject = defineCommand({
  meta: {
    name: 'reject',
    description: 'Reject a pending tool invocation with a reason.',
  },
  args: {
    id: { type: 'positional', description: 'Tool invocation ID', required: true },
    reason: { type: 'string', description: 'Reason for rejection', required: true },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_reject_tool_invocation',
        { p_invocation_id: args.id, p_reason: args.reason },
        { requireAuth: true },
      )
      consola.success('Tool invocation rejected: %s', args.id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── root ─────────────────────────────────────────────────────────────────────

export default defineCommand({
  meta: {
    name: 'tool',
    description: 'Manage tool contracts, registry, assignments, and runtime invocations.',
  },
  subCommands: {
    test,
    register,
    list,
    assign,
    revoke,
    invocations,
    approve,
    reject,
  },
})
