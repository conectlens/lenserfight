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

LenserFight Community Edition is licensed under the **Apache License, Version 2.0**. Contributors may fork, modify, redistribute, and use the code—including in commercial software—subject to Apache-2.0 notice requirements. The **LenserFight** name and logos are governed separately; see [Brand guidelines](/explanation/community/brand-guidelines) and [License](/explanation/community/license).

## Release Authority

- **Core maintainers** tag versioned releases (`vX.Y.Z`) and push to the registry.
- **Community members** may independently release documentation updates and example rubrics without a core maintainer tag.
