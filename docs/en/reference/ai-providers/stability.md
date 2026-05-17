---
title: Stability AI
description: Stability AI models available on LenserFight — Stable Diffusion 4 image generation.
---

# Stability AI

Stability AI is a first-class execution provider on LenserFight for image generation workloads. Stable Diffusion 4 accepts both text prompts and optional reference images, making it suitable for image-to-image lens workflows as well as pure text-to-image generation.

## Support tier

`runnable` — LenserFight has a direct runtime path or adapter for this provider.

## Upstream docs

[stability.ai/stable-diffusion](https://stability.ai/stable-diffusion)

## Models on LenserFight

### Stable Diffusion 4

| Field | Value |
|-------|-------|
| Key | `stable-diffusion-4` |
| Capabilities | image_generation |
| Input modalities | text · image |
| Output modalities | image |
| [Provider docs](https://stability.ai/stable-diffusion) | — |

Accepts an optional reference image for image-to-image workflows. Synchronous generation.

## Usage notes

- Set `output_contract.kind = image` in your lens version; the execution engine returns a signed URL immediately after the synchronous call resolves.
- When passing a reference image, include it in `input_snapshot` as a base64-encoded data URI or a pre-signed storage URL — the adapter handles both formats.
