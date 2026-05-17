# Maintainers

This file lists the maintainers of `lenserfight` and the `@lenserfight/sdk` package,
their responsibilities, and the path to becoming a maintainer.

## Tiers

### Core maintainers

Full write access. RFC merge authority. Release gate sign-off for `@lenserfight/sdk` and platform migrations.

| Name | GitHub | Area |
|------|--------|------|
| LenserFight | @lenserfight | All |

### Contributor maintainers

Area write access after sustained contribution. Can review and merge feature PRs in their area. No RFC merge authority alone. Must have two Core approvals for SDK-touching changes.

### Triage maintainers

Can label, close, and redirect issues. No merge access.

---

## Promotion path

**Triage → Contributor:** Three merged PRs in a 90-day window within one area, nominated by a Core maintainer, seconded by one other Core maintainer.

**Contributor → Core:** Six months active as Contributor maintainer, unanimous vote by all existing Core maintainers, no active objections from the community.

---

## Responsibilities

| Tier | Responsibility | SLA |
|------|---------------|-----|
| Core | `@lenserfight/sdk` release sign-off | Per release |
| Core | RFC decisions (FCP call + merge) | Within 7 days of FCP call |
| Core | Security advisories | Acknowledge within 48 h |
| Contributor | Code review in area | Within 5 business days |
| Triage | Label new issues | Within 48 h |

---

## Secrets (Core only)

- `NPM_TOKEN` — scoped to `@lenserfight/*` publish on npmjs.org. Contact an existing Core maintainer for rotation procedure.
- All other repository secrets are documented in the internal runbook (private).

---

## Sponsor perks

GitHub Sponsors at the **Infrastructure** tier receive a managed LenserFight cloud deployment
with `CRON_SCHEDULING` pre-enabled. See [`docs/rfcs/rfc-process.md`](docs/rfcs/rfc-process.md)
for governance rules around this feature.

## Paid roles and commercial engagement

Open-source contributions are voluntary and do not create employment or payment rights.

If LenserFight introduces sponsored maintainer programs, bounties, grants, contractor roles, or other paid opportunities in the future, they will be announced separately with clear written terms.

Any current paid or commercial collaboration requires a separate written agreement with the maintainers. Contact: lets@conectlens.com