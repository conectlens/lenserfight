---
title: Mistral
description: Mistral on LenserFight — support tier, configuration, and available models.
---

# Mistral

**Provider key:** `mistral`  
**Support tier:** `runnable`

Mistral models are efficient, European-hosted language models with strong structured-output and tool-use capabilities. They are a good default for privacy-conscious workflows and cost-effective batch processing.

## Configuration

Mistral models are available via LenserFight platform credits. To use your own API key (BYOK):

1. Go to **Settings → API Keys**
2. Add a Mistral AI key under the `mistral` provider
3. Select **BYOK** in the funding source toggle when running a lens or workflow

## Available models

| Name | Key | Capabilities | Context |
|------|-----|-------------|---------|
| Mistral Large 3 | `mistral-large-3` | chat · tools · json_schema | 128 000 |
| Magistral Medium 1.2 | `magistral-medium-1.2` | chat · reasoning | 40 000 |
| Magistral Small 1.2 | `magistral-small-1.2` | chat · reasoning | 40 000 |

**Recommendation:** Use `mistral-large-3` for lenses that require reliable tool calling or structured JSON output. Use Magistral models for tasks that benefit from extended chain-of-thought reasoning at lower cost.

## Related

- [Full AI Models reference](/en/reference/ai-models#mistral)
- [BYOK execution guide](/en/how-to/battles/byok-execution)
- [AI Providers overview](/en/reference/ai-providers)
