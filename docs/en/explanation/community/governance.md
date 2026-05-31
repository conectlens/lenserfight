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

LenserFight Community Edition is licensed under the **MIT License**. Contributors may fork, modify, redistribute, and use the code—including in commercial software—subject to MIT License notice requirements. The **LenserFight** name and logos are governed separately; see [License](/en/explanation/community/license).

## Contributor expectations

Open-source contributions are voluntary. Contributing does not create employment, payment rights, ownership, or governance authority.
Maintainers are responsible for final merge and release decisions based on technical quality, security, long-term maintainability, and project direction.
Any paid collaboration or commercial engagement requires a separate written agreement with the maintainers.

## Release Authority

- **Core maintainers** tag versioned releases (`vX.Y.Z`) and push to the registry.
- **Community members** may independently release documentation updates and example rubrics without a core maintainer tag.
