import { describe, it, expect } from 'vitest'
import { SupabaseQueryRunner, isRpcAllowed } from './supabase-query.runner'
import { KVStoreReadRunner, KVStoreWriteRunner } from './kv-store.runner'
import { FileReaderRunner } from './file-reader.runner'
import { WebhookTriggerRunner, WebhookSenderRunner } from './webhook.runner'
import { ScheduleTriggerRunner } from './schedule-trigger.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

// ── SupabaseQueryRunner ──────────────────────────────────────────────────────

describe('SupabaseQueryRunner', () => {
  const runner = new SupabaseQueryRunner()

  it('declares node type as supabase_query', () => { expect(runner.nodeType).toBe('supabase_query') })

  it('returns error when no RPC name', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'sq1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No RPC name')
  })

  it('rejects non-allowlisted RPC', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'sq1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { rpcName: 'fn_drop_tables' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('not in the allowlist')
  })

  it('emits query request for allowed RPC', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'sq1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { rpcName: 'fn_search_lenser_memory', params: { query: 'test' } } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__supabase_query_request']).toBe(true)
    expect(result.output.data?.['rpcName']).toBe('fn_search_lenser_memory')
    expect(result.output.data?.['params']).toEqual({ query: 'test' })
  })

  it('isRpcAllowed helper works', () => {
    expect(isRpcAllowed('fn_search_lenser_memory')).toBe(true)
    expect(isRpcAllowed('fn_evil_function')).toBe(false)
  })
})

// ── KVStoreReadRunner / KVStoreWriteRunner ───────────────────────────────────

describe('KVStoreReadRunner', () => {
  const runner = new KVStoreReadRunner()

  it('declares node type as kv_store_read', () => { expect(runner.nodeType).toBe('kv_store_read') })

  it('returns error when no key', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'kv1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No key')
  })

  it('returns error for invalid key characters', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'kv1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { key: 'bad key!' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('alphanumeric')
  })

  it('returns cached value from resolvedParams', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'kv1', upstreamOutputs: new Map(), resolvedParams: { __kv_mykey: 'cached' }, nodeConfig: { key: 'mykey' } }
    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('cached')
    expect(result.output.data?.['source']).toBe('cache')
  })

  it('emits read request when no cache', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'kv1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { key: 'session-id' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__kv_read_request']).toBe(true)
  })
})

describe('KVStoreWriteRunner', () => {
  const runner = new KVStoreWriteRunner()

  it('declares node type as kv_store_write', () => { expect(runner.nodeType).toBe('kv_store_write') })

  it('writes explicit value', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'kv1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { key: 'token', value: 'abc123' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__kv_write_request']).toBe(true)
    expect(result.variableMutations?.['__kv_token']).toBe('abc123')
  })

  it('writes upstream text when no explicit value', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'upstream-val', durationMs: 0 }
    const ctx: NodeRunnerContext = { nodeId: 'kv1', upstreamOutputs: new Map([['n1', upstream]]), resolvedParams: {}, nodeConfig: { key: 'data' } }
    const result = await runner.execute(ctx)
    expect(result.variableMutations?.['__kv_data']).toBe('upstream-val')
  })

  it('rejects oversized values', async () => {
    const bigValue = 'x'.repeat(2_000_000)
    const ctx: NodeRunnerContext = { nodeId: 'kv1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { key: 'big', value: bigValue } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('max size')
  })
})

// ── FileReaderRunner ────────────────────────────────────────────────────────

describe('FileReaderRunner', () => {
  const runner = new FileReaderRunner()

  it('declares node type as file_reader', () => { expect(runner.nodeType).toBe('file_reader') })

  it('returns error when no URL', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'fr1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No file URL')
  })

  it('rejects invalid URL format', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'fr1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { url: 'not-a-url' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('Invalid URL')
  })

  it('rejects URLs not in domain allowlist', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'fr1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { url: 'https://evil.com/file.txt' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('not in allowlist')
  })

  it('emits read request for allowed domain', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'fr1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { url: 'https://cdn.lenserfight.com/files/doc.pdf' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__file_read_request']).toBe(true)
    expect(result.output.data?.['url']).toContain('cdn.lenserfight.com')
  })

  it('uses upstream URL when no config url', async () => {
    const upstream: ExecutionResult = { mediaType: 'image', url: 'https://cdn.lenserfight.com/img.png', durationMs: 0 }
    const ctx: NodeRunnerContext = { nodeId: 'fr1', upstreamOutputs: new Map([['n1', upstream]]), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__file_read_request']).toBe(true)
  })
})

// ── WebhookTriggerRunner ────────────────────────────────────────────────────

describe('WebhookTriggerRunner', () => {
  const runner = new WebhookTriggerRunner()

  it('declares node type as webhook_trigger', () => { expect(runner.nodeType).toBe('webhook_trigger') })

  it('rejects short secrets', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'wt1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { secret: 'short' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('at least 16')
  })

  it('registers webhook with valid secret', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'wt1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { secret: 'a-very-secure-secret-key-here' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__webhook_trigger_request']).toBe(true)
    expect(result.output.data?.['rateLimitPerMin']).toBe(100)
  })
})

// ── WebhookSenderRunner ─────────────────────────────────────────────────────

describe('WebhookSenderRunner', () => {
  const runner = new WebhookSenderRunner()

  it('declares node type as webhook_sender', () => { expect(runner.nodeType).toBe('webhook_sender') })

  it('returns error when no URL', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'ws1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No URL')
  })

  it('blocks private/internal URLs', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'ws1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { url: 'http://192.168.1.1/hook' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('private')
  })

  it('blocks localhost', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'ws1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { url: 'http://localhost:3000/api' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('private')
  })

  it('emits send request for valid public URL', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'ws1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { url: 'https://hooks.slack.com/services/T00/B00/xxx', method: 'POST' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__webhook_send_request']).toBe(true)
    expect(result.output.data?.['method']).toBe('POST')
    expect(result.output.data?.['retries']).toBe(3)
  })

  it('rejects invalid HTTP method', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'ws1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { url: 'https://example.com', method: 'TRACE' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('not allowed')
  })
})

// ── ScheduleTriggerRunner ───────────────────────────────────────────────────

describe('ScheduleTriggerRunner', () => {
  const runner = new ScheduleTriggerRunner()

  it('declares node type as schedule_trigger', () => { expect(runner.nodeType).toBe('schedule_trigger') })

  it('returns error for missing cron', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'st1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No cron')
  })

  it('rejects invalid cron format', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'st1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { cronExpression: 'not a cron' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('Invalid cron')
  })

  it('rejects too-frequent schedules', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'st1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { cronExpression: '* * * * *' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('too frequent')
  })

  it('accepts valid cron expression', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'st1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { cronExpression: '*/15 * * * *' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__schedule_trigger_request']).toBe(true)
    expect(result.output.data?.['cronExpression']).toBe('*/15 * * * *')
  })

  it('passes timezone config', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'st1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { cronExpression: '0 9 * * 1', timezone: 'Europe/Istanbul' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['timezone']).toBe('Europe/Istanbul')
  })

  it('respects enabled flag', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'st1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { cronExpression: '0 0 * * *', enabled: false } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['enabled']).toBe(false)
    expect(result.variableMutations?.['__schedule_active']).toBe(false)
  })
})
