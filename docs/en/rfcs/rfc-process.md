# RFC Process

This document governs how changes to LenserFight's public contracts are proposed, reviewed, and decided.

## Purpose

This process governs proposals to change the public interface of `@lenserfight/sdk` and platform-level contracts. Additive changes that don't break external consumers may ship without an RFC, but must be reviewed by at least one Core maintainer.

## When an RFC is required

An RFC is required for any of the following:

- Removing or changing the signature of an exported symbol in `@lenserfight/sdk`.
- Adding a new required method to `ConnectorAdapterV1`.
- Changing the v1 scope grammar.
- Changing the Postgres `SQLSTATE 42501` enforcement contract.
- Introducing a new breaking migration.

## Authoring

Anyone can author an RFC.

1. Copy [`RFC-TEMPLATE.md`](RFC-TEMPLATE.md).
2. Set the next sequential number (RFC-0002, RFC-0003, ...).
3. Fill in all sections.
4. Open a PR to `main`.

## Lifecycle

| Stage | Description |
|---|---|
| **Draft** | Author opens PR, sets status to Draft. |
| **Review** | PR merged to `docs/rfcs/`, 7-day open comment period begins. |
| **FCP (Final Comment Period)** | Core maintainer calls FCP after open questions are resolved. 3-day window. |
| **Accepted** | Minimum two Core maintainer approvals, no unresolved objections from Core. |
| **Rejected** | Core closes the RFC PR with rationale. |

## Decision authority

Core maintainers (listed in [`MAINTAINERS.md`](../../MAINTAINERS.md)) hold merge authority. Contributor maintainers can review and comment but cannot merge RFCs. Triage maintainers are not involved in RFC decisions.

## Breaking vs. additive

Additive changes — new optional exports, new optional methods with default behavior, new feature flags with backward-compatible defaults — do not require an RFC but require one Core maintainer review.

## Numbering

Four-digit zero-padded sequential: RFC-0001, RFC-0002, ...

## CRON_SCHEDULING sponsor perk

workflow scheduling is cloud-edition-on by default (`editionIsCloud = true`). Self-hosted instances enable it via env var Supabase `pg_cron` configured for workflow dispatch. GitHub Sponsors at the Infrastructure tier receive a managed cloud deployment with `CRON_SCHEDULING` pre-enabled. Governance decisions related to `CRON_SCHEDULING` availability (e.g., deprecation) require an RFC.
