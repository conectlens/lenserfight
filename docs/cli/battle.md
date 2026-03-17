# Battle Commands

Manage the full battle lifecycle from creation to publication.

```
lenserfight battle <subcommand>
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `create` | Create a new battle in draft status |
| `list` | List public battles |
| `view` | View a battle by ID |
| `open` | Open a draft battle for contenders |
| `join` | Join a battle as a contender |
| `submit` | Submit a response to a battle |
| `start-voting` | Begin the voting phase |
| `vote` | Cast a vote on a battle |
| `finalize` | Close voting and determine the winner |
| `publish` | Publish a closed battle |
| `invite` | Invite a contender by email |
| `delete` | Delete a draft battle |
| `clone` | Clone an existing battle as a new draft |
| `close` | Close an open battle to new submissions |
| `retract` | Retract (unpublish) a published battle |
| `leaderboard` | Show ranked results for a finalized battle |

---

## `battle create`

Create a new battle in draft status.

```bash
# Minimal — slug auto-generated from title
lenserfight battle create \
  --title "Leonardo da Vinci Challenge" \
  --prompt "Design an invention inspired by da Vinci..."

# Explicit slug
lenserfight battle create \
  --title "My Battle" \
  --slug "my-battle" \
  --prompt "Write a function that..."

# From a template (--prompt not needed)
lenserfight battle create \
  --title "Quick Code Battle" \
  --template <template-uuid>
```

Long `--prompt` values are summarised as `Pasted Text (N lines, M chars)` in the output — the full text is submitted.

| Flag | Required | Description |
|------|----------|-------------|
| `--title` | Yes | Battle title |
| `--slug` | No | URL-friendly slug (auto-generated if omitted) |
| `--prompt` | Yes* | Task prompt for contenders (*not needed with `--template`) |
| `--rubric` | No | Rubric UUID to attach |
| `--template` | No | Template UUID (overrides `--prompt`) |

---

## `battle list`

List public battles.

```bash
lenserfight battle list
lenserfight battle list --limit 20 --status voting
lenserfight battle list --json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--limit` | No | `10` | Number of battles to list |
| `--status` | No | — | Filter by status |
| `--json` | No | `false` | Output as JSON |

---

## `battle view`

View a battle by UUID.

```bash
lenserfight battle view <battle-id>
lenserfight battle view <battle-id> --json
```

---

## `battle open`

Open a draft battle so contenders can join.

```bash
lenserfight battle open <battle-id>
```

Requires authentication. Only the battle creator can open it.

---

## `battle join`

Join a battle as a contender.

```bash
lenserfight battle join <battle-id>
```

Returns your contender ID and assigned slot (contender_a or contender_b).

---

## `battle submit`

Submit a response to a battle.

```bash
lenserfight battle submit <battle-id> --text "my solution..."
lenserfight battle submit <battle-id> --file ./solution.ts
lenserfight battle submit <battle-id> --url https://gist.github.com/...
```

Long `--text` submissions are summarised in the output as `Pasted Text (N lines, M chars)`.

| Flag | Required | Description |
|------|----------|-------------|
| `--text` | One of | Submission text content |
| `--file` | One of | Path to file with submission content |
| `--url` | One of | URL to submission content |

---

## `battle start-voting`

Begin the voting phase for a battle.

```bash
# Relative offset (recommended)
lenserfight battle start-voting <battle-id> --closes-at +24h
lenserfight battle start-voting <battle-id> --closes-at +30m
lenserfight battle start-voting <battle-id> --closes-at +7d

# Absolute ISO 8601
lenserfight battle start-voting <battle-id> --closes-at "2026-04-01T00:00:00Z"
```

| Flag | Required | Description |
|------|----------|-------------|
| `--closes-at` | Yes | Voting close time: ISO 8601 or relative offset (`+Nm`, `+Nh`, `+Nd`) |

---

## `battle vote`

Cast a vote on a battle.

```bash
lenserfight battle vote <battle-id> --for contender_a --rationale "Better structure"
```

| Flag | Required | Description |
|------|----------|-------------|
| `--for` | Yes | `contender_a`, `contender_b`, or `draw` |
| `--rationale` | No | Reason for your vote |

---

## `battle finalize`

Close voting and determine the winner. Requires service role key (auto-resolved for local mode).

```bash
lenserfight battle finalize <battle-id>
```

---

## `battle publish`

Publish a closed battle to make its result page public.

```bash
lenserfight battle publish <battle-id>
```

---

## `battle invite`

Invite a contender to a battle by email.

```bash
lenserfight battle invite <battle-id> --email player@example.com
```

| Flag | Required | Description |
|------|----------|-------------|
| `--email` | Yes | Email of the person to invite |

---

## `battle delete`

Delete a draft battle before it goes public.

```bash
lenserfight battle delete <battle-id>
```

---

## `battle clone`

Clone an existing battle as a new draft.

```bash
lenserfight battle clone <battle-id> --title "My Clone"
lenserfight battle clone <battle-id> --title "My Clone" --slug "my-clone"
```

| Flag | Required | Description |
|------|----------|-------------|
| `--title` | Yes | Title for the cloned battle |
| `--slug` | No | URL-friendly slug (auto-generated if omitted) |

---

## `battle close`

Close an open battle to new submissions.

```bash
lenserfight battle close <battle-id>
```

---

## `battle retract`

Retract (unpublish) a published battle.

```bash
lenserfight battle retract <battle-id>
```

---

## `battle leaderboard`

Show ranked results for a finalized battle.

```bash
lenserfight battle leaderboard <battle-id>
lenserfight battle leaderboard <battle-id> --json
```

---

## Related

- [Battle Lifecycle Walkthrough](lifecycle.md)
- [Inspect Commands](inspect.md)
- [Run Commands](run.md)
- [How Battles Work](../battles/how-battles-work.md)
