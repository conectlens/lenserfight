---
title: Public Beta Release Risk Register
description: Legal, security, privacy, misuse, OSS, governance, and documentation gates that must be closed before a public LenserFight beta release.
---

# Public Beta Release Risk Register

This register is a release gate for public beta launches. It is not legal advice. Jurisdiction-specific legal, privacy, consumer, export, professional-use, and liability questions require licensed attorney review.

## Release Decision

Default decision: **NO-GO** for public hosted beta until every `BLOCKER` and `HIGH` item below has an owner, evidence link, and explicit release decision.

## Legal Risk Register

| Severity | Finding | Risk | Required mitigation | Attorney review |
|----------|---------|------|---------------------|-----------------|
| BLOCKER | Hosted Terms include jurisdiction, indemnity, liability cap, privacy transfer, consumer, and professional-use language. | Invalid or unenforceable terms can create avoidable liability or regulatory exposure. | Licensed attorney review recorded in the release issue before public launch. | Required |
| HIGH | Experimental AI outputs may be treated as advice. | Users may rely on generated legal, financial, medical, security, or other professional output. | Keep README, Disclaimer, Terms, and templates clear that outputs are informational and require qualified review. | Required for hosted launch |
| MEDIUM | Apache-2.0 license and hosted-service terms can be confused. | Users may think hosted Terms restrict OSS code rights or that Apache-2.0 grants trademark/service rights. | Keep license, brand, README, and legal-policy split discoverable. | Recommended |

## Security Risk Register

| Severity | Finding | Risk | Required technical mitigation | Required docs |
|----------|---------|------|-------------------------------|---------------|
| HIGH | Agent/tool execution can cause prompt injection, unauthorized file/network access, data leakage, unsafe delegation, workflow loops, and cost burn. | Compromise of user data, third-party services, model-provider accounts, or infrastructure. | Least-privilege tools, write-class approval gates, egress limits, sandboxing where available, kill switches, loop/time limits, and spend caps. | README, Terms, SECURITY, tool-sandboxing, release checklist |
| HIGH | BYOK and provider credentials may leak through logs, DB rows, errors, screenshots, or model context. | Account compromise and provider billing abuse. | Dedicated keys, encrypted storage where needed, service-role-only decryption, redacted logs, key rotation, and leaked-secret playbook. | Privacy, SECURITY, BYOK docs |
| HIGH | Public battles, comments, votes, leaderboards, and profiles invite abuse. | Spam, harassment, manipulation, scraping, and moderation failures. | Rate limits, vote integrity checks, moderation queues, abuse reporting, admin override audit logs, and rollback flag. | Acceptable Use, cloud battle runbook |

## Privacy Risk Register

| Severity | Finding | Risk | Required mitigation | Evidence |
|----------|---------|------|---------------------|----------|
| HIGH | Prompts, outputs, uploads, workflow traces, logs, telemetry, BYOK records, public profiles, comments, likes, votes, and leaderboards may contain personal data. | Incomplete transparency, over-retention, or unexpected sharing with providers. | Verify implementation matches Privacy Policy categories, provider routing, retention, deletion, and backup exceptions. | Release issue must link verification notes |
| HIGH | Public sharing surfaces may expose content users expected to remain private. | Confidentiality and privacy complaints. | Visibility labels, publication confirmations, owner-only checks, RLS tests, and clear policy language. | RLS tests and UI review |
| MEDIUM | Analytics and security logs may collect IP, device, session, and behavior data. | Consent or transparency gaps. | Cookie consent where required, provider configuration review, retention review, and log minimization. | Privacy/Cookie review |

## Misuse Risk Register

| Severity | Finding | Risk | Required mitigation |
|----------|---------|------|---------------------|
| HIGH | Spam, scraping, credential theft, phishing, malware, illegal surveillance, harassment, and unauthorized automation. | Harm to users, third parties, and platform reputation. | AUP prohibitions, rate limits, abuse monitoring, reporting path, enforcement workflow, and incident response owner. |
| HIGH | Prompt libraries, templates, and workflows may normalize risky automation. | Users copy unsafe patterns into real deployments. | Template authoring checks, no secrets in examples, high-risk disclaimers, and review for external-write workflows. |
| MEDIUM | AI judges and leaderboards can be manipulated or over-trusted. | Bad incentives and unfair public reputation effects. | Vote integrity, moderation, audit logs, appeal/override path, and careful docs language. |

## OSS Compliance Checklist

- Apache-2.0 license metadata is present in root `LICENSE` and package metadata.
- Hosted Terms do not restrict Apache-2.0 code rights.
- Trademark/brand guidance is separate from code license.
- Dependency and asset provenance are reviewed before release.
- A root `NOTICE` file is added only if third-party attribution terms or project notices require it.
- Contributors are told not to submit material they lack rights to contribute.
- DCO/CLA decision is recorded before public beta; current default is Apache-2.0 contribution expectations unless maintainers choose a stricter process.

## Documentation Consistency Checklist

Before public beta, scan README, docs, app copy, onboarding, CLI help, examples, templates, and policy pages for unsupported claims:

- `production-ready`
- `secure by default`
- `safe`
- `guaranteed`
- `private`
- `anonymous`
- `encrypted`
- `compliant`
- `enterprise-ready`
- `no data stored`
- `zero risk`
- `fully isolated`
- `no data leaves`
- `no network calls`

Unsupported claims must be replaced with precise, qualified language or backed by evidence linked from the release issue.

## Required Evidence Before GO

- Attorney review recorded for hosted legal terms and privacy notices.
- `pnpm nx run docs:build --skip-nx-cache` passes.
- `pnpm nx run arena:build` passes for policy pages.
- Supabase RLS/security tests pass for public profiles, comments, likes, votes, leaderboards, BYOK refs, and workflow/tool execution surfaces.
- Abuse controls are verified on the target deployment: rate limits, moderation queue, kill switch, webhook signing secret, and operator escalation path.
- Privacy verification confirms retention/deletion behavior matches the published Privacy Policy.
- Claim scan is clean or every remaining claim has an evidence link.

## GO / NO-GO Rule

- **GO** only when all `BLOCKER` and `HIGH` items have evidence and accountable owners.
- **NO-GO** when attorney review is missing, privacy implementation is unverified, public battle abuse controls are unverified, or agent/tool execution can perform external writes without approval and operator rollback.
