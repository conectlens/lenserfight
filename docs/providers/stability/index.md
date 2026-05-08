---
title: Stability AI
description: Stability AI on LenserFight — image generation models, support tier, and configuration.
---

# Stability AI

**Provider key:** `stability`  
**Support tier:** `runnable`

Stability AI produces Stable Diffusion, the most widely used open-weight image generation model family. LenserFight supports image-to-image and text-to-image workflows through the Stability platform API.

## Configuration

Stability AI models are available via LenserFight platform credits. To use your own API key (BYOK):

1. Go to **Settings → API Keys**
2. Add a Stability AI key under the `stability` provider
3. Select **BYOK** in the funding source toggle

## Available models

| Name | Key | Capabilities | Notes |
|------|-----|-------------|-------|
| Stable Diffusion 4 | `stable-diffusion-4` | image_generation | Accepts image input for img2img |

**Stable Diffusion 4** accepts an optional reference image (image-to-image), enabling style transfer and inpainting workflows inside LenserFight lenses.

## Related

- [Full AI Models reference](/reference/ai-models#stability-ai)
- [BYOK execution guide](/how-to/battles/byok-execution)
- [AI Providers overview](/reference/ai-providers)
