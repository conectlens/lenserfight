---
title: Anthropic
description: Anthropic Claude models available on LenserFight — Opus, Sonnet, and Haiku families.
---

# Anthropic

Anthropic is a first-class execution provider on LenserFight. The platform supports the Claude 4.x Opus and Sonnet tiers for demanding reasoning and agentic workloads, as well as the Haiku 4.5 and 3.5 models for high-throughput, cost-sensitive lenses. All Claude models on LenserFight share the 200 000-token context window.

## Support tier

`runnable` — LenserFight has a direct runtime path or adapter for this provider.

## Upstream docs

[docs.anthropic.com](https://docs.anthropic.com/en/docs/about-claude/models/overview)

## Models on LenserFight

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

## Usage notes

- Claude models on LenserFight are text-only; they do not accept image or document inputs in the default catalog configuration.
- For tool-calling lenses, Claude Sonnet 4.6 offers the best latency-to-capability trade-off; reserve Opus 4.6 for tasks that genuinely require extended reasoning chains.
