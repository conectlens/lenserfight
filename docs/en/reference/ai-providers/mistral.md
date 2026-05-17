---
title: Mistral
description: Mistral AI models available on LenserFight — Mistral Large 3 and Magistral reasoning models.
---

# Mistral

Mistral is a first-class execution provider on LenserFight. The platform supports Mistral Large 3 as the flagship instruction and tool-use model, plus the Magistral Medium and Small reasoning variants for chain-of-thought workloads. All Mistral models are text-only in the default catalog.

## Support tier

`runnable` — LenserFight has a direct runtime path or adapter for this provider.

## Upstream docs

[docs.mistral.ai](https://docs.mistral.ai)

## Models on LenserFight

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

## Usage notes

- Mistral Large 3 is the recommended choice for structured-output lenses that require `json_schema` enforcement and tool calling.
- Magistral models have a smaller 40 000-token context window; break long documents into chunks or use a Gemini/GPT-5.4 model for large-context tasks.
