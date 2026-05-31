---
title: AI Providers
description: Connect and configure AI providers in LenserFight — supported providers, BYOK, key rotation, and local Ollama.
---

# AI Providers

LenserFight routes AI calls to the provider attached to each lens or workflow node. You can use the platform's shared key for convenience, bring your own API key (BYOK) for cost control and higher rate limits, or point to a local Ollama instance for fully offline execution.

## Supported Providers

| Provider | Models |
|---|---|
| OpenAI | GPT-4o, GPT-4o-mini |
| Anthropic | Claude Sonnet, Claude Haiku |
| Google | Gemini Pro |
| Mistral | Mistral (all tiers) |
| Ollama | Any locally-served model (self-hosted, no API key required) |

## BYOK — Bring Your Own Key

To attach your own API key:

1. Go to **Settings → API Keys**.
2. Click **Add Key**.
3. Select the provider from the dropdown.
4. Paste your API key into the field.
5. Click **Save**.

Keys are encrypted at rest using AES-256 envelope encryption. The raw key is never stored in plaintext and is never returned after the initial save — only a masked preview (e.g. `sk-...ab12`) is shown.

Once saved, the key is available for selection when creating or editing a lens or workflow node.

## Setting `funding_source` on a Lens

Each lens has a `funding_source` field that determines which key is used at execution time:

| Value | Behaviour |
|---|---|
| `platform` | Uses the platform's shared key. Subject to platform rate limits and fair-use policy. No API key configuration required. |
| `user_byok_cloud` | Uses the personal API key you added under Settings → API Keys. Charges go directly to your provider account. |

Set `funding_source` when creating or updating a lens via the editor or the `create_lens` / `update_lens` MCP tools.

## Key Rotation

To replace an existing key with a new one:

1. Go to **Settings → API Keys**.
2. Find the key you want to rotate and click **Rotate**.
3. Paste the new key value.
4. Confirm.

The old key is invalidated immediately on the LenserFight side. Any in-flight requests that were already dispatched with the old key may still succeed or fail depending on your provider's revocation latency. New requests use the replacement key at once.

## Local Ollama

To use a self-hosted Ollama instance instead of a cloud provider:

1. Install and start Ollama locally: `ollama serve`.
2. Set the `OLLAMA_BASE_URL` environment variable to your instance URL (default `http://localhost:11434`).
3. In the lens or node configuration, select **Ollama** as the provider and enter the model name (e.g. `llama3`, `mistral`).

No API key is required for Ollama. Requests are sent directly to the local HTTP endpoint. This mode is suitable for air-gapped environments or local development where cloud API costs are undesirable.

> Ollama is not available in the hosted LenserFight cloud environment — it is only usable when running the platform locally or in a self-hosted deployment where the Ollama process is reachable from the server.
