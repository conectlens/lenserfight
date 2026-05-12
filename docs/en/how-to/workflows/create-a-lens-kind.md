---
title: Create a Lens Kind
description: Add a new lens kind to the LenserFight workflow engine — from registry entry to execution provider and template.
---

# Create a Lens Kind

> **Prerequisites:** read [Open Source Workflows](../../explanation/workflows/open-source-workflows.md) and [Execution Engine Reference](../../reference/workflows/execution-engine.md) first.

A **Lens Kind** is the classifier that tells the workflow engine *what* a lens produces and *how* to execute it. The ships-with-Community set is:

| Kind | Purpose | Artifact |
|------|---------|----------|
| `text` | Prose / markdown generation | `text` |
| `image` | Visual generation from a brief | `image` |
| `video` | Storyboard → video | `video` |
| `research` | Retrieval + synthesis | `text` (findings envelope) |
| `pdf` | Export structured content to a PDF document | `pdf` |
| `transform` | Shape-change (e.g. text → image prompt) | `text` |
| `orchestration` | Planning / decomposition | `text` (JSON plan) |
| `validation` | Correctness and schema checks | `text` (JSON result) |
| `routing` | Choose-your-branch logic | `text` (chosen route) |

You only need a **new** kind when an existing one genuinely cannot describe your lens's output. Most custom lenses are better modelled as a new **template** under an existing kind — see [Build a Lens Chain](./build-a-lens-chain.md).

---

## Decision check

Add a new kind ONLY when all three are true:

1. **Distinct artifact shape.** Downstream nodes need to consume fields no existing kind guarantees (e.g. `3d-model`, `audio-stems`, `code-patch`).
2. **Distinct execution path.** The provider cannot be expressed as one of the existing registered providers plus a prompt change.
3. **Distinct validation rules.** The existing `output_contract` schema cannot capture your lens's guarantees (the `ContractFieldSchema` surface is intentionally small — see [Contract Schema Reference](../../reference/workflows/contract-schema.md)).

If ≥ 1 is false, prefer a new template under an existing kind.

---

## Step-by-step

### 1. Extend the `LensKind` union

File: [`libs/types/src/lib/contracts.types.ts`](../../../libs/types/src/lib/contracts.types.ts)

```ts
export type LensKind =
  | 'text'
  | 'image'
  | 'video'
  | 'research'
  | 'pdf'
  | 'transform'
  | 'orchestration'
  | 'validation'
  | 'routing'
  | 'audio' // ← your new kind
```

Also extend `ArtifactKind` in [`execution.types.ts`](../../../libs/types/src/lib/execution.types.ts) if the existing set cannot describe the output.

### 2. Register it in the lens-kind registry

File: [`libs/features/lens-kinds/src/lib/lens-kinds.registry.ts`](../../../libs/features/lens-kinds/src/lib/lens-kinds.registry.ts)

Add an entry with `label`, `description`, `artifactKind`, `tagSlug`, and a Lucide icon. The `tagSlug` is what appears in `content.tag_map` (e.g. `kind-audio`) and is what `resolveLensKindFromTagSlugs()` matches on.

### 3. Declare the default output contract

Still in the registry, attach a `defaultOutputContract: LensOutputContract` so lenses of your kind can omit an explicit `output_contract` and inherit sensible defaults:

```ts
audio: {
  kind: 'audio',
  label: 'Audio',
  description: 'Generates audio clips from a structured brief.',
  artifactKind: 'audio',
  tagSlug: 'kind-audio',
  icon: Volume2,
  defaultOutputContract: {
    kind: 'audio',
    artifactKind: 'audio',
    schema: {
      durationS: { type: 'number', required: true, min: 0 },
    },
    tokens: ['output'],
  },
},
```

### 4. (Optional) Write a dedicated execution provider

If the kind has no fit in an existing provider, create `libs/infra/execution/src/lib/providers/<kind>.provider.ts` following the [`PdfExportProvider`](../../../libs/infra/execution/src/lib/providers/pdf-export.provider.ts) / [`ResearchProvider`](../../../libs/infra/execution/src/lib/providers/research.provider.ts) patterns:

```ts
export class AudioGenProvider implements IExecutionProvider {
  readonly id = 'audio-gen'
  readonly supportedMediaTypes: MediaType[] = ['audio']

  async execute(modelId: string, input: ExecutionInput, signal?: AbortSignal): Promise<ExecutionResult> {
    // 1. Call your audio backend (respect signal)
    // 2. Return { mediaType:'audio', url, mimeType, bytes, durationMs, data, metadata }
  }
}
```

Register it under a stable key in [`execution.registry.ts`](../../../libs/infra/execution/src/lib/execution.registry.ts).

### 5. Update the contract validator

`validateOutput()` in [`contract-validator.ts`](../../../libs/infra/execution/src/lib/contract-validator.ts) is kind-agnostic *because* every contract carries a `kind` + `artifactKind`. Add a spec case mirroring the shape of the existing `kind:pdf` suite in [`contract-validator.spec.ts`](../../../libs/infra/execution/src/lib/contract-validator.spec.ts).

### 6. Seed a template lens

Add an `INSERT` into `supabase/seeds/40_lens_chain_templates.sql` with:

- A stable UUID (convention: `fff80000-0000-0000-0000-<kind>NN`).
- `kind-<your-kind>` + `template` tags.
- A versioned prompt that respects the input/output contract.

### 7. Document the new kind

- Add a row to the registry table in [`open-source-workflows.md`](../../explanation/workflows/open-source-workflows.md).
- Add a row to section 10 (Kind-Specific Providers) in [`test-plan.md`](../../reference/workflows/test-plan.md).
- Update this how-to with any lessons learned.

### 8. Verify

```bash
npx nx eslint:lint feature-lens-kinds infra-execution types
npx nx test infra-execution
```

Smoke-test in the workflow builder by creating a lens with your new kind and chaining it into a template workflow.

---

## Anti-patterns

- ❌ Using a new kind for a one-off template. Use `content.tag_map` + a custom template instead.
- ❌ Sharing execution code between two kinds by branching on `input.params.kind`. Give each kind its own provider class.
- ❌ Leaving `defaultOutputContract` null. Downstream nodes lose contract validation and you pay it back in flaky tests.
- ❌ Declaring a kind before you have at least one production lens that needs it.

## Related

- [Contract Schema Reference](../../reference/workflows/contract-schema.md)
- [Build a Lens Chain](./build-a-lens-chain.md)
- [Execution Engine Reference](../../reference/workflows/execution-engine.md)
- [Workflow Test Plan](../../reference/workflows/test-plan.md)
