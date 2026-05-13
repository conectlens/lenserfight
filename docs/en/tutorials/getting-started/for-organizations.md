---
title: LenserFight for Organizations
description: How teams and SaaS products use LenserFight as an AI lens and agent layer — community accounts, connectors, service tokens, and API integration.
---

# LenserFight for Organizations

This guide is for engineering teams and SaaS products that want to integrate LenserFight's lenses, agents, and workflows into their own systems — not just evaluate the community repo locally.

---

## What organizations can do today

| Capability | Available |
|-----------|-----------|
| Create a community (organisation) account | Developer plan and above |
| Publish lenses under a community identity | ✓ |
| Register service connectors with scoped tokens | Developer plan and above |
| Fetch public lenses, agents, and workflows via API | ✓ (with service token) |
| Run lenses using BYOK (your own API keys) | Developer plan and above |
| Invite team members to a community | ✓ |
| Connect external systems via webhooks | Team plan and above |
| Private community (not listed in directory) | Team plan and above |
| SSO / SAML | Enterprise |

---

## Core concept: the community account

An **organisation account** on LenserFight is called a **community**. It is a shared identity that your team and external systems act under:

- Lenses and agents published by your team appear under `@your-org`
- Service tokens issued to your connectors are scoped to your community
- Team members can be invited with `member`, `moderator`, or `admin` roles

---

## Integration architecture

```
Your Backend
    │
    │  Authorization: Bearer $LENSERFIGHT_API_KEY
    ▼
LenserFight REST API (/v1)
    │
    ├── /lenses         ← browse and execute lenses
    ├── /agents         ← discover and invoke agents
    └── /workflows      ← run workflows
```

The service token is the only long-lived credential your backend needs. It is scoped to the minimum permissions your integration requires.

---

## Quick setup

```bash
# 1. Log in
lf auth login

# 2. Create your community
lf communities create --name "Chainabit" --slug chainabit

# 3. Register a service connector
lf communities switch chainabit
lf connectors add \
  --name "Chainabit Backend" \
  --slug chainabit-backend \
  --scopes "lenses:read,agents:read,workflows:read"
# → prints your service token once

# 4. Use the token in your backend
export LENSERFIGHT_API_KEY=lf_svc_...
curl https://api.lenserfight.com/v1/lenses \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY"
```

For the complete walkthrough, see [SaaS Integration Quickstart](/en/how-to/integrations/saas-quickstart).

---

## Common integration scenarios

### Scenario A: Chainabit embeds LenserFight agents

Chainabit is a blockchain analytics SaaS. It wants to surface LenserFight's AI lensers in its dashboard as data enrichment agents.

1. Chainabit creates a community account (`chainabit`).
2. Registers a read-only connector with `agents:read,lenses:read`.
3. Its backend fetches available agents and lens metadata from the API.
4. When a user runs an analysis, Chainabit's backend calls the lens execution endpoint.
5. The result is rendered in Chainabit's UI.

### Scenario B: Google Cloud Function uses LenserFight lenses

A scheduled Cloud Function processes daily data using LenserFight lenses for summarisation and classification.

1. An org token with `lenses:read,workflows:read` is stored as a GCP Secret.
2. The function reads the secret at runtime and calls the LenserFight API.
3. Results are written to BigQuery.
4. No user session is involved at any point.

### Scenario C: Individual developer scripts

An independent developer writes Python scripts that use LenserFight lenses for content processing.

1. Gets a developer token via `lf auth device request`.
2. Sets `LENSERFIGHT_API_KEY` in their shell.
3. Calls the REST API or uses `lf lenses use <slug>` in scripts.
4. Private lenses are accessible under their personal account.

---

## Licensing

LenserFight Community Edition is under the **Apache License, Version 2.0**. You may self-host, modify, and ship products that include this codebase under Apache-2.0. Use of the **LenserFight** name and logos in a way that implies official endorsement is separate—see [Brand guidelines](/en/explanation/community/brand-guidelines).

If you depend on the **hosted** platform at [lenserfight.com](https://lenserfight.com) (SLA, quotas, private features), use the appropriate plan and contact the team for production. See [OSS Launch Scope](/en/explanation/community/oss-launch-scope) for scope.

---

## Next steps

| What you want to do | Where to go |
|--------------------|-------------|
| Full integration walkthrough | [SaaS Integration Quickstart](/en/how-to/integrations/saas-quickstart) |
| Token types and scopes | [Token Reference](/en/reference/platform-api/tokens) |
| CLI: community management | [Communities CLI](/en/reference/cli/communities) |
| CLI: connector management | [Connectors CLI](/en/reference/cli/connectors) |
| REST API reference | [Community API](/en/reference/community-api/index) |
| License terms | [License](/en/explanation/community/license) |
