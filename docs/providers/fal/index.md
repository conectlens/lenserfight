---
title: fal.ai
description: fal.ai on LenserFight — fast generative media inference, support tier, and configuration.
---

# fal.ai

**Provider key:** `fal`  
**Support tier:** `runnable`

fal.ai provides serverless GPU inference with very low cold-start latency, specialising in image, video, and audio generation models. LenserFight routes generative media lenses through fal when cloud credits are used for non-OpenAI/Google media models.

## Configuration

fal.ai is available via LenserFight platform credits for supported models. To use your own fal API key (BYOK):

1. Go to **Settings → API Keys**
2. Add a fal.ai key under the `fal` provider
3. Select **BYOK** in the funding source toggle

See your fal API key at [fal.ai/dashboard](https://fal.ai/dashboard).

## Capabilities

fal.ai is used for:

- Fast image generation (Stable Diffusion variants, Flux)
- Video generation (fast inference routing)
- Audio and music generation (async task-poll pattern)

## Related

- [AI Providers overview](/reference/ai-providers)
- [BYOK execution guide](/how-to/battles/byok-execution)
- [Stability AI provider](/providers/stability/)
