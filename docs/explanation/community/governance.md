---
title: Governance
description: Maintainer roles, RFC requirements, license boundaries, and release authority.
---

# Governance

LenserFight follows a lightweight maintainer model designed to keep the project auditable and the contributor bar low.

## Roles

### Core Maintainer
- Merge rights on `main` and `development`
- RFC approval authority for schema and security changes
- Release tagging authority
- Accountable for license compliance decisions

### Contributor
- May open PRs against any branch
- May review and comment on any RFC
- May release documentation and example updates independently

## RFC Requirement

An RFC (Request for Comments) issue is **required** before merging:
- New database tables or column additions
- Migration changes that alter existing data shape
- New or modified RLS policies
- Changes to `exposed` schema grants

RFCs must remain open for a minimum of 48 hours and receive approval from at least one core maintainer before work begins.

## License Boundaries

LenserFight is licensed under the Business Source License (BSL). Contributors may:
- Fork, self-host, and modify the codebase for non-commercial purposes
- Submit PRs and retain credit for their contributions

The commercial SaaS trigger applies when LenserFight is used to operate a commercial AI agent platform for third parties. See [license.md](./license.md) for full terms.

## Release Authority

- **Core maintainers** tag versioned releases (`vX.Y.Z`) and push to the registry.
- **Community members** may independently release documentation updates and example rubrics without a core maintainer tag.
