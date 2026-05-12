# CapabilityMapper

`libs/providers/src/lib/capability-mapper.ts`

## Purpose

`CapabilityMapper` validates that a set of messages (including resource attachments) is compatible with a model's declared input/output capabilities **before** dispatching to a provider. It is the TypeScript-layer guard between the unified `ProviderMessage[]` format and per-provider wire formats.

## Why TypeScript, not the database

The database stores `ai.models.input_modalities text[]` and `output_modalities text[]` as the source of truth. But validation happens in TypeScript because:

1. **Feedback loop**: Validation errors must reach the UI or CLI immediately — before any API call. A DB CHECK constraint can't do this.
2. **No round-trip cost**: The validation is pure logic on already-fetched data.
3. **Type safety**: TypeScript's type system enforces `ContentPart` union exhaustiveness.

## Usage

```typescript
import { capabilityMapper } from '@lenserfight/providers'

const errors = capabilityMapper.validate(messages, {
  inputModalities: model.input_modalities,
  outputModalities: model.output_modalities,
  supportsTools: false,
  supportsJsonSchema: false,
  supportsStreaming: true,
})

if (errors.length > 0) {
  // Surface errors to UI — do NOT dispatch
}
```

## Provider capability matrix

| Provider | Text in | Image in | Document in | Audio in | Video in | Text out | Image out | Video out |
|----------|---------|----------|-------------|---------|---------|---------|-----------|-----------|
| OpenAI (gpt-4o) | ✓ | ✓ | — | — | — | ✓ | — | — |
| Anthropic (Claude) | ✓ | ✓ | ✓ | — | — | ✓ | — | — |
| Google (Gemini) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mistral | ✓ | ✓ | — | — | — | ✓ | — | — |
| Ollama | ✓ | ✓ (base64) | — | — | — | ✓ | — | — |
| FAL | — | — | — | — | — | — | ✓ (Flux) | ✓ |

These values are stored as `input_modalities` / `output_modalities` TEXT[] on `ai.models`. Backfilled by migration 45 from existing `supports_vision` boolean.

## Adding a new provider

1. Create `libs/providers/src/lib/<provider>.ts` implementing `ProviderAdapter` (and optionally `StreamingProviderAdapter`).
2. Map `ContentPart` types to the provider's wire format in `transformRequest`.
3. Register in `libs/providers/src/index.ts` under `ADAPTERS` / `STREAM_ADAPTERS`.
4. Add the provider's model rows to `ai.models` with correct `input_modalities` / `output_modalities`.
5. No changes to `CapabilityMapper` needed — it reads from `model.inputModalities[]`.

## ContentPart indirection layer

The `ContentPart` union (`libs/providers/src/lib/types.ts`) is the abstraction between callers and per-provider wire formats:

```typescript
type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; mimeType?: string; detail?: 'low' | 'high' }
  | { type: 'document'; url: string; mimeType: string; name?: string }
  | { type: 'audio'; url: string; mimeType: string }
  | { type: 'video'; url: string; mimeType: string }
```

Each provider adapter maps this to its own format:
- **OpenAI**: `image_url` content block
- **Anthropic**: `image` / `document` source block
- **Gemini**: `fileData` inline part
- **Ollama**: `images: [base64]` sibling field (images only)

---

*Part of [Platform & API Reference](/en/reference/platform-api/api-overview)*
