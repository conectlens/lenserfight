---
title: Workflow Import Protocol
description: Reference for the portable JSON and YAML workflow document — fields, step kinds, connections, lens definitions, scheduling, and validation rules.
---

# Workflow Import Protocol

The workflow import protocol is the portable description of a workflow. It is what the **Workflow Instructions** button asks an AI model to produce, what the import dialog accepts, and what workflow export emits.

One schema backs all of those. The instructions are generated from it and from the live node catalog, so the prompt cannot describe a document the importer would reject.

Use this format to move a workflow between accounts, keep it in git, or have a model design one for you. It is not a database dump: it carries no identifiers, no timestamps, no credentials, and no visibility.

## Document shape

```json
{
  "protocol": "lenserfight.workflow/v1",
  "title": "Topic to video",
  "description": "Turns a topic into a short video.",
  "outcome": "A playable video plus the prompt used.",
  "schedule": { "cron": "0 9 * * 1", "isActive": false },
  "lenses": [
    {
      "ref": "topic-to-image",
      "title": "Topic to Image Prompt",
      "instructions": "Render one cinematic scene for [[Topic]].",
      "parameters": [{ "label": "Topic", "required": true }],
      "outputs": ["image"]
    }
  ],
  "steps": [
    {
      "step": 1,
      "kind": "trigger",
      "nodeType": "form_input_trigger",
      "name": "Form Input Trigger",
      "outputs": ["formData"]
    },
    {
      "step": 2,
      "kind": "lens",
      "name": "Topic to Image Prompt",
      "lensRef": "topic-to-image",
      "parameters": { "Visual Style": "Cinematic" },
      "outputs": ["image"]
    }
  ],
  "connections": [{ "from": "step-1.formData", "to": "step-2.Topic" }],
  "userInputs": ["Topic"],
  "validation": ["Topic must not be empty."],
  "finalOutput": "A generated image and the prompt used."
}
```

The same document in YAML is accepted and produces an identical workflow.

### Top-level fields

| Field | Required | Notes |
|---|---|---|
| `protocol` | yes | Always `lenserfight.workflow/v1`. Documents without it are read as v1 with a warning. |
| `title` | yes | 3–120 characters. |
| `description` | no | Wizard step 1 description. |
| `outcome` | no | One sentence describing the end result. |
| `schedule` | no | See [Scheduling](#scheduling). |
| `lenses` | no | Reusable Lens definitions. |
| `steps` | yes | At least one. |
| `connections` | yes | May be empty. |
| `userInputs`, `validation`, `finalOutput` | no | Human-readable notes. |

Unknown top-level fields are rejected rather than ignored, so a typo surfaces instead of silently dropping configuration.

## Step kinds

Every step has a unique `step` number, a `kind`, and a `name`. Include `nodeType` when you know it — it removes any ambiguity, and export always writes it.

| Kind | Purpose |
|---|---|
| `trigger` | Starts the workflow. One step must be a trigger. |
| `lens` | Prompt-driven AI work. Binds to a Lens definition via `lensRef`. |
| `logic` | Branching, looping, merging, flow control. |
| `tool` | Deterministic work — data, storage, HTTP, notifications, media, integrations. |

`name` is resolved against the live node palette by display name, canonical type, or alias. A name that matches nothing is an error: the importer will not substitute a no-op for a node it cannot find.

For the full list of node types, see the [Workflow Node Catalog](./workflow-node-catalog.md).

## Lens definitions and Lens steps

A Lens **definition** is reusable and lives in `lenses`. A Lens **step** is one placement of that definition inside a workflow.

- The definition carries the prompt, the parameter list, and the declared outputs.
- The step carries the values used by that particular workflow.
- The two are linked by `ref` / `lensRef`, never by title.

### Reuse and conflict policy

On import, each definition resolves as follows:

1. If you already own a lens whose title **and** parameters match, it is reused unchanged.
2. Otherwise a new private lens is created.

An import never modifies a lens you already own. If you own a lens with the same title but different parameters, a separate lens is created and the import warns you — your original is left alone.

## Connections

```json
{ "from": "step-1.formData", "to": "step-2.Topic" }
```

- `from` is `step-<n>.<outputKey>`.
- `to` is `step-<n>.<parameterLabel>`. Labels may contain spaces.
- Connections must run forward: the source step number must be lower than the target.
- A parameter that is both connected and given a literal value produces a warning — the connection wins at run time and the literal is dead configuration.

Output keys are checked against the node catalog, but a mismatch is a **warning**, not an error. Some runners emit keys that differ from their catalogued names, so blocking on that would reject workflows that run correctly.

## Scheduling

```json
"schedule": { "cron": "0 9 * * 1", "isActive": false }
```

`cron` must be a standard 5-field expression (minute hour day month weekday). Sub-minute schedules are not supported — the dispatcher matches at minute granularity.

**Imported schedules are always created paused.** A document cannot start firing jobs on your account by asserting `isActive: true`; the import dialog offers a checkbox and you decide. This is the authoritative location for scheduling — a trigger node's own configuration does not schedule anything.

## What is never in the document

The protocol deliberately excludes anything that is account-, environment-, or instance-specific:

- `visibility` — chosen in the wizard, not carried by the document
- database identifiers, user and tenant identifiers, timestamps
- canvas positions and selection state
- credentials, API keys, provider tokens, funding configuration

If these appear in a pasted document they are stripped with a warning rather than rejected, since a model echoing them back is a predictable mistake.

Canvas layout is regenerated on every import from the dependency graph, so it is never round-tripped.

## Validation stages

Failures are reported by stage so the message points at the actual problem:

| Stage | Meaning |
|---|---|
| `parse` | The text is not valid JSON or YAML. |
| `structure` | Valid syntax, but not a well-formed protocol document. |
| `semantic` | Well-formed, but describes an impossible workflow — unknown node, dangling connection, no trigger, cycle. |
| `persistence` | Validation passed but the write failed. |

Everything that can be checked without writing is checked first, so an invalid document never reaches the database.

## Atomicity

An import either produces a complete workflow or leaves nothing behind. Because no client-reachable transaction spans lenses, workflows, nodes, edges, and schedules, this is achieved by validating up front and compensating on failure: any error after the first write deletes exactly what that import created. Lenses that were reused rather than created are never deleted.

## CSV is not supported

Workflows have nested Lens definitions, per-step parameter maps, and a connection graph. Flattening that into rows loses all three, so CSV import is not offered for workflows. Use JSON or YAML.

CSV import remains available for Lens parameters, where the data genuinely is a flat row.

## Round-tripping

Export produces a document that imports back into an equivalent workflow. JSON and YAML exports of the same workflow describe the same graph, and output is deterministic — the same workflow always serialises to identical bytes, so exports can be diffed and committed.

## See also

- [Workflow Node Catalog](./workflow-node-catalog.md) — every node type and its outputs
- [Workflow Export Format](./workflow-export-format.md) — the Markdown execution specification
- [Export a workflow](../../how-to/workflows/export-a-workflow.md)
