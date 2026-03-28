# Security Policy

This is the canonical security guide for LenserFight. The GitHub community health file stays short and points here for the full policy.

## Supported Versions

LenserFight is under active development. Security fixes are applied to the default branches (`development` and `main`) rather than maintained release lines.

## Reporting a Vulnerability Privately

Report security vulnerabilities using **GitHub Security Advisories** (private by default):

1. Open the repository on GitHub.
2. Go to **Security**.
3. Select **Advisories**.
4. Choose **Report a vulnerability** (or create a new draft advisory, depending on permissions).

If you cannot access the Security tab, do not disclose the issue publicly. Ask maintainers for a safe private reporting path first.

## Response Time Expectations

- **Acknowledgement**: within **72 hours** of receiving the report.
- **Initial triage**: within **7 days** (confirm impact/scope and next steps).

If a report is incomplete (missing reproduction or affected area), triage may take longer; we will ask for the minimum additional information needed.

## Scope

In scope:

- Vulnerabilities in the application code under `apps/` and shared libraries under `libs/`
- Supabase policies, migrations, and security configuration under `supabase/` (if present)
- Documentation that could cause security harm (for example, instructions that leak secrets)

Out of scope (examples):

- Reports that require physical access to a developer machine
- Issues in third-party dependencies without a clear LenserFight-specific impact

## Coordinated Disclosure

- Please do not publish details until a fix is available (or maintainers agree on a disclosure timeline).
- We will coordinate CVE requests only when necessary and when ownership is clear.

## Acknowledgements / Credit

We will acknowledge reporters in release notes or advisories when requested and when it is safe to do so. If you prefer to remain anonymous, we will respect that.
