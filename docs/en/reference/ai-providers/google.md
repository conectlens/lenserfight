---
title: Google
description: Google Gemini and generative media models available on LenserFight — Gemini 3.x/2.5 family, Imagen 4, Veo 3, and Lyria 2.
---

# Google

Google is a first-class execution provider on LenserFight. The platform supports the Gemini 3.x and 2.5 model families for text and vision tasks, Imagen 4 for synchronous image generation, Veo 3 for async cinematic video, and Lyria 2 for music synthesis. Google models offer the largest context windows in the default catalog (up to 2 million tokens).

## Support tier

`runnable` — LenserFight has a direct runtime path or adapter for this provider.

## Upstream docs

[ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs)

## Models on LenserFight

### Gemini 3.1 Pro Preview

| Field | Value |
|-------|-------|
| Key | `gemini-3.1-pro-preview` |
| Capabilities | chat · reasoning · tools · vision |
| Context window | 2 000 000 tokens |
| Input modalities | text · image · document |
| Output modalities | text |
| [Provider docs](https://ai.google.dev/gemini-api/docs/models) | — |

### Gemini 3 Pro Preview

| Field | Value |
|-------|-------|
| Key | `gemini-3-pro-preview` |
| Capabilities | chat · reasoning · tools · vision |
| Context window | 2 000 000 tokens |
| Input modalities | text · image · document |
| Output modalities | text |
| [Provider docs](https://ai.google.dev/gemini-api/docs/models) | — |

### Gemini 2.5 Pro

| Field | Value |
|-------|-------|
| Key | `gemini-2.5-pro` |
| Capabilities | chat · reasoning · tools · vision |
| Context window | 2 000 000 tokens |
| Input modalities | text · image · document |
| Output modalities | text |
| [Provider docs](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro) | — |

Industry-leading 2M-token context. Excellent for large codebase analysis or full-book summarisation.

### Gemini 3 Flash Preview

| Field | Value |
|-------|-------|
| Key | `gemini-3-flash-preview` |
| Capabilities | chat · tools · vision |
| Context window | 1 000 000 tokens |
| Input modalities | text · image · document |
| Output modalities | text |
| [Provider docs](https://ai.google.dev/gemini-api/docs/models) | — |

### Gemini 2.5 Flash

| Field | Value |
|-------|-------|
| Key | `gemini-2.5-flash` |
| Capabilities | chat · tools · vision |
| Context window | 1 000 000 tokens |
| Input modalities | text · image · document |
| Output modalities | text |
| [Provider docs](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash) | — |

### Gemini 3.1 Flash Lite Preview

| Field | Value |
|-------|-------|
| Key | `gemini-3.1-flash-lite-preview` |
| Capabilities | chat · tools |
| Context window | 1 000 000 tokens |
| Input modalities | text |
| Output modalities | text |
| [Provider docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-preview) | — |

### Gemini 2.5 Flash Lite

| Field | Value |
|-------|-------|
| Key | `gemini-2.5-flash-lite` |
| Capabilities | chat · tools |
| Context window | 1 000 000 tokens |
| Input modalities | text |
| Output modalities | text |
| [Provider docs](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite) | — |

Lowest-cost Google text model. Ideal for batch workloads or simple extraction lenses.

### Imagen 4

| Field | Value |
|-------|-------|
| Key | `imagen-4` |
| Capabilities | image_generation |
| Input modalities | text |
| Output modalities | image |
| [Provider docs](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview) | — |

Synchronous. High-fidelity photorealistic image generation.

### Veo 3

| Field | Value |
|-------|-------|
| Key | `veo-3` |
| Capabilities | video_generation |
| Input modalities | text |
| Output modalities | video |
| [Provider docs](https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview) | — |

Async video generation (task-poll pattern). Produces cinematic-quality clips.

### Lyria 2

| Field | Value |
|-------|-------|
| Key | `lyria-2` |
| Capabilities | audio_generation · music_generation |
| Input modalities | text |
| Output modalities | audio |
| [Provider docs](https://deepmind.google/technologies/lyria/) | — |

Async music synthesis. Outputs full instrumental tracks from a text prompt.

## Usage notes

- Gemini Pro preview models with 2M context are suited for lenses that process entire codebases, books, or long conversation histories in a single call.
- Veo 3 and Lyria 2 both use the task-poll pattern; declare the appropriate `output_contract.kind` (`video` or `audio`) in your lens version so the execution engine handles polling automatically.
