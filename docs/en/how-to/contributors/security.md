# Security Policy

This is the canonical security guide for LenserFight. The GitHub community health file stays short and points here for the full policy.

## Supported Versions

LenserFight is experimental beta software. Security fixes are applied to the default development branches and current public beta release line. The project does not currently provide long-term support for old releases, forks, private deployments, or modified distributions unless maintainers announce a supported release line.

## Reporting a Vulnerability Privately

Report security vulnerabilities using **GitHub Security Advisories** (private by default):

1. Open the repository on GitHub.
2. Go to **Security**.
3. Select **Advisories**.
4. Choose **Report a vulnerability** (or create a new draft advisory, depending on permissions).

If you cannot access the Security tab, contact `security@lenserfight.com` or ask maintainers for a safe private reporting path first. Do not disclose publicly.

## Response Time Expectations

- **Acknowledgement**: within **72 hours** of receiving the report.
- **Initial triage**: within **7 days** (confirm impact/scope and next steps).

If a report is incomplete (missing reproduction or affected area), triage may take longer; we will ask for the minimum additional information needed.

## Scope

In scope:

- Vulnerabilities in the application code under `apps/` and shared libraries under `libs/`.
- Supabase RLS, grants, `SECURITY DEFINER`, storage, migrations, RPCs, and security configuration under `supabase/`.
- Cross-user data exposure in profiles, comments, likes, leaderboards, battles, workflows, media, prompts, logs, telemetry, generated content, or public sharing.
- Prompt-injection or model-output paths that can cause unauthorized tool use, file access, data leakage, command execution, provider-key exposure, unsafe delegation, workflow loops, or cross-user actions.
- BYOK/API key storage, encryption, logging, transmission, or disclosure weaknesses.
- Hosted platform, API, CLI, installer, deployment-template, or documentation issues that create practical security harm.
- Dependency, supply-chain, build, CI, or release issues with a clear LenserFight-specific impact.

Out of scope (examples):

- Generic AI hallucinations without a security, privacy, or abuse impact.
- Denial-of-service tests, scraping, load testing, spam, or rate-limit exhaustion without prior written authorization.
- Physical attacks, social engineering, phishing maintainers, or attacks against third-party providers.
- Findings that require destructive testing, persistence on systems you do not own, or access to another user's account or data.
- Vulnerabilities only present in substantially modified forks unless the same issue affects this repository.

## Safe Harbor for Good-Faith Research

We will not pursue legal action for good-faith security research that follows this policy, avoids privacy harm, avoids service disruption, uses only accounts and data you are authorized to access, and reports privately with enough detail for maintainers to reproduce and fix the issue. This is not permission to attack third-party services, bypass law, exfiltrate data, or run destructive tests.

## Research Rules

- Do not access, modify, delete, copy, or retain another user's data.
- Do not publish exploit details before maintainers confirm a disclosure plan.
- Do not run malware, credential theft, phishing, spam, mass scraping, or persistence tests.
- Do not test against production infrastructure in a way that degrades availability or increases costs.
- Stop immediately if you encounter secrets, personal data, private prompts, API keys, tokens, or cross-user content. Report what happened and delete local copies unless maintainers request a secure transfer.

## Reporting Agent and Tool-Execution Bugs

For agentic issues, include the smallest safe reproduction:

- deployment mode: local, self-hosted, hosted arena, CLI, gateway, or BYOK;
- affected agent, workflow, tool, connector, battle, or provider path;
- prompt/input/output snippets with secrets and personal data removed;
- whether the issue can trigger file access, command execution, network calls, external writes, cost consumption, or data exposure;
- expected approval/sandbox behavior and actual behavior.

## Leaked Secrets

If you find a leaked API key, model-provider key, OAuth token, Supabase service key, webhook secret, signing key, or private key:

1. Do not use it.
2. Do not paste it into public issues or chat.
3. Report privately with the file path, commit hash, log location, or screenshot context.
4. Maintainers should rotate the secret, invalidate affected sessions or tokens, review logs for misuse, and remove the secret from history where appropriate.

## Coordinated Disclosure

- Please do not publish details until a fix is available (or maintainers agree on a disclosure timeline).
- We will coordinate CVE requests only when necessary and when ownership is clear.

## Acknowledgements / Credit

We will acknowledge reporters in release notes or advisories when requested and when it is safe to do so. If you prefer to remain anonymous, we will respect that.
