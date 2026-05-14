---
title: AGENT_TEAM.md — Portable Team
description: Portable team definition with members, purpose, and collaboration rules.
---

# `AGENT_TEAM.md` — Portable team definition

A portable, strictly-typed team of agents (the legacy counterpart to native `TEAM.MD`). Use this when exchanging team definitions between systems or storing them with `kind: agent_team` semantics.

## Filename

- Canonical: `AGENT_TEAM.md`
- Container: `teams/<slug>/AGENT_TEAM.md`

## Required frontmatter

| Key | Type | Notes |
|---|---|---|
| `kind` | `agent_team` | Discriminator |
| `schema_version` | number | `1` |
| `id` | string | Stable id |
| `name` | string | Display name |

Common keys: `purpose`, `team_lead_agent`, `members[]` (with `agent_id`, `role`), `shared_tools[]`.

## Required sections

- `# Team Purpose`
- `# Members`
- `# Collaboration Rules`

## Validation rules

- All three sections must be present.
- Frontmatter `kind`, `schema_version`, `id`, `name` required.
- Disclaimer markers applied if legal/finance tags or keywords appear.

## Canonical template

```yaml
---
kind: agent_team
schema_version: 1
id: team_<uuid>
slug: research-ops
name: Research Ops Team
description: Multi-agent team for researching, validating, and reporting findings.
owner: { workspace_id: ws_<uuid> }
visibility: workspace
version: 0.1.0
status: active
purpose: Produce validated research reports with human approval for publication.
team_lead_agent: agent_research_lead
members:
  - agent_id: agent_research_lead
    role: lead
shared_tools: [web.search]
---

# Team Purpose
Why the team exists and what outcomes it owns.

# Members
Member list, roles, responsibilities, and lead/backup structure.

# Collaboration Rules
Delegation, review, conflict resolution, and communication norms.
```

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [Native `TEAM.MD`](./team-md)
- [Legacy `LENSER.MD`](./lenser-md-legacy)
