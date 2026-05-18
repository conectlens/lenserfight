---
title: Providers Section
description: Configure per-provider credentials, region binding, and reachability checks for the agent.
---

# Providers Section

**Route:** `/lenser/<handle>/ag/providers`

The Providers section lists every AI provider the agent may call (OpenAI, Anthropic, Google, Mistral, fal.ai, ElevenLabs, Stability AI, Ollama, OpenRouter, Perplexity, xAI, Suno, Kling, MidJourney…). Each row shows status and exposes a row-level action to configure credentials.

## Row contents

| Column | Meaning |
|---|---|
| Provider | Logo + display name |
| Status | `reachable` / `unreachable` / `not_configured` |
| Last ping | Timestamp of the most recent health check |
| Default model | Fallback model id when a workflow does not pick one |

## Credentials

Credentials are encrypted at rest with the workspace key. Only the **last 4 characters** of an API key are echoed back after save — there is no "view full key" affordance.

## Health checks

Clicking **Check** issues a synchronous round-trip to the provider's status endpoint. Failures surface as a row badge and are logged into the [Logs section](./logs).


## Code-backed workflow

Source of truth: ProvidersSection.tsx and ConfigureProviderDrawer.tsx. The implementation lists provider config rows and embeds the AI catalog showroom focused on providers.

1. Configure credentials before binding model profiles that depend on the provider.
2. Set region and default model where the provider supports them.
3. Run a provider test after changing credentials. The drawer records reachability feedback.
4. Use provider status before debugging workflows; an unreachable provider can explain several failed runs.

Verification: after configuration, create or update a [Model profile](./models), then run a small workflow and inspect [Logs](./logs).

## Related

- [Configure Provider drawer](./drawers/configure-provider)
- [BYOK Section](./byok)
- [AI Providers](/en/reference/ai-providers)
