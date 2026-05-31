import { readFile } from 'node:fs/promises'
import { defineCommand } from 'citty'
import consola from 'consola'

import { callRpc, handleError } from '../utils/api'
import { printJson, printTable, truncate } from '../utils/output'

// ─── Types ─────────────────────────────────────────────────────────────────

const ACTION_KINDS = ['dispatch_workflow', 'webhook', 'notify'] as const
type ActionKind = (typeof ACTION_KINDS)[number]

const FILTER_OPS = ['eq', 'neq', 'gt', 'lt', 'contains'] as const
type FilterOp = (typeof FILTER_OPS)[number]

type FilterClause = { [op in FilterOp]?: unknown }
type RuleFilter = Record<string, FilterClause>

interface TriggerRuleRow {
  id: string
  name: string
  match_event_type: string
  action_kind: ActionKind
  is_active: boolean
  created_at: string
}

interface EventDispatchRow {
  event_id: string
  status: string
  attempted_at: string | null
  error: string | null
}

interface RuleDefinition {
  name: string
  match_event_type: string
  match_filter?: RuleFilter
  action_kind: ActionKind
  action_config: Record<string, unknown>
  is_active?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

/**
 * Parse the rule file. The CLI does not bundle a YAML library, so we accept
 * JSON-only input. Files ending in .yaml/.yml are rejected with a hint.
 */
async function loadRuleFile(filePath: string): Promise<unknown> {
  if (/\.(ya?ml)$/i.test(filePath)) {
    throw new Error(
      `YAML rule files are not supported by the CLI yet (no yaml/js-yaml dep). ` +
      `Convert "${filePath}" to JSON and pass --file rule.json.`,
    )
  }
  const raw = await readFile(filePath, 'utf-8')
  try {
    return JSON.parse(raw)
  } catch (err) {
    throw new Error(`Failed to parse "${filePath}" as JSON: ${(err as Error).message}`)
  }
}

function validateFilter(filter: unknown): asserts filter is RuleFilter {
  if (!isPlainObject(filter)) {
    throw new Error('match_filter must be a JSON object.')
  }
  for (const [pointer, clause] of Object.entries(filter)) {
    if (!isPlainObject(clause)) {
      throw new Error(
        `match_filter["${pointer}"] must be an object like { "eq": <value> }.`,
      )
    }
    const keys = Object.keys(clause)
    if (keys.length !== 1) {
      throw new Error(
        `match_filter["${pointer}"] must have exactly one operator key (got ${keys.length}).`,
      )
    }
    const op = keys[0]
    if (!FILTER_OPS.includes(op as FilterOp)) {
      throw new Error(
        `match_filter["${pointer}"] uses unknown operator "${op}". Allowed: ${FILTER_OPS.join(', ')}.`,
      )
    }
  }
}

function validateRuleDefinition(input: unknown): RuleDefinition {
  if (!isPlainObject(input)) {
    throw new Error('Rule file must contain a JSON object.')
  }
  const required = ['name', 'match_event_type', 'action_kind', 'action_config'] as const
  for (const key of required) {
    if (!(key in input)) {
      throw new Error(`Rule is missing required field "${key}".`)
    }
  }
  if (typeof input.name !== 'string' || input.name.trim() === '') {
    throw new Error('Rule "name" must be a non-empty string.')
  }
  if (typeof input.match_event_type !== 'string' || input.match_event_type.trim() === '') {
    throw new Error('Rule "match_event_type" must be a non-empty string.')
  }
  if (typeof input.action_kind !== 'string' || !ACTION_KINDS.includes(input.action_kind as ActionKind)) {
    throw new Error(
      `Rule "action_kind" must be one of: ${ACTION_KINDS.join(', ')}.`,
    )
  }
  if (!isPlainObject(input.action_config)) {
    throw new Error('Rule "action_config" must be a JSON object.')
  }
  if (input.match_filter !== undefined && input.match_filter !== null) {
    validateFilter(input.match_filter)
  }
  if (input.is_active !== undefined && typeof input.is_active !== 'boolean') {
    throw new Error('Rule "is_active" must be a boolean if provided.')
  }
  return {
    name: input.name,
    match_event_type: input.match_event_type,
    action_kind: input.action_kind as ActionKind,
    action_config: input.action_config as Record<string, unknown>,
    match_filter: (input.match_filter as RuleFilter | undefined) ?? undefined,
    is_active: (input.is_active as boolean | undefined) ?? undefined,
  }
}

/**
 * Resolve a JSON Pointer (RFC 6901) against a payload.
 * Mirrors the SQL-side jsonb evaluator: leading "/", "~1" = "/", "~0" = "~".
 * Returns `undefined` when the pointer cannot be resolved.
 */
export function resolveJsonPointer(payload: unknown, pointer: string): unknown {
  if (pointer === '' || pointer === '/') return payload
  if (!pointer.startsWith('/')) return undefined
  const tokens = pointer
    .slice(1)
    .split('/')
    .map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'))
  let cursor: unknown = payload
  for (const token of tokens) {
    if (Array.isArray(cursor)) {
      const idx = Number(token)
      if (!Number.isInteger(idx) || idx < 0 || idx >= cursor.length) return undefined
      cursor = cursor[idx]
    } else if (isPlainObject(cursor)) {
      if (!(token in cursor)) return undefined
      cursor = cursor[token]
    } else {
      return undefined
    }
  }
  return cursor
}

function applyOp(op: FilterOp, actual: unknown, expected: unknown): boolean {
  switch (op) {
    case 'eq':
      return actual === expected
    case 'neq':
      return actual !== expected
    case 'gt':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected
    case 'lt':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected
    case 'contains':
      if (typeof actual === 'string' && typeof expected === 'string') {
        return actual.includes(expected)
      }
      if (Array.isArray(actual)) {
        return actual.some((item) => item === expected)
      }
      return false
  }
}

interface FilterMatchResult {
  match: boolean
  failingPointer?: string
  failingOp?: FilterOp
  failingExpected?: unknown
  failingActual?: unknown
}

export function evaluateFilter(filter: RuleFilter | undefined, payload: unknown): FilterMatchResult {
  if (!filter) return { match: true }
  for (const [pointer, clause] of Object.entries(filter)) {
    const op = Object.keys(clause)[0] as FilterOp
    const expected = clause[op]
    const actual = resolveJsonPointer(payload, pointer)
    if (!applyOp(op, actual, expected)) {
      return {
        match: false,
        failingPointer: pointer,
        failingOp: op,
        failingExpected: expected,
        failingActual: actual,
      }
    }
  }
  return { match: true }
}

function clampLimit(raw: number, fallback: number, max: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return fallback
  return Math.min(max, Math.max(1, Math.floor(raw)))
}

// ─── automation list ─────────────────────────────────────────────────────

const automationList = defineCommand({
  meta: {
    name: 'list',
    description: 'List automation trigger rules.',
  },
  args: {
    'active-only': {
      type: 'boolean',
      description: 'Only show rules where is_active=true',
      default: false,
    },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const query: Record<string, string | number | boolean | undefined> = {
        select: 'id,name,match_event_type,action_kind,is_active,created_at',
        order: 'created_at.desc',
      }
      if (args['active-only']) query['is_active'] = 'eq.true'

      const allRows = await callRpc<TriggerRuleRow[]>(
        'fn_list_automation_rules',
        { p_limit: 100 },
        { requireAuth: true }
      )
      const rows = args['active-only']
        ? (allRows ?? []).filter((r) => r.is_active)
        : allRows ?? []

      if (rows.length === 0) {
        consola.info('No trigger rules found.')
        return
      }

      if (args.json) return printJson(rows)

      printTable(
        ['Rule ID', 'Name', 'Event', 'Action', 'Active', 'Created'],
        rows.map((r) => [
          r.id.slice(0, 8),
          truncate(r.name, 32),
          r.match_event_type,
          r.action_kind,
          r.is_active ? 'yes' : 'no',
          new Date(r.created_at).toLocaleString(),
        ]),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── automation create ───────────────────────────────────────────────────

const automationCreate = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new automation trigger rule from a JSON file.',
  },
  args: {
    file: {
      type: 'string',
      description: 'Path to the rule definition file (JSON; YAML not yet supported).',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const raw = await loadRuleFile(args.file)
      const def = validateRuleDefinition(raw)

      const created = await callRpc<{ id: string; name: string }>(
        'fn_create_automation_rule',
        {
          p_name: def.name,
          p_match_event_type: def.match_event_type,
          p_action_kind: def.action_kind,
          p_action_config: def.action_config,
          p_match_filter: def.match_filter ?? {},
          p_is_active: def.is_active ?? true,
        },
        { requireAuth: true },
      )

      if (!created) {
        consola.warn('Rule created but no row returned.')
        return
      }
      printJson({ rule_id: (created as { id: string }).id, name: (created as { name: string }).name })
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── automation enable / disable ─────────────────────────────────────────

function makeToggleCommand(name: 'enable' | 'disable', active: boolean) {
  return defineCommand({
    meta: {
      name,
      description: `${active ? 'Enable' : 'Disable'} a trigger rule.`,
    },
    args: {
      id: {
        type: 'positional',
        description: 'Trigger rule UUID',
        required: true,
      },
    },
    async run({ args }) {
      try {
        await callRpc(
          'fn_toggle_automation_rule',
          { p_rule_id: args.id, p_is_active: active },
          { requireAuth: true }
        )
        consola.success('%s rule %s', active ? 'Enabled' : 'Disabled', args.id)
      } catch (err) {
        handleError(err)
      }
    },
  })
}

const automationEnable = makeToggleCommand('enable', true)
const automationDisable = makeToggleCommand('disable', false)

// ─── automation delete ───────────────────────────────────────────────────

const automationDelete = defineCommand({
  meta: {
    name: 'delete',
    description: 'Delete a trigger rule (requires --force).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Trigger rule UUID',
      required: true,
    },
    force: {
      type: 'boolean',
      description: 'Skip confirmation prompt',
      default: false,
    },
  },
  async run({ args }) {
    if (!args.force) {
      consola.warn('This will permanently delete trigger rule %s.', args.id)
      consola.info('Re-run with --force to confirm.')
      process.exitCode = 1
      return
    }
    try {
      await callRpc(
        'fn_delete_automation_rule',
        { p_rule_id: args.id },
        { requireAuth: true }
      )
      consola.success('Deleted rule %s', args.id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── automation history ──────────────────────────────────────────────────

const automationHistory = defineCommand({
  meta: {
    name: 'history',
    description: 'Show dispatch history for a trigger rule.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Trigger rule UUID',
      required: true,
    },
    limit: {
      type: 'string',
      description: 'Max rows to return (1–100, default 25).',
      default: '25',
    },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const limit = clampLimit(parseInt(args.limit, 10), 25, 100)
      const rows = await callRpc<EventDispatchRow[]>(
        'fn_list_automation_dispatch_history',
        { p_rule_id: args.id, p_limit: limit },
        { requireAuth: true },
      )

      if (!rows || rows.length === 0) {
        consola.info('No dispatches recorded for rule %s.', args.id)
        return
      }

      if (args.json) return printJson(rows)

      printTable(
        ['Event ID', 'Status', 'Attempted', 'Error'],
        rows.map((r) => [
          r.event_id.slice(0, 8),
          r.status,
          r.attempted_at ? new Date(r.attempted_at).toLocaleString() : '—',
          r.error ? truncate(r.error, 60) : '',
        ]),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── automation test ─────────────────────────────────────────────────────

const automationTest = defineCommand({
  meta: {
    name: 'test',
    description: 'Locally evaluate a rule against a sample event payload (dry-run).',
  },
  args: {
    file: {
      type: 'string',
      description: 'Path to rule definition (JSON).',
      required: true,
    },
    event: {
      type: 'string',
      description: 'Inline JSON event payload, e.g. \'{"event_type":"battle.completed","payload":{...}}\'',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const raw = await loadRuleFile(args.file)
      const def = validateRuleDefinition(raw)

      let event: unknown
      try {
        event = JSON.parse(args.event)
      } catch (err) {
        consola.error('Failed to parse --event as JSON: %s', (err as Error).message)
        process.exitCode = 1
        return
      }
      if (!isPlainObject(event)) {
        consola.error('--event must be a JSON object.')
        process.exitCode = 1
        return
      }

      const eventType = event['event_type']
      if (eventType !== def.match_event_type) {
        consola.info(
          'NO MATCH: event_type "%s" does not match rule.match_event_type "%s".',
          String(eventType),
          def.match_event_type,
        )
        return
      }

      const result = evaluateFilter(def.match_filter, event)
      if (!result.match) {
        consola.info(
          'NO MATCH: filter clause "%s" %s %s failed (actual: %s).',
          result.failingPointer,
          result.failingOp,
          JSON.stringify(result.failingExpected),
          JSON.stringify(result.failingActual),
        )
        return
      }

      consola.success(
        'WOULD FIRE: action_kind=%s, name=%s.',
        def.action_kind,
        def.name,
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── parent ──────────────────────────────────────────────────────────────

export const automationCommand = defineCommand({
  meta: {
    name: 'automation',
    description: 'Manage event-driven automation trigger rules.',
  },
  subCommands: {
    list: automationList,
    create: automationCreate,
    enable: automationEnable,
    disable: automationDisable,
    delete: automationDelete,
    history: automationHistory,
    test: automationTest,
  },
})

export default automationCommand
