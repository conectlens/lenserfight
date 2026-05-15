---
title: Legal Policies
description: How LenserFight separates open-source code terms from hosted service policies, privacy, cookies, and safety expectations for experimental AI features.
---

# Legal Policies

LenserFight has two legal layers:

1. **Open-source code** is governed by the repository license. The Community Edition code is Apache-2.0 unless a file says otherwise.
2. **Hosted services and public community surfaces** are governed by the Arena policies: [Terms](https://arena.lenserfight.com/policies/terms), [Privacy](https://arena.lenserfight.com/policies/privacy), [Cookies](https://arena.lenserfight.com/policies/cookies), and [Acceptable Use](https://arena.lenserfight.com/policies/acceptable-use).

Do not treat the hosted Platform terms as a restriction on the Apache-2.0 code license. Do treat them as binding rules for LenserFight-operated accounts, domains, API endpoints, public battles, community content, analytics, authentication, and hosted AI workflow surfaces.

## Why the wording is strict

LenserFight is experimental OSS for AI agents, public evaluations, autonomous workflows, generated media, and battle scoring. That means users and contributors must expect:

- inaccurate or unsafe AI outputs,
- permission mistakes in agent and workflow configuration,
- performance regressions and service interruptions,
- security bugs or data exposure risks,
- third-party model, OAuth, analytics, storage, and infrastructure dependencies,
- preview features that are implemented but not production-ready for every workload.

The public policies make this explicit so self-hosters, contributors, and hosted-service users understand the risk before relying on the Platform.

## OSS policy baseline

LenserFight policy docs follow common OSS governance expectations:

- use a recognized open-source license for code,
- keep contributor-facing rules discoverable,
- separate code license, conduct, security reporting, trademark/brand use, and hosted service terms,
- provide a private vulnerability reporting path,
- document preview surfaces and rollback controls before encouraging production use.

Reference points used for this policy pass include the Open Source Initiative license guidance, GitHub's community standards guidance for README, code of conduct, contributing, license, and security policy files, and OpenSSF Scorecard's emphasis on assessing OSS security posture.

## Agent-project safety baseline

For experimental AI-agent platforms, LenserFight uses these operating principles:

- Treat a tool-enabled agent as delegated authority, not as a chat-only assistant.
- Avoid mixed-trust deployments where unrelated or adversarial users can steer the same tool-enabled agent, gateway, browser profile, API key, or filesystem.
- Start with the smallest tool, file, network, provider, and spending scope that works; widen access only after logs and approvals show expected behavior.
- Prefer dedicated provider keys, OAuth apps, bot accounts, browser profiles, workspaces, and hosts for agent runtimes.
- Keep human approval in front of external writes, message sends, publication, destructive actions, production data, and high-impact decisions.
- Assume prompts, web pages, uploaded files, model outputs, and marketplace templates may contain hostile instructions.
- Keep logs sufficient for incident review, but redact secrets and minimize personal data.
- Provide a private security reporting channel and treat leaked secrets, cross-user data exposure, and tool-execution bypasses as security issues.

These principles are adapted from common lessons in current self-hosted AI-agent security guidance, including OpenClaw-style documentation that emphasizes single-operator trust boundaries, sandboxing, allowlists, dedicated credentials, audit logs, incident response, and least-privilege tool policies.

## Contributor checklist

Before publishing or changing user-facing docs, check:

- Does the page claim a preview or experimental feature is stable?
- Does it tell users when human review is required for AI or agent output?
- Does it avoid asking users to paste secrets, private keys, regulated data, or confidential third-party content into AI workflows?
- Does it route legal questions to the public policy pages rather than duplicating stale text?
- Does it preserve the distinction between Apache-2.0 code use and hosted LenserFight service use?

## Related

- [License](/en/explanation/community/license)
- [OSS Launch Scope](/en/explanation/community/oss-launch-scope)
- [Public Beta Release Risk Register](/en/explanation/community/beta-release-risk-register)
- [Known Preview Surfaces](/en/reference/known-preview-surfaces)
- [Security Policy](/en/how-to/contributors/security)
- [Brand guidelines](/en/explanation/community/brand-guidelines)
