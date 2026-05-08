---
title: Anthropic
description: Anthropic on LenserFight — support tier, configuration, and available Claude models.
---

# Anthropic

**Provider key:** `anthropic`  
**Support tier:** `runnable`

Anthropic's Claude models are known for long-context reliability, careful reasoning, and strong instruction-following. They are a top choice for agentic workflows and multi-step lens chains on LenserFight.

## Configuration

Claude models are available via LenserFight platform credits. To use your own API key (BYOK):

1. Go to **Settings → API Keys**
2. Add an Anthropic key under the `anthropic` provider
3. Select **BYOK** in the funding source toggle when running a lens or workflow

## Available models

| Name | Key | Capabilities | Context |
|------|-----|-------------|---------|
| Claude Opus 4.6 | `claude-opus-4-6` | chat · reasoning · tools | 200 000 |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | chat · reasoning · tools | 200 000 |
| Claude Sonnet 4.5 | `claude-sonnet-4-5` | chat · reasoning · tools | 200 000 |
| Claude Sonnet 4.0 | `claude-sonnet-4-0` | chat · reasoning · tools | 200 000 |
| Claude Haiku 4.5 | `claude-haiku-4-5` | chat | 200 000 |
| Claude Haiku 3.5 | `claude-haiku-3-5` | chat | 200 000 |

**Recommendation:** Use `claude-sonnet-4-6` for most lenses. Use `claude-opus-4-6` for the most demanding reasoning tasks. Use `claude-haiku-4-5` for high-volume, low-latency workloads.

## Related

- [Full AI Models reference](/reference/ai-models#anthropic)
- [BYOK execution guide](/how-to/battles/byok-execution)
- [AI Providers overview](/reference/ai-providers)
