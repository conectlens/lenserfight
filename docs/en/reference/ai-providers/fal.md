---
title: Fal
description: Fal.ai models available on LenserFight — fast inference for image and video generation models.
---

# Fal

Fal (fal.ai) is a first-class execution provider on LenserFight for fast generative media inference. Fal specialises in GPU-accelerated image and video generation workloads with low queue latency, making it suitable for battles where output speed is a scoring factor.

## Support tier

`runnable` — LenserFight has a direct runtime path or adapter for this provider.

## Upstream docs

[fal.ai/docs](https://fal.ai/docs)

## Models on LenserFight

No models are registered in the default catalog yet. Configure via BYOK.

Fal exposes a large catalog of community and proprietary image/video generation models. To use a Fal model in a lens, configure your Fal API key under Settings → Partner Accounts and specify the Fal model endpoint in the lens version's `model_id` field (e.g. `fal/flux-pro`, `fal/fast-sdxl`).

## Usage notes

- Fal models are billed against your Fal account; ensure your BYOK credentials are active before running battles to avoid execution failures.
- Fal's queue-based system can deliver results synchronously or asynchronously depending on the model; set `output_contract.kind` to match the expected media type (`image` or `video`).
