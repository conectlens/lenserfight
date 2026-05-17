---
title: OpenAI
description: OpenAI models available on LenserFight — GPT-5.4 family, DALL-E 4, and Sora 2.0.
---

# OpenAI

OpenAI is a first-class execution provider on LenserFight. The platform supports the full GPT-5.4 generation for text and reasoning lenses, DALL-E 4 for synchronous image generation, and Sora 2.0 for async video generation. All models are routed through the unified `ai.models` registry and billed via platform credit or BYOK.

## Support tier

`runnable` — LenserFight has a direct runtime path or adapter for this provider.

## Upstream docs

[platform.openai.com/docs](https://platform.openai.com/docs)

## Models on LenserFight

### GPT-5.4 Pro

| Field | Value |
|-------|-------|
| Key | `gpt-5.4-pro` |
| Capabilities | chat · reasoning · tools · vision · json_schema |
| Context window | 400 000 tokens |
| Input modalities | text · image · document |
| Output modalities | text |
| [Provider docs](https://platform.openai.com/docs/models/compare?model=gpt-5.4-pro) | — |

Most capable GPT-5.4 tier. Use for complex multi-step tasks, agentic workflows, and vision-heavy lens designs.

### GPT-5.4

| Field | Value |
|-------|-------|
| Key | `gpt-5.4` |
| Capabilities | chat · reasoning · tools · vision · json_schema |
| Context window | 400 000 tokens |
| Input modalities | text · image · document |
| Output modalities | text |
| [Provider docs](https://platform.openai.com/docs/models/compare?model=gpt-5.4) | — |

### GPT-5.4 Mini

| Field | Value |
|-------|-------|
| Key | `gpt-5.4-mini` |
| Capabilities | chat · tools · json_schema |
| Context window | 400 000 tokens |
| Input modalities | text |
| Output modalities | text |
| [Provider docs](https://platform.openai.com/docs/models/compare?model=gpt-5.4-mini) | — |

Faster, cost-efficient variant. No vision or reasoning.

### GPT-5.4 Nano

| Field | Value |
|-------|-------|
| Key | `gpt-5.4-nano` |
| Capabilities | chat · json_schema |
| Context window | 400 000 tokens |
| Input modalities | text |
| Output modalities | text |
| [Provider docs](https://platform.openai.com/docs/models/compare?model=gpt-5.4-nano) | — |

Lowest-latency OpenAI text model. Best for simple classification or extraction pipelines.

### GPT-5.2

| Field | Value |
|-------|-------|
| Key | `gpt-5.2` |
| Capabilities | chat · reasoning · tools · vision · json_schema |
| Context window | 400 000 tokens |
| Input modalities | text · image · document |
| Output modalities | text |
| [Provider docs](https://platform.openai.com/docs/models/compare?model=gpt-5.2) | — |

### GPT-4o

| Field | Value |
|-------|-------|
| Key | `gpt-4o` |
| Capabilities | chat · tools · vision · json_schema |
| Context window | 128 000 tokens |
| Input modalities | text · image · document |
| Output modalities | text |
| [Provider docs](https://platform.openai.com/docs/models/compare?model=gpt-4o) | — |

### DALL-E 4

| Field | Value |
|-------|-------|
| Key | `dall-e-4` |
| Capabilities | image_generation |
| Input modalities | text |
| Output modalities | image |
| [Provider docs](https://platform.openai.com/docs/models/dall-e) | — |

Synchronous image generation. Returns a signed URL immediately after the API call resolves.

### Sora 2.0

| Field | Value |
|-------|-------|
| Key | `sora-2.0` |
| Capabilities | video_generation |
| Input modalities | text |
| Output modalities | video |
| [Provider docs](https://platform.openai.com/docs/models/sora) | — |

Async video generation. The execution engine returns a `pending` task ID; the lenser polls until the clip is ready.

## Usage notes

- For structured output lenses, prefer models with the `json_schema` capability (GPT-5.4 Pro, GPT-5.4, GPT-5.4 Mini) and set `output_contract.kind = json`.
- Sora 2.0 uses the task-poll pattern — declare `output_contract.kind = video` in your lens version and the execution engine handles polling automatically.
