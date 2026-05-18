---
title: Logic Nodes | Workflow Node Reference
description: Reference for all Logic nodes in LenserFight Workflow Studio — branching, looping, error handling, and sub-workflow orchestration.
---

# Logic Nodes

Logic nodes control execution flow — branching, looping, waiting, error handling, batching, and sub-workflow delegation. Use them to build conditional automation, fan-out pipelines, and resilient recovery paths.

| Node | Type | Output |
|------|------|--------|
| [Code](#code) | `code` | `json` |
| [Switch](#switch) | `switch` | `text` |
| [If / Condition](#if-condition) | `if_condition` | `boolean` |
| [Loop / Map](#loop-map) | `loop_map` | `array` |
| [Wait / Delay](#wait-delay) | `wait_delay` | `json` |
| [Error Catch](#error-catch) | `error_catch` | `json` |
| [Try / Catch](#try-catch) | `try_catch` | `json` |
| [Merge](#merge) | `merge` | `json` |
| [Split In Batches](#split-in-batches) | `split_in_batches` | `array` |
| [Sub-Workflow](#sub-workflow) | `sub_workflow` | `workflow_result` |
| [Stop / Return](#stop-return) | `stop_return` | `workflow_result` |

---

## Code {#code}

**Type:** `code` · **Category:** Logic

Execute sandboxed JavaScript or TypeScript against upstream data. Returns a JSON-compatible value.

### When to Use

Use Code when no built-in node handles your exact transformation, calculation, or routing logic. Ideal for: custom aggregations, multi-field transforms, regex extraction, business rule logic.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `input` | `any` | No |

### Outputs

| Name | Type | Description |
|------|------|-------------|
| `result` | `json` | Return value of the code function. |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `code` | `template` | Code body. Must return a JSON-compatible value. The upstream payload is available as `input`. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `timeoutMs` | `number` | `5000` |

### Example

```json
{
  "code": "return { digestText: input.summary, itemCount: input.items.length };",
  "timeoutMs": 5000
}
```

**Downstream:** → `email_send` with `{ "body": "$.result.digestText" }`

### Troubleshooting

- **"Execution timeout"** — reduce `timeoutMs` or simplify the code.
- **"Return value is not JSON"** — avoid returning `undefined`, `Date`, or class instances.

### Related Nodes

[JSON Transform](./data#json-transform) · [Switch](#switch) · [Data Mapper](./data#data-mapper)

---

## Switch {#switch}

**Type:** `switch` · **Category:** Logic

Route execution by matching configured cases. Evaluates a path on the input and emits the matching branch label.

### Inputs

| Name | Type |
|------|------|
| `input` | `any` |

### Outputs

| Name | Type | Description |
|------|------|-------------|
| `result` | `text` | Matched branch label. |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `cases` | `json` | Ordered branch cases: `[{ label, operator, value }]`. Operators: `equals`, `contains`, `gt`, `lt`, `regex`. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `inputPath` | `string` | — | Path to evaluate (e.g. `$.status`). |
| `defaultBranch` | `string` | — | Fallback branch label when no case matches. |

### Example

```json
{
  "inputPath": "$.status",
  "cases": [{ "label": "failed", "operator": "equals", "value": "failed" }],
  "defaultBranch": "ok"
}
```

**Downstream:** → `slack_notify` with `{ "text": "$.branch" }`

### Related Nodes

[If / Condition](#if-condition) · [Code](#code) · [Error Catch](#error-catch)

---

## If / Condition {#if-condition}

**Type:** `if_condition` · **Category:** Logic

Continue downstream when a boolean condition evaluates true. Drops the item when false.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `condition` | `template` | Boolean expression or path mapping (e.g. `$.score >= 0.8`). |

### Example

```json
{ "condition": "$.score >= 0.8" }
```

**Downstream:** → `leaderboard_update`

### Related Nodes

[Switch](#switch) · [Score Aggregator](./battle#score-aggregator)

---

## Loop / Map {#loop-map}

**Type:** `loop_map` · **Category:** Logic

Map over an array and emit transformed items. Each item in the array is processed by the downstream subgraph.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `items` | `array` | Yes |

### Outputs

| Name | Type |
|------|------|
| `items` | `array` |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `arrayPath` | `string` | `$.items` |
| `maxItems` | `number` | `100` |

### Example

```json
{
  "arrayPath": "$.documents",
  "itemVariable": "document",
  "maxItems": 25
}
```

**Downstream:** → `summarizer` with `{ "documents": "$.items" }`

### Troubleshooting

- **"Array is empty"** — check upstream filter or aggregate nodes.
- **"maxItems exceeded"** — increase `maxItems` or use `split_in_batches` before the loop.

### Related Nodes

[Split In Batches](#split-in-batches) · [Filter Items](./data#filter-items) · [Aggregate](./data#aggregate)

---

## Wait / Delay {#wait-delay}

**Type:** `wait_delay` · **Category:** Logic

Pause execution for a duration or until a timestamp. Useful for rate-limiting, scheduled resumption, or debouncing.

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `delayMs` | `number` | `5000` |
| `delayUntil` | `string` | — | ISO timestamp to resume at. |

### Example

```json
{ "delayMs": 300000 }
```

*(5-minute delay before checking a GitHub PR status.)*

**Downstream:** → `github_read`

### Related Nodes

[Schedule Trigger](./trigger#schedule-trigger) · [Retry](#retry)

---

## Error Catch {#error-catch}

**Type:** `error_catch` · **Category:** Logic

Handle an upstream error and route fallback data. Connect this node to the error output of a node that may fail.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `error` | `error` | Yes — error envelope from a failed node |

### Outputs

| Name | Type |
|------|------|
| `recovery` | `json` |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `fallbackValue` | `json` | — |
| `continueOnError` | `boolean` | `true` |

### Example

```json
{
  "fallbackValue": { "alert": "Workflow failed while summarizing RSS." },
  "continueOnError": true
}
```

**Downstream:** → `slack_notify` with `{ "text": "$.recovery.alert" }`

### Related Nodes

[Try / Catch](#try-catch) · [Retry](#retry) · [Logger](./utility#logger)

---

## Try / Catch {#try-catch}

**Type:** `try_catch` · **Category:** Logic

Run a protected branch and emit either the result or an error envelope. Unlike `error_catch`, Try / Catch wraps the protected subgraph inline.

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `catchBranch` | `string` | `catch` |

### Example

```json
{ "catchBranch": "notify_failure" }
```

**Expected output (on error):** `{ "ok": false, "error": { "message": "Provider timeout" } }`

**Downstream:** → `slack_notify` with `{ "text": "$.error.message" }`

### Related Nodes

[Error Catch](#error-catch) · [Stop / Return](#stop-return)

---

## Merge {#merge}

**Type:** `merge` · **Category:** Logic

Merge multiple upstream values into one payload. Use after parallel branches to consolidate results.

### Optional Config

| Field | Type | Default | Options |
|-------|------|---------|---------|
| `strategy` | `select` | `json_object` | `last_write_wins` · `concat` · `array` · `json_object` |

### Example

```json
{ "strategy": "json_object" }
```

**Expected output:** `{ "merged": { "digest": "...", "scores": [0.8, 0.9] } }`

**Downstream:** → `email_send` with `{ "body": "$.merged.digest" }`

### Related Nodes

[Split In Batches](#split-in-batches) · [Aggregate](./data#aggregate)

---

## Split In Batches {#split-in-batches}

**Type:** `split_in_batches` · **Category:** Logic

Split a large array into batches for downstream processing.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `items` | `array` | Yes |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `batchSize` | `number` | `25` |

### Example

```json
{ "batchSize": 10 }
```

**Downstream:** → `rss_feed` with `{ "urls": "$.batch" }`

### Related Nodes

[Loop / Map](#loop-map) · [Deduplicate](./data#deduplicate)

---

## Sub-Workflow {#sub-workflow}

**Type:** `sub_workflow` · **Category:** Logic

Execute another workflow with mapped inputs. Use for orchestrating modular workflows, reusable sub-pipelines, and hierarchical automation.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `workflowId` | `string` | Workflow id to invoke. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `inputMapping` | `json` | — |
| `maxDepth` | `number` | `2` |

### Example

```json
{
  "workflowId": "wf_weekly_digest",
  "inputMapping": { "topic": "$.topic", "window": "$.window" },
  "maxDepth": 2
}
```

**Expected output:** `{ "workflowResult": { "status": "completed", "output": "Digest ready" } }`

**Downstream:** → `email_send` with `{ "body": "$.workflowResult.output" }`

### Related Nodes

[Stop / Return](#stop-return) · [Code](#code)

---

## Stop / Return {#stop-return}

**Type:** `stop_return` · **Category:** Logic

Stop execution and return a final payload. Use to end a conditional branch early or mark a definitive workflow result.

### Optional Config

| Field | Type | Default | Options |
|-------|------|---------|---------|
| `returnPath` | `string` | `$` | — |
| `status` | `select` | `completed` | `completed` · `failed` |

### Example

```json
{ "returnPath": "$.answer", "status": "completed" }
```

**Downstream:** → `logger` (last node before termination)

### Related Nodes

[Sub-Workflow](#sub-workflow) · [Error Catch](#error-catch)

---

**See also:** [Node Catalog Index](./) · [Workflow Concepts](/en/explanation/workflows/workflow-concepts) · [Workflow Studio](/en/how-to/agents/workspace/workflows)
