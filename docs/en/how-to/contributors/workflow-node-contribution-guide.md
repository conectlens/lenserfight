---
title: Contributing a Workflow Node
description: Step-by-step guide for adding new node types to the LenserFight Workflow engine using the INodeRunner interface.
---

# Contributing a Workflow Node

LenserFight's Workflow engine is extensible through the **Node Runner** system. Each node type is a self-contained class implementing the `INodeRunner` interface. This guide walks you through adding a new node from scratch.

## Architecture Overview

The runner system follows GRASP principles:

- **Polymorphism** — all runners share a common `INodeRunner` interface
- **Information Expert** — each runner owns its execution logic
- **Pure Fabrication** — `NodeRunnerRegistry` decouples dispatch from implementation
- **Low Coupling** — runners depend only on `NodeRunnerContext`, not the full service

```
libs/infra/execution/src/lib/
├── runners/
│   ├── node-runner.interface.ts   # INodeRunner + context types
│   ├── node-runner.registry.ts    # Registration + lookup
│   ├── index.ts                   # Barrel exports
│   ├── set-variables.runner.ts    # Example: simplest runner
│   ├── json-transform.runner.ts   # Example: data transform
│   ├── switch.runner.ts           # Example: multi-way branch
│   ├── code-node.runner.ts        # Example: sandboxed JS execution
│   └── ...
├── execution.types.ts             # WorkflowNodeType union
└── ...
```

## Step 1: Add the Node Type

Add your node type to the `WorkflowNodeType` union in `execution.types.ts`:

```typescript
export type WorkflowNodeType =
  | 'text'
  | 'image'
  // ... existing types ...
  | 'your_node_type'  // Add here
```

Add the corresponding canvas type in `libs/features/workflows/src/lib/components/WorkflowCanvasNode.tsx`:

```typescript
node_type?:
  | 'lens'
  | 'image_generate'
  // ... existing types ...
  | 'your_node_type'  // Add here
```

## Step 2: Implement the Runner

Create `libs/infra/execution/src/lib/runners/your-node.runner.ts`:

```typescript
import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class YourNodeRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'your_node_type'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // Access upstream outputs
    const upstream = ctx.upstreamOutputs.get('source-node-id')

    // Access per-node config from the canvas
    const myOption = ctx.nodeConfig['myOption'] as string

    // Access workflow-scoped variables
    const globalVar = ctx.resolvedParams['someVar']

    // Return result
    return {
      output: {
        mediaType: 'text',
        text: 'Result text',
        data: { /* structured output */ },
        durationMs: 0,
      },
      // Optional: mutate workflow-scoped variables for downstream nodes
      variableMutations: { newVar: 'value' },
    }
  }
}
```

### NodeRunnerContext Fields

| Field | Type | Description |
|-------|------|-------------|
| `nodeId` | `string` | Unique node ID within the run |
| `upstreamOutputs` | `ReadonlyMap<string, ExecutionResult>` | Outputs from completed upstream nodes |
| `resolvedParams` | `Record<string, unknown>` | Workflow-scoped variables (root inputs + accumulated mutations) |
| `nodeConfig` | `Record<string, unknown>` | Per-node config from the canvas UI |
| `signal` | `AbortSignal?` | Cooperative cancellation signal |

### NodeRunnerResult Fields

| Field | Type | Description |
|-------|------|-------------|
| `output` | `ExecutionResult` | Standard result — wrapped in NodeOutputEnvelope by engine |
| `variableMutations` | `Record<string, unknown>?` | Optional: merged into resolvedParams for all downstream nodes |

## Step 3: Register and Export

Add to `runners/index.ts`:

```typescript
export { YourNodeRunner } from './your-node.runner'
```

Add to `libs/infra/execution/src/index.ts`:

```typescript
export { ..., YourNodeRunner } from './lib/runners'
```

## Step 4: Write Tests

Create `your-node.runner.spec.ts` alongside your runner. Every runner must test:

1. **Node type declaration** — `expect(runner.nodeType).toBe('your_node_type')`
2. **Happy path** — valid config produces expected output
3. **Missing config** — graceful error when config is absent
4. **Edge cases** — empty upstream, invalid data shapes
5. **Security** — no prototype pollution, no injection vectors
6. **AbortSignal** (if your runner does async work)

Run tests:

```bash
pnpm nx test infra-execution --testPathPattern="your-node.runner.spec" --no-coverage
```

## Step 5: Security Checklist

Before submitting your PR, verify:

- [ ] No `eval()`, `Function()` (except CodeNodeRunner which has special sandboxing)
- [ ] No access to `process`, `globalThis`, `require`, `import()`
- [ ] Input paths reject `__proto__`, `constructor`, `prototype` segments
- [ ] If iterating arrays, enforce a `maxItems` cap (default: 1000)
- [ ] If accepting user strings, validate length (max 10,000 chars)
- [ ] If doing async work, respect `ctx.signal` for cancellation
- [ ] Output is JSON-serializable (no functions, symbols, circular refs)
- [ ] No network access unless the node's purpose requires it (and it's explicitly documented)

## Step 6: Add Canvas UI Support (Optional)

To make your node appear in the workflow builder:

1. Add an icon and color mapping in `WorkflowCanvasNode.tsx`
2. Add a config form in `WorkflowNodeConfigPanel.tsx`
3. Add the node to the "Add node" menu in `WorkflowBuilderPage.tsx`

## Existing Runners as Reference

| Runner | Complexity | Good example for... |
|--------|-----------|---------------------|
| `SetVariablesRunner` | Simple | Variable mutations, no provider call |
| `JsonTransformRunner` | Simple | Safe path traversal, data extraction |
| `SwitchRunner` | Medium | Conditional logic, routing metadata |
| `WaitDelayRunner` | Medium | Async behavior, AbortSignal handling |
| `ErrorCatchRunner` | Simple | Engine integration metadata (`__error_*`) |
| `LoopMapRunner` | Medium | Array processing, safety caps |
| `CodeNodeRunner` | Complex | Sandboxed execution, security validation |
| `SubWorkflowRunner` | Medium | Delegation pattern, depth limiting |

## Design Principles

1. **Idempotent** — runners may be retried; same input must produce same output
2. **Zero side effects** — don't mutate global state; use `variableMutations` for scoped changes
3. **Fail gracefully** — return error in `output.data.error`, don't throw unhandled exceptions
4. **No provider calls** (unless your node wraps an external service — document it clearly)
5. **Report `durationMs`** — 0 for instant operations, actual time for network/computation

## PR Checklist

- [ ] Type added to `WorkflowNodeType` union
- [ ] Runner implements `INodeRunner`
- [ ] Registered in `runners/index.ts`
- [ ] Exported from `libs/infra/execution/src/index.ts`
- [ ] Unit tests covering: happy path, missing config, edge cases, security
- [ ] All existing tests still pass: `pnpm nx test infra-execution --no-coverage`
- [ ] JSDoc comment on runner class explaining config schema and security model
