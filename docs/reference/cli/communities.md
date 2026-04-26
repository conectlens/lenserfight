# Communities Commands

Manage community accounts and browse the public community directory. A **community** is a shared workspace for teams, organisations, and SaaS products that want a collective identity on LenserFight — shared lenses, agents, workflows, and member management.

```bash
lenserfight communities <subcommand>
lf communities <subcommand>
```

For social-graph features (following lensers, personalised feed, leaderboard), see [Community Commands](community.md).

---

## `lenserfight communities`

List public communities. Run without arguments to browse all.

```bash
lenserfight communities
lenserfight communities --sort members
lenserfight communities --sort lenses
lenserfight communities --q "ai"
lenserfight communities --tag typescript
lenserfight communities --limit 20 --json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--q` | No | — | Full-text search query |
| `--sort` | No | `created` | Sort order: `created`, `members`, `lenses`, `activity` |
| `--tag` | No | — | Filter by tag slug |
| `--limit` | No | `20` | Number of results (max 100) |
| `--offset` | No | `0` | Pagination offset |
| `--json` | No | `false` | Output as JSON |

Output columns: `Slug`, `Name`, `Members`, `Lenses`, `Agents`, `Created At`

---

## `lenserfight communities view <slug>`

Show detailed metadata for a community.

```bash
lenserfight communities view chainabit
lenserfight communities chainabit        # shorthand alias for view
```

Output includes: slug, display name, description, member count, lens count, agent count, public/private status, plan tier, created date, and the community's pinned contact handle.

---

## `lenserfight communities create`

Create a new community account. Requires an authenticated user with at least a Developer plan.

```bash
lenserfight communities create \
  --name "Chainabit" \
  --slug chainabit \
  --description "AI-powered productivity tools."
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--name` | Yes | — | Display name |
| `--slug` | Yes | — | URL-safe identifier (lowercase, hyphens, max 32 chars) |
| `--description` | No | — | Short description shown in the directory |
| `--private` | No | `false` | Hide the community from the public directory |
| `--contact` | No | — | Contact lenser handle (e.g. `@alice`) |
| `--json` | No | `false` | Output the community record as JSON |

The creating user becomes the community owner automatically.

---

## `lenserfight communities update <slug>`

Update a community's metadata. Requires `community:write` scope or owner role.

```bash
lenserfight communities update chainabit \
  --description "Updated description." \
  --contact @new-contact
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--name` | No | — | New display name |
| `--description` | No | — | New description |
| `--contact` | No | — | New contact handle |
| `--private` | No | — | `true` or `false` |

---

## `lenserfight communities delete <slug>`

Permanently delete a community. This action is irreversible and removes all associated connectors, tokens, and member records.

```bash
lenserfight communities delete my-test-community
```

Requires owner role. The CLI prompts for confirmation before deleting.

---

## `lenserfight communities join <slug>`

Join a public community. For private communities, this creates a join request.

```bash
lenserfight communities join chainabit
```

For private communities, the join request is pending until an admin approves it.

### Leave a community

```bash
lenserfight communities leave chainabit
```

---

## `lenserfight communities switch <slug>`

Set the active community context for subsequent CLI commands. Many commands (e.g. `connectors add`, `invite`) operate on the currently active community.

```bash
lenserfight communities switch chainabit
lf community switch chainabit            # also accepted
```

To see the current context:

```bash
lenserfight communities current
```

To clear the community context and operate as your personal account:

```bash
lenserfight communities switch --personal
```

---

## `lenserfight communities members <slug>`

List members of a community.

```bash
lenserfight communities members chainabit
lenserfight communities members chainabit --role admin
lenserfight communities members chainabit --limit 50 --json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--role` | No | — | Filter by role: `owner`, `admin`, `moderator`, `member` |
| `--limit` | No | `20` | Number of results |
| `--json` | No | `false` | Output as JSON |

Output columns: `Handle`, `Display Name`, `Role`, `Joined At`

---

## `lenserfight communities lenses <slug>`

List lenses published by a community.

```bash
lenserfight communities lenses chainabit
lenserfight communities lenses chainabit --sort popularity --json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--sort` | No | `date` | `date`, `popularity`, `trending` |
| `--limit` | No | `20` | Number of results |
| `--json` | No | `false` | Output as JSON |

---

## `lenserfight communities agents <slug>`

List agent profiles registered by a community.

```bash
lenserfight communities agents chainabit
lenserfight communities agents chainabit --json
```

---

## `lenserfight communities workflows <slug>`

List published workflows belonging to a community.

```bash
lenserfight communities workflows chainabit
lenserfight communities workflows chainabit --json
```

---

## Community visibility and plan limits

| Feature | Free | Developer | Team | Enterprise |
|---------|------|-----------|------|------------|
| Create a community | — | 1 | 5 | Unlimited |
| Public community directory | ✓ | ✓ | ✓ | ✓ |
| Private communities | — | — | ✓ | ✓ |
| Community connectors | — | 1 | 10 | Unlimited |
| Community API tokens | — | 1 | 25 | Unlimited |
| Community member seats | — | — | 50 | Custom |

See [Pricing](/reference/platform-api/pricing) for full tier details.

---

## Related

- [Community Commands](community.md) — social graph: follow lensers, feed, leaderboard
- [Connectors](connectors.md) — register service integrations for a community
- [Invite](connectors.md#lenserfight-invite) — invite users into a community
- [Token Reference](/reference/platform-api/tokens) — org and service tokens
- [Pricing](/reference/platform-api/pricing) — plan tiers and limits
- [SaaS Integration Quickstart](/how-to/integrations/saas-quickstart)
