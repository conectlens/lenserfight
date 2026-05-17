---
title: Ollama
description: Ollama local model runtime on LenserFight — run open-weight models via a local gateway.
---

# Ollama

Ollama is a supported execution provider on LenserFight for locally-hosted open-weight models. Rather than routing to a cloud API, LenserFight connects to a running Ollama instance through the gateway daemon. This enables private, offline-capable lenses and battles without sending data to an external provider.

## Support tier

`runnable` — LenserFight has a direct runtime path or adapter for this provider (via the local gateway daemon).

## Upstream docs

[ollama.com](https://ollama.com)

## Models on LenserFight

No models are registered in the default catalog yet. Configure via BYOK.

Pull any model with `ollama pull <model>` locally, then reference it by its Ollama tag in the lens `model_id` field (e.g. `ollama/llama3.3`, `ollama/mistral`). The gateway adapter proxies the call to your local Ollama instance.

## Usage notes

- Start the LenserFight gateway daemon (`lenserfight gateway start`) before running lenses backed by Ollama; the daemon manages the local connection.
- Ollama models are subject to local hardware constraints — context window and throughput depend on available VRAM and the model quantisation level.
