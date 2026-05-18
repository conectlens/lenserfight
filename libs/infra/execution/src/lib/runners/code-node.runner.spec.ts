import { describe, it, expect } from 'vitest'
import { CodeNodeRunner } from './code-node.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

describe('CodeNodeRunner', () => {
  const runner = new CodeNodeRunner()

  it('declares node type as code', () => {
    expect(runner.nodeType).toBe('code')
  })

  it('returns error when no code provided', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No code provided')
  })

  it('evaluates simple expression', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { code: '1 + 2' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['value']).toBe(3)
    expect(result.output.text).toBe('3')
  })

  it('accesses upstream data via input object', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { count: 5 },
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { code: 'input.n1.count * 2' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['value']).toBe(10)
  })

  it('accesses resolved params', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: { name: 'world' },
      nodeConfig: { code: '`Hello ${params.name}`' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('Hello world')
  })

  it('returns object results as structured data', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { code: '({ status: "ok", items: [1, 2, 3] })' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data).toEqual({ status: 'ok', items: [1, 2, 3] })
  })

  it('supports explicit return statements', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { code: 'const x = 42; return x * 2;' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['value']).toBe(84)
  })

  it('rejects code with process reference', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { code: 'process.env.SECRET' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('forbidden pattern')
  })

  it('rejects code with require()', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { code: 'require("fs").readFileSync("/etc/passwd")' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('forbidden pattern')
  })

  it('rejects code with import()', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { code: 'import("child_process")' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('forbidden pattern')
  })

  it('rejects code with eval()', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { code: 'eval("1+1")' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('forbidden pattern')
  })

  it('rejects code with globalThis', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { code: 'globalThis.fetch("http://evil.com")' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('forbidden pattern')
  })

  it('rejects code with __proto__', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { code: '({}).__proto__.polluted = true' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('forbidden pattern')
  })

  it('rejects code exceeding max length', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { code: 'x'.repeat(10_001) },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('exceeds maximum length')
  })

  it('catches runtime errors gracefully', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { code: 'null.foo' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toBeDefined()
    expect(result.output.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('cancels on AbortSignal', async () => {
    const controller = new AbortController()
    controller.abort()
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { code: '1 + 1' },
      signal: controller.signal,
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('cancelled')
  })

  it('input object is frozen at top level (immutable)', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { x: 1 },
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { code: 'return (() => { try { input.newProp = "hacked"; return "mutated" } catch(e) { return "frozen" } })()' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('frozen')
  })

  it('reports durationMs for execution time', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'c1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { code: '42' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.durationMs).toBeGreaterThanOrEqual(0)
  })
})
