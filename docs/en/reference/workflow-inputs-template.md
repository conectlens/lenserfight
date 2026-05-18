---
title: Workflow inputs template
description: How the inputs_template JSON object is shaped, how to discover the keys your workflow expects, and how scheduled runs hydrate root inputs from the template.
---

# Workflow inputs template

Every workflow has a set of **root inputs** — the data points the first nodes need before the pipeline can run. When a schedule fires (via CRON or an automation rule), there is no human typing these values, so the schedule carries an `inputs_template` that hydrates every dispatched run.

This page is the focused reference for the JSON shape. For end-to-end usage, see the [CRON Scheduling tutorial](/en/tutorials/agent-walkthroughs/cron-scheduling#step-4-provide-default-inputs).

---

## Shape

`inputs_template` is a **flat JSON object** keyed by the input names your workflow declares:

```json
{
  "topic": "AI news",
  "audience": "tech community",
  "tone": "conversational",
  "max_words": 280
}
```

Rules:

- The top-level value MUST be an object (`{}`). Arrays, strings, and `null` are rejected.
- Keys must match the input names declared on your workflow's root node(s). Unknown keys are stored but silently ignored at runtime.
- Values can be any JSON-compatible type: string, number, boolean, array, or nested object.
- An empty object (`{}`) is allowed and means "use whatever default each input declares on the node".

The server stores the template as `jsonb`. The default value if you omit it entirely is `{}`.

---

## Discovering your workflow's input keys

The fastest way to find the exact keys your workflow expects:

1. Open the workflow in the **Workflow editor**.
2. Inspect the **root node(s)** — the inputs they declare are the keys to use here.
3. Or run the workflow once manually and copy the `inputs` payload from the run record.

From the CLI:

```bash
lf workflow show <workflow-slug> --inputs
```

This prints the declared input names, types, and any default values.

---

## How values are merged at dispatch time

When a schedule fires, the dispatcher:

1. Loads `inputs_template` from the schedule row.
2. Creates a new `workflow_run` with that JSON as its `inputs`.
3. Each root node reads its declared key from `inputs`. Missing keys fall back to the node's own default.

If a key in the template doesn't match any declared input, it is preserved on the run for audit but does not influence execution.

---

## Examples

**A digest workflow that takes three text inputs:**

```json
{
  "topic": "developer productivity",
  "audience": "engineering managers",
  "tone": "concise"
}
```

**A summarizer with a list and numeric cap:**

```json
{
  "source_urls": [
    "https://example.com/post-1",
    "https://example.com/post-2"
  ],
  "max_summary_chars": 500
}
```

**A workflow with no required inputs:**

```json
{}
```

**A nested config payload (advanced — read by a custom node):**

```json
{
  "config": {
    "model": "gpt-4o-mini",
    "temperature": 0.4,
    "retries": 2
  }
}
```

---

## Validation

The schedule form rejects values that:

- are not valid JSON (unbalanced braces, trailing commas, single quotes),
- parse to a non-object root (`[]`, `"string"`, `42`, `null`, `true`),
- exceed the platform's `jsonb` size limit on the server (currently 1 MiB).

The server-side validation lives in [`fn_upsert_workflow_schedule`](/en/reference/database/rpc-reference).

---

## Related

- [CRON expressions reference](/en/reference/cron-expressions) — schedule timing syntax.
- [CRON Scheduling tutorial](/en/tutorials/agent-walkthroughs/cron-scheduling) — end-to-end walkthrough.
- [Workflow execution engine](/en/reference/workflows/execution-engine) — how `inputs` flow through node results.
