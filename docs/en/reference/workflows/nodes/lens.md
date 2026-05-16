---
title: Lens Node | Workflow Node Reference
description: Reference for the Lens node in LenserFight Workflow Studio. Execute a LenserFight lens prompt with model, funding, and parameter overrides.
---

# Lens Node {#lens}

**Type:** `lens` · **Category:** Lens

Execute a LenserFight lens prompt with model, funding, and parameter overrides. The Lens node is the core AI execution unit — it takes text input, runs it through a selected lens prompt with a configured model, and returns generated text.

---

## When to Use

Use the Lens node when you want to run a specific lens (a versioned prompt template) as a workflow step. Lens nodes are ideal for:

- Generating summaries, reports, or analyses from upstream data
- Running AI evaluation or judgement with a crafted rubric prompt
- Applying domain-specific transformations using your own published lenses
- Chaining multiple lens executions in sequence or parallel

---

## Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `text` | Yes | Text from an upstream node (e.g. a JSON transform, RAG retriever, or prompt template). |

Also accepts `json` and `object` inputs.

---

## Outputs

| Name | Type | Shape |
|------|------|-------|
| `text` | `text` | `{ text: text, modelId: text }` |

---

## Required Config

| Field | Type | Description |
|-------|------|-------------|
| `model_id` | `string` | AI model key to use (e.g. `openai:gpt-4.1-mini`, `anthropic:claude-3-7-sonnet`). |

---

## Optional Config

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `param_overrides` | `json` | — | Lens parameter overrides — key/value pairs injected into the lens template variables. |
| `funding_source` | `select` | `platform_credit` | `platform_credit` · `user_byok_cloud` · `user_byok_local` |

---

## Example

```json
{
  "model_id": "openai:gpt-4.1-mini",
  "funding_source": "platform_credit",
  "param_overrides": { "tone": "concise" }
}
```

**Scenario:** Generate the weekly arena digest from aggregated battle data.

**Expected input:** `"Summarize this week of arena results."`

**Expected output:** `"Weekly digest with top contenders, outliers, and recommended rematches."`

**Downstream:** → `email_send` with `{ "body": "$.text" }`

---

## Valid Connections

→ `email_send`, `slack_notify`, `discord_notify` — for delivery of generated text

→ `output_parser` — to extract structured fields from generated JSON

→ `judge_evaluator` — to evaluate lens outputs against a rubric

→ `memory_write` — to persist generated content

→ `logger` — to audit lens output

---

## Invalid Connections

✗ Cannot be the source for another Lens node's `text` input unless the upstream text is reformatted — Lens output is plain text, not structured JSON.

✗ Cannot connect directly to `embedding` without routing through `text_splitter` first for long outputs.

---

## Execution Notes

- Lens nodes always run through the versioned lens execution engine — parameter overrides are layered on top of the lens's published defaults.
- The `model_id` must be available for the chosen `funding_source`. Local gateway models require `user_byok_local`.
- Token limits are enforced per model. For long inputs, use `text_splitter` → `embedding` → `rag_retrieval` before the Lens node.

---

## Troubleshooting

- **"Model not available"** — verify that `model_id` is in scope for your workspace's enabled providers.
- **"Parameter override not applied"** — check that `param_overrides` keys match the lens template variable names exactly (case-sensitive).
- **"Empty output"** — the upstream `text` input may be empty; add a `logger` or `debug_inspector` node before the Lens node to inspect the payload.

---

**See also:** [AI Primitives — Lens Execute](./ai-primitives#lens-execute) · [Node Catalog Index](./) · [Workflow Studio](/en/how-to/agents/workspace/workflows) · [Execution Engine](/en/reference/workflows/execution-engine)
