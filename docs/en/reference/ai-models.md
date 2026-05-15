---
title: AI Models
description: Every AI model available on LenserFight — name, provider, capabilities, context window, and modalities.
---

# AI Models

LenserFight routes lens executions through a unified model registry (`ai.models`). Each model has a canonical **key** used in API calls, a set of **capabilities**, and declared **input/output modalities**.

## Capability tags

| Tag | Meaning |
|-----|---------|
| `chat` | Conversational / instruction-following text generation |
| `reasoning` | Extended chain-of-thought reasoning (think-before-answer) |
| `tools` | Function / tool calling |
| `vision` | Accepts image inputs |
| `json_schema` | Provider-supported structured JSON output |
| `image_generation` | Produces images from text prompts |
| `video_generation` | Produces video clips from text/image prompts |
| `audio_generation` | Produces speech or general audio |
| `music_generation` | Produces music or soundtracks |

---

## OpenAI

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

---

## OpenAI — Generative Media

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

---

## Anthropic

### Claude Opus 4.6
| Field | Value |
|-------|-------|
| Key | `claude-opus-4-6` |
| Capabilities | chat · reasoning · tools |
| Context window | 200 000 tokens |
| Input modalities | text |
| Output modalities | text |
| [Provider docs](https://docs.anthropic.com/en/docs/about-claude/models/overview) | — |

Anthropic's most capable model. Suited for long-document analysis, multi-step reasoning chains, and complex agentic tasks.

### Claude Sonnet 4.6
| Field | Value |
|-------|-------|
| Key | `claude-sonnet-4-6` |
| Capabilities | chat · reasoning · tools |
| Context window | 200 000 tokens |
| Input modalities | text |
| Output modalities | text |
| [Provider docs](https://docs.anthropic.com/en/docs/about-claude/models/overview) | — |

Balanced speed/quality. Default recommendation for most Claude-backed lenses.

### Claude Sonnet 4.5
| Field | Value |
|-------|-------|
| Key | `claude-sonnet-4-5` |
| Capabilities | chat · reasoning · tools |
| Context window | 200 000 tokens |
| Input modalities | text |
| Output modalities | text |
| [Provider docs](https://docs.anthropic.com/en/docs/about-claude/models/migrating-to-claude-4) | — |

### Claude Sonnet 4.0
| Field | Value |
|-------|-------|
| Key | `claude-sonnet-4-0` |
| Capabilities | chat · reasoning · tools |
| Context window | 200 000 tokens |
| Input modalities | text |
| Output modalities | text |
| [Provider docs](https://docs.anthropic.com/en/docs/about-claude/models/overview) | — |

### Claude Haiku 4.5
| Field | Value |
|-------|-------|
| Key | `claude-haiku-4-5` |
| Capabilities | chat |
| Context window | 200 000 tokens |
| Input modalities | text |
| Output modalities | text |
| [Provider docs](https://docs.anthropic.com/en/docs/about-claude/models/migrating-to-claude-4) | — |

Fastest, cheapest Anthropic model. Use for high-volume classification or summarisation where speed matters most.

### Claude Haiku 3.5
| Field | Value |
|-------|-------|
| Key | `claude-haiku-3-5` |
| Capabilities | chat |
| Context window | 200 000 tokens |
| Input modalities | text |
| Output modalities | text |
| [Provider docs](https://docs.anthropic.com/en/docs/resources/model-deprecations) | — |

Legacy. Prefer Haiku 4.5 for new lenses.

---

## Google

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

---

## Google — Generative Media

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

---

## Mistral

### Mistral Large 3
| Field | Value |
|-------|-------|
| Key | `mistral-large-3` |
| Capabilities | chat · tools · json_schema |
| Context window | 128 000 tokens |
| Input modalities | text |
| Output modalities | text |
| [Provider docs](https://docs.mistral.ai/models/mistral-large-3-25-12) | — |

Mistral's flagship instruction model. Strong structured-output and tool-use performance.

### Magistral Medium 1.2
| Field | Value |
|-------|-------|
| Key | `magistral-medium-1.2` |
| Capabilities | chat · reasoning |
| Context window | 40 000 tokens |
| Input modalities | text |
| Output modalities | text |
| [Provider docs](https://docs.mistral.ai/models/magistral-medium-1-2-25-09) | — |

### Magistral Small 1.2
| Field | Value |
|-------|-------|
| Key | `magistral-small-1.2` |
| Capabilities | chat · reasoning |
| Context window | 40 000 tokens |
| Input modalities | text |
| Output modalities | text |
| [Provider docs](https://docs.mistral.ai/models/magistral-small-1-2-25-09) | — |

---

## Stability AI

### Stable Diffusion 4
| Field | Value |
|-------|-------|
| Key | `stable-diffusion-4` |
| Capabilities | image_generation |
| Input modalities | text · image |
| Output modalities | image |
| [Provider docs](https://stability.ai/stable-diffusion) | — |

Accepts an optional reference image for image-to-image workflows. Synchronous generation.

---

## ElevenLabs

### ElevenLabs v4
| Field | Value |
|-------|-------|
| Key | `elevenlabs-v4` |
| Capabilities | audio_generation |
| Input modalities | text |
| Output modalities | audio |
| [Provider docs](https://elevenlabs.io/docs/api-reference/text-to-speech) | — |

High-quality text-to-speech with voice cloning. Returns an audio file via the task-poll pattern.

---

## Kling

### Kling 2.0
| Field | Value |
|-------|-------|
| Key | `kling-2.0` |
| Capabilities | video_generation |
| Input modalities | text |
| Output modalities | video |
| [Provider docs](https://klingai.com) | — |

Async video generation. Strong at character-consistent motion.

---

## Suno

### Suno v5
| Field | Value |
|-------|-------|
| Key | `suno-v5` |
| Capabilities | audio_generation · music_generation |
| Input modalities | text |
| Output modalities | audio |
| [Provider docs](https://suno.com) | — |

Produces full songs (vocals + instrumentation) from a prompt. Async; uses the task-poll pattern.

---

## Midjourney

### Midjourney 7
| Field | Value |
|-------|-------|
| Key | `midjourney-7` |
| Capabilities | image_generation |
| Input modalities | text |
| Output modalities | image |
| [Provider docs](https://www.midjourney.com) | — |

Premium artistic image generation. Not yet active in the default registry; enable via BYOK.

---

## Using a model in a lens

Reference a model by its `key` in the lens version's `model_id` field or pass it in the execution DTO:

```json
{
  "model_id": "gemini-2.5-pro",
  "input_snapshot": { "prompt": "Explain quantum entanglement simply." },
  "funding_source": "platform_credit"
}
```

Generative media lenses declare their output in `output_contract.kind` (`image`, `video`, `audio`, `music`). The execution engine routes to the correct `GenerativeMediaAdapter` automatically.
