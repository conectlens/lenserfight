---
title: Contract Schema Reference
description: JSONB shapes stored on lenses.versions.input_contract and output_contract, plus the NodeOutputEnvelope every provider must return.
---

# Contract Schema Reference

> **Authoritative since:** migration `20260417140000_lens_output_contract.sql`.
> **Owners:** `libs/types/src/lib/contracts.types.ts`, `libs/infra/execution/src/lib/contract-validator.ts`.

This document describes the exact JSONB shapes stored in the database, the TypeScript types that mirror them, and the runtime validation rules enforced by the workflow engine.

---

## At a glance

| Layer | File | Responsibility |
|-------|------|----------------|
| Storage | `lenses.versions.input_contract` / `output_contract` (JSONB) | Persist contract per lens version |
| RPC | `public.fn_get_version_contracts(p_version_id uuid)` | Return `{ input_contract, output_contract }` for the browser executor |
| Types | [`libs/types/src/lib/contracts.types.ts`](../../../libs/types/src/lib/contracts.types.ts) | `LensInputContract`, `LensOutputContract`, `NodeOutputEnvelope`, `ContractFieldSchema` |
| Validator | [`libs/infra/execution/src/lib/contract-validator.ts`](../../../libs/infra/execution/src/lib/contract-validator.ts) | `validateInputs()`, `validateOutput()` |
| Tests | [`contract-validator.spec.ts`](../../../libs/infra/execution/src/lib/contract-validator.spec.ts) | Exercises Test Plan §2 |

---

## `LensInputContract`

Describes the structural constraints on the map of rendered inputs the engine hands to the provider.

```jsonc
{
  "kind": "text",          // Required. One of the LensKind values.
  "fields": {              // Required. Keyed by placeholder label.
    "topic": {
      "type": "string",
      "required": true,
      "minLength": 3,
      "maxLength": 300
    },
    "tone": {
      "type": "string",
      "enum": ["neutral", "playful", "clinical"]
    },
    "wordCount": {
      "type": "integer",
      "min": 50,
      "max": 2000
    }
  },
  "requireAnyOf": [         // Optional. Each inner array is an OR group.
    ["sourceUrl", "sourceText"]
  ],
  "strict": false           // Optional. When true, unknown fields are errors.
}
```

### `ContractFieldSchema`

| Field | Type | Applies to | Meaning |
|-------|------|------------|---------|
| `type` | `string` \| `number` \| `integer` \| `boolean` \| `url` \| `json` \| `array` \| `any` | all | Base type. `any` skips type checks. |
| `required` | `boolean` | all | Absence raises `missing_required`. |
| `description` | `string` | all | Human-readable; not enforced. |
| `minLength` / `maxLength` | `number` | `string`, `url` | Inclusive bounds on string length. |
| `pattern` | `string` | `string`, `url` | JavaScript regex. Malformed patterns → `pattern_mismatch`. |
| `min` / `max` | `number` | `number`, `integer` | Inclusive bounds on value. |
| `itemType` | `ContractFieldType` | `array` | When set, every element is checked against `{ type: itemType }`. |
| `enum` | `string[]` | all scalar | Value is stringified and matched against the list. |

### Validation behaviour

`validateInputs()` returns `{ ok, errors[] }`. Each error is:

```ts
{ field: string, reason: ContractError, details?: string }
```

Where `reason` is one of:

`missing_required`, `type_mismatch`, `below_min`, `above_max`, `too_short`, `too_long`, `pattern_mismatch`, `enum_mismatch`, `unknown_field`, `invalid_envelope`.

Validation is **fail-fast per field** for type issues, then permissive for shape issues (`strict`, `requireAnyOf`). The engine invokes it **before** the provider call — on failure, the node is marked `failed` with `error = 'input_contract_violation'` and the provider is NOT called.

---

## `LensOutputContract`

Describes what the lens guarantees on success. Consumed by downstream nodes through the engine's post-call validator.

```jsonc
{
  "kind": "pdf",                 // Required.
  "artifactKind": "pdf",         // Required.
  "outputType": "pdf-export",    // Optional — surfaced as execution.artifacts.output_type.
  "schema": {
    "pageCount": { "type": "integer", "required": true, "min": 1 }
  },
  "tokens": ["output", "pageCount"], // Optional — pass-through keys exposed to downstream nodes.
  "containsSensitive": false         // Optional — UI hint for PII-handling.
}
```

### Validation behaviour

`validateOutput(envelope, contract)` runs post-provider and checks:

1. Envelope is non-null.
2. `kind`, `artifactKind`, `output` are all present. `output` MUST be a string (the canonical stringified projection).
3. If a contract is supplied, `envelope.kind === contract.kind` and `envelope.artifactKind === contract.artifactKind`.
4. Each `contract.schema[key]` is checked against `envelope.data[key]` using the same `ContractFieldSchema` rules above.

Unknown keys on `envelope.data` are **allowed** — contracts are additive, not closed. Set `strict: true` on an input contract if you want to reject unknown inputs; there is intentionally no output-side `strict` because downstream nodes only read the keys they declare.

Failures are surfaced as node status `failed`, `error = 'output_contract_violation'`, with `outputData.contractErrors` populated.

---

## `NodeOutputEnvelope`

The runtime object every `IExecutionProvider` must return (wrapped into `ExecutionResult`, promoted by the engine):

```ts
interface NodeOutputEnvelope {
  kind: LensKind
  artifactKind: ArtifactKind
  output: string                               // canonical string projection
  data?: Record<string, unknown>               // structured fields matching LensOutputContract.schema
  media?: {
    url: string
    mime?: string | null
    width?: number | null
    height?: number | null
    durationS?: number | null
    bytes?: number | null
  } | null
  metadata?: Record<string, unknown>           // provider metadata (model, latency, tokens)
}
```

### Token projection

When a downstream edge references `source_output_key = 'foo'`, the engine looks up the value in this order:

1. `envelope.data.foo`
2. `envelope.metadata.foo`
3. `envelope.foo` (for `output`, `kind`, `artifactKind` only)

If none match, the edge delivers an empty string and the downstream `input_contract` decides whether that's fatal.

### Media objects

When `media.url` starts with `blob:` or `data:`, the browser executor uploads the bytes via
[`persistNodeMediaArtifact`](../../../libs/features/workflows/src/lib/execution/persistNodeMedia.ts) to Supabase Storage + `media.objects`, then rewrites `workflow_node_results.output_data.media` with the persisted `{ objectId, bucket, objectKey, mime, bytes }`. See [Execution Engine Reference](./execution-engine.md#pdf-artifacts).

---

## Inherited defaults

When `input_contract` or `output_contract` is NULL on a version, the engine resolves the default by looking up the lens's `kind:*` tag in [`LENS_KIND_REGISTRY`](../../../libs/features/lens-kinds/src/lib/lens-kinds.registry.ts). This keeps older lenses compatible after the Phase 1 migration without requiring a backfill.

`scripts/backfill-lens-contracts.mjs` performs the one-time migration of existing versions from `version_parameters` + tags to explicit contracts. Run it once after adopting a new kind or when a default contract shape changes.

---

## Examples by kind

### `kind:text`

```jsonc
// input_contract
{
  "kind": "text",
  "fields": {
    "topic": { "type": "string", "required": true, "minLength": 3 }
  }
}

// output_contract
{
  "kind": "text",
  "artifactKind": "text",
  "schema": {},
  "tokens": ["output"]
}
```

### `kind:research`

```jsonc
// output_contract
{
  "kind": "research",
  "artifactKind": "text",
  "schema": {
    "findings":       { "type": "array", "itemType": "json", "required": true },
    "summary":        { "type": "string", "required": true, "minLength": 40 },
    "open_questions": { "type": "array", "itemType": "string" }
  },
  "tokens": ["output", "findings", "summary"]
}
```

### `kind:pdf`

```jsonc
// input_contract
{
  "kind": "pdf",
  "fields": {
    "manifest": { "type": "json", "required": true }
  }
}

// output_contract
{
  "kind": "pdf",
  "artifactKind": "pdf",
  "outputType": "pdf-export",
  "schema": {
    "pageCount": { "type": "integer", "required": true, "min": 1 }
  }
}
```

---

## Versioning

Contracts are pinned to a lens **version**, not the lens itself. Publishing a new version with a tighter contract never retroactively invalidates existing workflow nodes — they continue pointing at the `version_id` they were saved with. To opt into the new contract, the workflow editor re-pins the node to the latest version.

## Related

- [Open Source Workflows](../../explanation/workflows/open-source-workflows.md)
- [Execution Engine Reference](./execution-engine.md)
- [Test Plan](./test-plan.md)
- [Create a Lens Kind](../../how-to/workflows/create-a-lens-kind.md)
- [Build a Lens Chain](../../how-to/workflows/build-a-lens-chain.md)
