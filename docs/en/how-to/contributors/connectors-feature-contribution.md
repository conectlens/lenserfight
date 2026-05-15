---
title: Contribute to Connectors
description: How to build the Connectors page and new AI provider adapters for LenserFight AI Lensers — scope, architecture hints, and acceptance criteria.
---

# Contribute to the Connectors Feature

The Connectors page (`/connectors`) is a planned feature and one of the highest-impact areas open for contribution. It gives AI Lensers the ability to connect to local and cloud AI providers (Ollama, LM Studio, Anthropic, OpenAI, custom endpoints) through a unified adapter interface.

## What needs building

### Connectors page UI
- **Provider list** — cards for each registered connector, showing name, type (local/cloud), health status, and last-seen timestamp.
- **Add connector flow** — wizard or form to register a new provider (URL, auth token, model list probe).
- **Health indicator** — live probe result (green / yellow / red) per connector, using the existing `test-provider` Supabase function.
- **Edit / remove** — inline actions to update credentials or delete a connector.

### Connector adapters
Each adapter implements `ConnectorAdapterV1` (see [RFC-0001](../../rfcs/RFC-0001-connector-interface.md)) and is registered in the adapter registry. Adapters wanted:

| Provider | Type | Status |
|---|---|---|
| Ollama | Local | Scaffolded |
| LM Studio | Local | Wanted |
| Anthropic | Cloud | Wanted |
| OpenAI | Cloud | Wanted |
| Groq | Cloud | Wanted |
| Custom OpenAI-compatible | Cloud | Wanted |

## Relevant files

| File | Role |
|---|---|
| `libs/features/connectors/src/lib/pages/ConnectorsPage.tsx` | Page shell — start here |
| `libs/features/connectors/src/index.ts` | Public API of the library |
| `apps/web/src/WebRouter.tsx` | Route registration (`/connectors`) |
| `supabase/functions/test-provider/index.ts` | Provider health-probe edge function |
| `docs/en/how-to/contributors/connector-sdk-getting-started.md` | SDK getting-started guide |
| `docs/en/how-to/contributors/adapter-contribution-guide.md` | Full adapter contribution guide |

## Architecture hints

- Follow `ConnectorAdapterV1` from RFC-0001 — do not invent a new interface shape.
- Keep data-fetching hooks in `libs/data/` — the page should be presentation-only.
- Reuse the `test-provider` edge function for health probing; do not write new network calls in the UI layer.
- Connector credentials are user-scoped and encrypted at rest — never log or display them in full.
- Follow the existing feature slice pattern — see `libs/features/devices/` as a reference for a similar hardware-integration slice.

## Acceptance criteria

A contribution is ready to review when:

1. The page lists all registered connectors with name, type, and a live health badge.
2. A user can add a new local (Ollama) or cloud (OpenAI-compatible) connector through a form and see it appear in the list.
3. The health probe runs on load and on demand without crashing on unreachable hosts.
4. Credentials are never echoed back in the UI in full.
5. RLS policies restrict each user to their own connectors.
6. The `ConnectorsPage.tsx` "under construction" placeholder is removed.

## Getting started

1. Read [Connector SDK — Getting Started](./connector-sdk-getting-started.md) and [Adapter Contribution Guide](./adapter-contribution-guide.md).
2. Claim the [Connectors feature issue](https://github.com/conectlens/lenserfight/issues?q=is%3Aopen+label%3Aconnectors) on GitHub.
3. Run `pnpm nx serve web` and navigate to `/connectors` to see the current placeholder.
4. Ask questions in the `#connectors` discussion thread or open a draft PR early.
