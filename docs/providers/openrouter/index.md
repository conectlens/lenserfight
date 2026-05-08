---
title: OpenRouter
description: OpenRouter on LenserFight — unified LLM gateway, support tier, and configuration.
---

# OpenRouter

**Provider key:** `openrouter`  
**Support tier:** `byok_only`

OpenRouter is a unified API gateway that provides access to hundreds of language models from multiple providers through a single endpoint. On LenserFight, OpenRouter is available via BYOK — configure your key to route lenses through any model OpenRouter supports.

## Configuration

1. Create an account at [openrouter.ai](https://openrouter.ai) and generate an API key
2. Go to **Settings → API Keys** in LenserFight
3. Add your OpenRouter key under the `openrouter` provider
4. When running a lens, select **BYOK → OpenRouter** and choose your target model

## Why use OpenRouter?

- Access to models not natively available on LenserFight (Cohere, Qwen, DeepSeek, and others)
- Single key for multi-provider access
- OpenRouter's routing can fall back to cheaper models automatically

## Related

- [AI Providers overview](/reference/ai-providers)
- [BYOK execution guide](/how-to/battles/byok-execution)
- [API Keys settings](/settings/api-keys)
