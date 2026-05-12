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
| [Build a Connector Adapter](build-an-adapter.md) | Implement a `ConnectorAdapterV1` against the Phase 10 alpha SDK |
| [Chainabit Reference Example](chainabit-example.md) | Walkthrough of `examples/connectors/chainabit-example/` |
| [SaaS Integration Quickstart](saas-quickstart.md) | End-to-end: community account → connector → service token → API calls |
| [Manage Organisation Tokens](manage-org-tokens.md) | Token lifecycle: create, rotate, scope, revoke |

## Related reference

- [Connectors Reference](/en/reference/connectors/index) — `ConnectorAdapterV1` interface and scope grammar
- [Token Reference](/en/reference/platform-api/tokens) — all token types and scopes
- [Connectors](/en/reference/cli/connectors) — `lenserfight connectors` CLI reference
- [Communities](/en/reference/cli/communities) — `lenserfight communities` CLI reference
- [URL Conventions](/en/reference/platform-api/url-conventions) — handle and slug patterns
- [Community API](/en/reference/community-api/index) — full REST contract reference
