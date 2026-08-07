---
title: Google Vertex AI
description: Google Vertex AI (Express Mode) as a distinct BYOK provider on LenserFight — the same Gemini models as the Google provider, routed through Vertex instead of the Gemini Developer API.
---

# Google Vertex AI

Google Vertex AI is a separate provider from [Google](./google.md). Both call the same underlying Gemini models, but through different APIs: Google routes through the Gemini Developer API (`generativelanguage.googleapis.com`), while Google Vertex AI routes through Vertex AI Express Mode (`aiplatform.googleapis.com`) using a Vertex-issued API key. Pick this provider if your key was issued by Vertex AI rather than Google AI Studio.

## Support tier

`byok_only` — LenserFight has a direct runtime path for this provider, but it is not wired to the Chainabit platform-credit gateway. You must supply your own API key.

## Upstream docs

[cloud.google.com/vertex-ai/generative-ai/docs](https://cloud.google.com/vertex-ai/generative-ai/docs)

## Models on LenserFight

### Gemini 2.5 Pro (Vertex)

| Field | Value |
|-------|-------|
| Key | `gemini-2.5-pro-vertex` |
| Capabilities | chat · reasoning · tools · vision |
| Context window | 2 000 000 tokens |
| Input modalities | text · image · document |
| Output modalities | text |
| [Provider docs](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-pro) | — |

### Gemini 2.5 Flash (Vertex)

| Field | Value |
|-------|-------|
| Key | `gemini-2.5-flash-vertex` |
| Capabilities | chat · tools · vision |
| Context window | 1 000 000 tokens |
| Input modalities | text · image · document |
| Output modalities | text |
| [Provider docs](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash) | — |

## Usage notes

- Only text models are wired for this provider. Vertex-routed Imagen/Veo/Lyria variants are not registered — use the [Google](./google.md) provider's Imagen 4 / Veo 3 / Lyria 2 for media generation.
- Configure your key with `lf providers config google_vertex --from-env <YOUR_ENV_VAR>` (reads from an environment variable instead of prompting, so the key never appears in shell history), then verify with `lf providers test google_vertex`.
- `byok_only` means this provider cannot be selected with `platform_credit` or `sponsored` funding — only `user_byok_cloud`.
