import { describe, expect, it } from 'vitest'

import {
  createDryRunMockRunner,
  isSideEffectNodeType,
  SIDE_EFFECT_NODE_TYPES,
  validateDryRunPlan,
} from './workflowDryRun'

import type { WorkflowEdgeRecord, WorkflowNodeRecord } from '@lenserfight/data/repositories'

// ── SIDE_EFFECT_NODE_TYPES ────────────────────────────────────────────────────

describe('SIDE_EFFECT_NODE_TYPES', () => {
  it('includes all communication node types', () => {
    const comm = ['email_send', 'slack_notify', 'discord_notify', 'telegram_notify', 'push_notification', 'sms_send']
    for (const t of comm) {
      expect(SIDE_EFFECT_NODE_TYPES.has(t), `expected ${t} in set`).toBe(true)
    }
  })

  it('includes write-path integration types', () => {
    const write = ['notion_write', 'google_sheets_write', 'github_issue_create', 'github_pr_review',
      'linear_issue_create', 'jira_issue_create', 'calendar_create', 'webhook_sender']
    for (const t of write) {
      expect(SIDE_EFFECT_NODE_TYPES.has(t), `expected ${t} in set`).toBe(true)
    }
  })

  it('includes storage write types', () => {
    const storage = ['kv_store_write', 'file_writer', 'object_storage_upload', 'memory_write']
    for (const t of storage) {
      expect(SIDE_EFFECT_NODE_TYPES.has(t), `expected ${t} in set`).toBe(true)
    }
  })

  it('includes conservatively mocked DB types', () => {
    expect(SIDE_EFFECT_NODE_TYPES.has('supabase_query')).toBe(true)
    expect(SIDE_EFFECT_NODE_TYPES.has('sql_query')).toBe(true)
  })

  it('does NOT include read-only types', () => {
    const readOnly = ['kv_store_read', 'file_reader', 'object_storage_download', 'memory_read',
      'github_read', 'notion_read', 'google_sheets_read']
    for (const t of readOnly) {
      expect(SIDE_EFFECT_NODE_TYPES.has(t), `expected ${t} NOT in set`).toBe(false)
    }
  })

  it('has exactly 20 entries', () => {
    expect(SIDE_EFFECT_NODE_TYPES.size).toBe(20)
  })
})

// ── isSideEffectNodeType ──────────────────────────────────────────────────────

describe('isSideEffectNodeType', () => {
  it('returns true for side-effect types', () => {
    expect(isSideEffectNodeType('email_send')).toBe(true)
    expect(isSideEffectNodeType('webhook_sender')).toBe(true)
    expect(isSideEffectNodeType('memory_write')).toBe(true)
  })

  it('returns false for safe types', () => {
    expect(isSideEffectNodeType('lens')).toBe(false)
    expect(isSideEffectNodeType('if_condition')).toBe(false)
    expect(isSideEffectNodeType('kv_store_read')).toBe(false)
  })

  it('returns false for null and undefined', () => {
    expect(isSideEffectNodeType(null)).toBe(false)
    expect(isSideEffectNodeType(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isSideEffectNodeType('')).toBe(false)
  })
})

// ── createDryRunMockRunner ────────────────────────────────────────────────────

describe('createDryRunMockRunner', () => {
  it('returns a runner with the matching nodeType', () => {
    const runner = createDryRunMockRunner('email_send')
    expect(runner.nodeType).toBe('email_send')
  })

  it('resolves without throwing', async () => {
    const runner = createDryRunMockRunner('slack_notify')
    const result = await runner.execute({} as never)
    expect(result).toBeDefined()
  })

  it('sets _dryRunMocked to true in output data', async () => {
    const runner = createDryRunMockRunner('webhook_sender')
    const result = await runner.execute({} as never)
    expect((result.output as Record<string, unknown>)?.['data']).toMatchObject({
      _dryRunMocked: true,
    })
  })

  it('sets _dryRunWarning containing the node type name', async () => {
    const runner = createDryRunMockRunner('email_send')
    const result = await runner.execute({} as never)
    const data = (result.output as Record<string, unknown>)?.['data'] as Record<string, unknown>
    expect(typeof data?.['_dryRunWarning']).toBe('string')
    expect((data?.['_dryRunWarning'] as string)).toContain('email_send')
  })

  it('returns mediaType text', async () => {
    const runner = createDryRunMockRunner('sms_send')
    const result = await runner.execute({} as never)
    expect((result.output as Record<string, unknown>)?.['mediaType']).toBe('text')
  })
})

// ── validateDryRunPlan ────────────────────────────────────────────────────────

function makeNode(id: string, nodeType?: string): WorkflowNodeRecord {
  return {
    id,
    workflow_id: 'wf1',
    lens_id: null,
    version_id: null,
    label: id,
    ordinal: 0,
    config: nodeType ? { node_type: nodeType } : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as WorkflowNodeRecord
}

function makeEdge(id: string, src: string, tgt: string): WorkflowEdgeRecord {
  return {
    id,
    workflow_id: 'wf1',
    source_node_id: src,
    target_node_id: tgt,
    source_output_key: null,
    target_param_label: null,
    condition: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as WorkflowEdgeRecord
}

describe('validateDryRunPlan', () => {
  it('returns error when no nodes provided', () => {
    const result = validateDryRunPlan([], [])
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('passes with a single node and no edges', () => {
    const result = validateDryRunPlan([makeNode('n1', 'lens')], [])
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('passes with two connected nodes', () => {
    const nodes = [makeNode('n1', 'lens'), makeNode('n2', 'lens')]
    const edges = [makeEdge('e1', 'n1', 'n2')]
    const result = validateDryRunPlan(nodes, edges)
    expect(result.ok).toBe(true)
  })

  it('produces a warning for side-effect nodes but does not block execution', () => {
    const nodes = [makeNode('n1', 'lens'), makeNode('n2', 'email_send')]
    const edges = [makeEdge('e1', 'n1', 'n2')]
    const result = validateDryRunPlan(nodes, edges)
    expect(result.ok).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('1 side-effect node')
  })

  it('counts multiple side-effect nodes in the single warning', () => {
    const nodes = [
      makeNode('n1', 'lens'),
      makeNode('n2', 'email_send'),
      makeNode('n3', 'slack_notify'),
    ]
    const edges = [makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n1', 'n3')]
    const result = validateDryRunPlan(nodes, edges)
    expect(result.ok).toBe(true)
    expect(result.warnings[0]).toContain('2 side-effect')
  })

  it('produces no warning when no side-effect nodes present', () => {
    const nodes = [makeNode('n1', 'lens'), makeNode('n2', 'if_condition')]
    const edges = [makeEdge('e1', 'n1', 'n2')]
    const result = validateDryRunPlan(nodes, edges)
    expect(result.ok).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })
})
