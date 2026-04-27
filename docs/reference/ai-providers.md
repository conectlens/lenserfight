---
title: AI Providers
description: LenserFight provider catalog, support tiers, and runtime routing expectations.
---

# AI Providers

LenserFight now treats providers as catalog entries with explicit support tiers instead of assuming every documented provider is directly runnable.

## Support tiers

| Tier | Meaning |
|------|---------|
| `runnable` | LenserFight has a direct runtime path or adapter for this provider. |
| `byok_only` | Users can configure credentials, but execution depends on BYOK routing rather than a fully native runtime path. |
| `catalog_only` | The provider appears in discovery, planning, and showroom UIs but is not executed directly. |
| `deprecated` | The provider remains listed for compatibility or migration context and should not be chosen for new workflows. |

## Runtime-first providers

These providers are part of the primary execution surface today:

- `openai`
- `anthropic`
- `google`
- `mistral`
- `ollama`
- `fal`
- `stability`
- `elevenlabs`
- `kling`
- `suno`

## Catalog and gateway providers

These providers are represented in the catalog for comparison, workflow planning, gateway routing, or future adapter work:

- `openrouter`
- `perplexity`
- `xai`
- `groq`
- `deepseek`
- `bedrock`
- `runway`
- `litellm`
- `lmstudio`
- `midjourney`

## Provider metadata carried by the catalog

Each provider entry is expected to carry:

- canonical `key`
- display name
- docs URL
- support tier
- logo slug for cards and sidebars
- gateway/platform compatibility metadata
- source provenance metadata such as `source_url` and `source_checked_at`

## Product usage

The provider catalog feeds four surfaces:

1. Supabase seed data in `ai.providers`
2. The human-facing AI catalog showroom at `/ai/catalog`
3. Agent control-room provider and model pages under `/lenser/:handle/ag/*`
4. CLI commands such as `providers list`, `providers show`, `providers config`, and `gateway`
