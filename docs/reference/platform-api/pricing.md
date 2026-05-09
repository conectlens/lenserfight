---
title: Pricing & Plans
description: LenserFight plan tiers, quota limits, and token allowances for individuals, developers, teams, and enterprises.
---

# Pricing & Plans

LenserFight uses a tiered plan model. All tiers can access public lenses, agents, and workflows. Higher tiers unlock private resources, organisation accounts, higher API quotas, and commercial use rights.

> This page reflects the planned **hosted platform** pricing. Community Edition (this repository) is **Apache License 2.0**; you may self-host and build on the code under those terms. Trademarks and the official hosted product at [lenserfight.com](https://lenserfight.com) are separate—see [Open Core Model](/explanation/community/open-core-model), [License](/explanation/community/license), and [Brand guidelines](/explanation/community/brand-guidelines).

---

## Plan overview

| Feature | Free | Developer | Team | Enterprise |
|---------|:----:|:---------:|:----:|:----------:|
| Personal account | ✓ | ✓ | ✓ | ✓ |
| Public lenses / agents / workflows | ✓ | ✓ | ✓ | ✓ |
| Create public lenses | ✓ | ✓ | ✓ | ✓ |
| Private lenses | — | ✓ | ✓ | ✓ |
| Developer tokens | — | ✓ | ✓ | ✓ |
| BYOK execution | — | ✓ | ✓ | ✓ |
| Platform-credit execution | — | ✓ | ✓ | ✓ |
| Community (org) account | — | 1 | 5 | Unlimited |
| Community connectors | — | 1 | 10 | Unlimited |
| Organisation API tokens | — | 1 | 25 | Unlimited |
| Private communities | — | — | ✓ | ✓ |
| Team member seats | — | — | 50 | Custom |
| SSO / SAML | — | — | — | ✓ |
| SLA | — | — | — | ✓ |
| Dedicated support | — | — | Priority | Dedicated |
| Commercial deployment rights | Apache-2.0 CE | Apache-2.0 CE | License required | Custom |

---

## API quotas

Quotas apply to platform-hosted API calls (not BYOK or local Ollama runs).

| Quota | Free | Developer | Team | Enterprise |
|-------|:----:|:---------:|:----:|:----------:|
| Lens reads / day | 500 | 5,000 | 50,000 | Custom |
| Workflow runs / day | 10 | 200 | 2,000 | Custom |
| Agent invocations / day | 10 | 100 | 1,000 | Custom |
| Platform-credit tokens / month | — | 250k | 2.5M | Custom |
| Webhook events / day | — | 1,000 | 25,000 | Custom |

Rate limits are applied per token (not per user). Organisation tokens and service tokens share the community's quota pool.

---

## Individuals

**Free** is suitable for personal exploration, contributing to public lenses, and evaluating the platform locally via the Community Edition repo.

**Developer** unlocks private lenses, developer tokens, BYOK execution, and a single community account — everything an independent developer needs to build integrations.

---

## Teams and organisations

**Team** is designed for product teams and SaaS companies that want to use LenserFight as an AI content layer. Chainabit, for example, would use a Team plan to:

1. Create a community account (`chainabit`).
2. Publish shared lenses and agents under the community identity.
3. Register service connectors with scoped API tokens.
4. Invite team members and manage roles.
5. Consume lenses and agent runs from their backend using the service token.

Team plan includes 10 connectors and 25 API tokens, which covers most multi-environment SaaS setups (dev, staging, production × multiple services).

---

## Enterprise

Enterprise is for companies with custom quota requirements, compliance needs (SSO, audit logs, data residency), or a hosted private deployment arrangement. Pricing is custom; contact the LenserFight team via the repository contact path or the hosted platform.

Enterprise customers can negotiate:

- unlimited connectors and API tokens
- custom API rate limits
- dedicated infrastructure
- SLA with defined uptime guarantees
- commercial agreement for **hosted** enterprise deployments and custom terms beyond the open-source license

---

## Licensing note

LenserFight Community Edition is licensed under the **Apache License, Version 2.0**:

- You may use, modify, and redistribute the source code, including in commercial products, subject to Apache-2.0 requirements.
- The **LenserFight** name and logos are **not** licensed by the software copyright license alone—see [Brand guidelines](/explanation/community/brand-guidelines).

For **hosted platform** plans, quotas, and enterprise agreements on [lenserfight.com](https://lenserfight.com), contact the team before relying on production SLAs.

---

## Related

- [Open Core Model](/explanation/community/open-core-model) — Community Edition vs cloud surfaces
- [Token Reference](/reference/platform-api/tokens) — token types and quotas per plan
- [SaaS Integration Quickstart](/how-to/integrations/saas-quickstart) — Team plan integration walkthrough
- [Communities](/reference/cli/communities) — create and manage community accounts
