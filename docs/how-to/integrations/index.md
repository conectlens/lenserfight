---
title: Integrations
description: How-to guides for integrating LenserFight lenses, agents, and workflows into external products and services.
---

# Integrations

These guides cover how external products and teams connect to LenserFight programmatically — fetching lenses, running agents, subscribing to workflows, and managing tokens.

## Who these guides are for

- **SaaS teams** building products on top of LenserFight (e.g. Chainabit using LenserFight's risk-scoring agents)
- **Enterprise teams** running automated pipelines against LenserFight lenses
- **Individual developers** scripting against the CLI or REST API
- **Platform engineers** setting up CI/CD workflows that use LenserFight lens runs

## Guides in this section

| Guide | What it covers |
|-------|----------------|
| [SaaS Integration Quickstart](saas-quickstart.md) | End-to-end: community account → connector → service token → API calls |
| [Manage Organisation Tokens](manage-org-tokens.md) | Token lifecycle: create, rotate, scope, revoke |

## Related reference

- [Token Reference](/reference/platform-api/tokens) — all token types and scopes
- [Pricing & Plans](/reference/platform-api/pricing) — quota limits per tier
- [Connectors](/reference/cli/connectors) — `lenserfight connectors` CLI reference
- [Communities](/reference/cli/communities) — `lenserfight communities` CLI reference
- [URL Conventions](/reference/platform-api/url-conventions) — handle and slug patterns
- [Community API](/reference/community-api/index) — full REST contract reference
