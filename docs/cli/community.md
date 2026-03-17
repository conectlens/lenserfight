# Community Commands

Phase 3/4 features: follow lensers, follow tags, view your personalised feed, check the activity leaderboard, and report content.

---

## `lenserfight lenser`

Manage lenser follow relationships and discover suggested lensers.

```
lenserfight lenser <subcommand>
```

### `lenser follow <id>`

Follow a lenser by their UUID.

```bash
lenserfight lenser follow <lenser-uuid>
```

> **Note:** The `follow` command requires a UUID, not a handle. Lenser UUIDs appear in the `ID` column of `lenser followers` and `lenser following` output.

### `lenser unfollow <id>`

Unfollow a lenser by their UUID.

```bash
lenserfight lenser unfollow <lenser-uuid>
```

### `lenser followers`

List followers of a lenser. Defaults to your own profile.

```bash
lenserfight lenser followers
lenserfight lenser followers --id <lenser-uuid>
lenserfight lenser followers --limit 50
lenserfight lenser followers --json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--id` | No | authenticated lenser | Lenser UUID to query |
| `--limit` | No | `20` | Number of results |
| `--json` | No | `false` | Output as JSON |

Output columns: `ID`, `Handle`, `Display Name`, `Following Back`

### `lenser following`

List lensers that a user follows. Defaults to your own profile.

```bash
lenserfight lenser following
lenserfight lenser following --id <lenser-uuid>
lenserfight lenser following --limit 50 --json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--id` | No | authenticated lenser | Lenser UUID to query |
| `--limit` | No | `20` | Number of results |
| `--json` | No | `false` | Output as JSON |

Output columns: `ID`, `Handle`, `Display Name`, `Follows You`

### `lenser suggested`

Show lensers you might want to follow, ranked by tag interest overlap.

```bash
lenserfight lenser suggested
lenserfight lenser suggested --limit 20
lenserfight lenser suggested --json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--limit` | No | `10` | Number of suggestions |
| `--json` | No | `false` | Output as JSON |

Output columns: `ID`, `Handle`, `Display Name`, `Score`

> Requires an active lenser profile. Follow more tags to improve suggestion quality.

---

## `lenserfight tag`

Follow tags to personalise your content feed.

```
lenserfight tag <subcommand>
```

### `tag follow <slug>`

Follow a tag by its slug.

```bash
lenserfight tag follow typescript
lenserfight tag follow ai
```

Tag slugs are visible in the forum URL: `/len/<slug>`.

### `tag unfollow <slug>`

Unfollow a tag.

```bash
lenserfight tag unfollow typescript
```

### `tag followed`

List all tags you are currently following.

```bash
lenserfight tag followed
lenserfight tag followed --json
```

Output columns: `Tag ID`, `Slug`, `Name`, `Followed At`

---

## `lenserfight feed`

View your personalised content feed — threads or prompts scored by your interests.

```bash
lenserfight feed
lenserfight feed --type prompts
lenserfight feed --limit 20
lenserfight feed --json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--type` | No | `threads` | `threads` or `prompts` |
| `--limit` | No | `10` | Number of items to show |
| `--json` | No | `false` | Output as JSON |

Output columns: `ID`, `Title`, `Score`, `Language`

**Score** is computed as `0.30×tag_similarity + 0.25×language_match + 0.20×hot_score + 0.15×author_reputation + 0.10×followed_author`.

> Requires authentication and a lenser profile. Scores improve as you follow more lensers and tags.

---

## `lenserfight leaderboard`

Show the lenser activity leaderboard, ranked by engagement score.

```bash
lenserfight leaderboard
lenserfight leaderboard --period weekly
lenserfight leaderboard --period monthly --limit 50
lenserfight leaderboard --json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--period` | No | `all_time` | `weekly`, `monthly`, or `all_time` |
| `--limit` | No | `20` | Number of entries to show |
| `--json` | No | `false` | Output as JSON |

Output columns: `Rank`, `Handle`, `Display Name`, `XP`, `Level`, `Score`

> No authentication required. This is a public endpoint.

---

## `lenserfight report`

Report a thread or prompt template for moderation review.

```bash
lenserfight report \
  --type thread \
  --id <content-uuid> \
  --reason spam

lenserfight report \
  --type prompt_template \
  --id <content-uuid> \
  --reason misinformation
```

| Flag | Required | Description |
|------|----------|-------------|
| `--type` | Yes | `thread` or `prompt_template` |
| `--id` | Yes | UUID of the content to report |
| `--reason` | Yes | `spam`, `harassment`, `misinformation`, `off_topic`, or `other` |

Reports are idempotent — reporting the same content twice has no effect. Content with 3 or more unique reports is automatically excluded from personalised feeds.

> Requires authentication.

---

## Related

- [Auth Commands](auth.md) — log in before using community commands
- [Feed Personalisation](../explanations/concepts.md)
