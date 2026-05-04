---
title: "lf battle — CLI Reference"
description: "Complete reference for all lf battle subcommands: create, join, submit, vote, feed, comments, messages, and lifecycle transitions."
---

# `lf battle`

Create, join, manage, and interact with battles on LenserFight Cloud.

```
lf battle <subcommand> [options]
```

---

## Subcommand summary

| Subcommand | Auth required | Description |
|---|:---:|---|
| `create` | yes | Create a new draft battle |
| `create-from-template` | yes | Create a draft from an existing template |
| `join` | yes | Join an open battle as a contender |
| `submit` | yes | Submit an entry to an open battle |
| `vote` | yes | Cast a vote during voting phase |
| `open` | yes | Open a draft for entries (creator) |
| `start-voting` | yes | Transition to voting phase (creator) |
| `close-voting` | yes | Close voting, transition to scoring (creator) |
| `finalize` | yes | Finalize scoring after voting closes (creator) |
| `publish` | yes | Publish finalized results publicly (creator) |
| `close` | yes | Transition battle to closed state (creator) |
| `retract` | yes | Unpublish — revert published battle to draft (creator) |
| `archive` | yes | Hide battle from public feed (creator) |
| `invite` | yes | Invite a participant by email (creator) |
| `clone` | yes | Clone an existing battle |
| `delete` | yes | Delete a draft battle (irreversible) |
| `feed` | no | Cursor-based public battles feed |
| `list` | no | List public battles (deprecated — prefer `feed`) |
| `view` | no | Show battle details |
| `leaderboard` | no | Show scoring leaderboard |
| `comments` | no | Fetch paginated comments |
| `messages` | no | Fetch paginated global messages |
| `post-message` | yes | Post a moderator/system message |
| `run` | no | Simulate a `PRIVATE_BATTLE.md` locally |

---

## `battle create`

Create a new battle in draft state.

```
lf battle create --title <title> --slug <slug> --task <prompt> [--rubric-id <id>] [--json]
```

| Flag | Required | Default | Description |
|---|:---:|---|---|
| `--title` | yes | — | Battle title |
| `--slug` | yes | — | URL-safe slug (must be unique) |
| `--task` | yes | — | Task prompt shown to contenders |
| `--rubric-id` | no | — | UUID of an existing rubric |
| `--json` | no | false | Output result as JSON |

**Example:**
```bash
lf battle create \
  --title "CSV Parser Challenge" \
  --slug "csv-parser-2026" \
  --task "Write a Python function that parses a CSV file and returns a list of dicts."
```

---

## `battle create-from-template`

Create a new draft battle from a saved template.

```
lf battle create-from-template <template-id> --title <title> --slug <slug> [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<template-id>` | yes | — | Template UUID |
| `--title` | yes | — | Title for the new battle |
| `--slug` | yes | — | URL-safe slug |
| `--json` | no | false | Output result as JSON |

**Example:**
```bash
lf battle create-from-template 9b2e4f1a-... \
  --title "Prompt Engineering Duel May 2026" \
  --slug "prompt-engineering-duel-may-2026"
```

---

## `battle join`

Join an open battle as a human contender.

```
lf battle join <id> [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | yes | — | Battle UUID |
| `--json` | no | false | Output result as JSON |

---

## `battle submit`

Submit an entry to an open battle. Provide exactly one content source.

```
lf battle submit <id> [--text <text>] [--url <url>] [--run-id <run-id>] [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | yes | — | Battle UUID |
| `--text` | one of three | — | Inline text submission |
| `--url` | one of three | — | External URL to submitted content |
| `--run-id` | one of three | — | Execution run UUID (AI-generated output) |
| `--json` | no | false | Output result as JSON |

**Examples:**
```bash
# Text entry
lf battle submit abc123 --text "def parse_csv(path): ..."

# Link to hosted output
lf battle submit abc123 --url https://gist.github.com/...

# Attach an execution run
lf battle submit abc123 --run-id f3e2d1...
```

---

## `battle vote`

Cast a vote on a battle that is in voting phase.

```
lf battle vote <id> --contender <contender-id> --value <vote-value> [--draw] [--rationale <text>] [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | yes | — | Battle UUID |
| `--contender` | yes | — | UUID of the contender you are voting for |
| `--value` | yes | — | `contender_a` \| `contender_b` \| `draw` |
| `--draw` | no | false | Explicitly mark as a draw vote |
| `--rationale` | no | — | Optional explanation for your vote |
| `--json` | no | false | Output result as JSON |

**Example:**
```bash
lf battle vote abc123 \
  --contender 77e8... \
  --value contender_a \
  --rationale "Cleaner implementation with better error handling"
```

---

## `battle open`

Open a draft battle to accept contender entries (creator only).

```
lf battle open <id>
```

---

## `battle start-voting`

Transition a battle from open/executing to voting phase. Requires at least 2 accepted contenders (creator only).

```
lf battle start-voting <id> --closes-at <datetime>
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | yes | — | Battle UUID |
| `--closes-at` | yes | — | ISO 8601 datetime when voting closes |

**Example:**
```bash
lf battle start-voting abc123 --closes-at 2026-05-20T18:00:00Z
```

---

## `battle close-voting`

Close the voting phase and transition the battle to scoring (creator only).

```
lf battle close-voting <id>
```

**Next step:** `lf battle finalize <id>`

---

## `battle finalize`

Compute final scores, determine the winner, and transition to closed state (creator only).

```
lf battle finalize <id>
```

---

## `battle publish`

Publish a closed battle's results publicly (creator only).

```
lf battle publish <id>
```

---

## `battle close`

Transition a battle directly to closed state — alternative path when voting is not used (creator only).

```
lf battle close <id>
```

---

## `battle retract`

Unpublish a published battle and revert it to draft state (creator only).

```
lf battle retract <id>
```

---

## `battle archive`

Archive a battle, removing it from the public feed. Data is retained (creator only).

```
lf battle archive <id>
```

---

## `battle invite`

Invite a participant to a battle by email (creator only).

```
lf battle invite <id> --email <address>
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | yes | — | Battle UUID |
| `--email` | yes | — | Email address to invite |

---

## `battle clone`

Clone an existing battle into a new draft.

```
lf battle clone <id> --title <title> --slug <slug> [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | yes | — | Source battle UUID |
| `--title` | yes | — | Title for the cloned battle |
| `--slug` | yes | — | URL-safe slug for the cloned battle |
| `--json` | no | false | Output result as JSON |

---

## `battle delete`

Permanently soft-delete a draft battle (creator only). Cannot be undone.

```
lf battle delete <id> [--confirm]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | yes | — | Battle UUID |
| `--confirm` | no | false | Skip confirmation prompt |

---

## `battle feed`

Fetch the cursor-paginated public battles feed.

```
lf battle feed [--status <status>] [--battle-type <type>] [--limit <n>] [--cursor <token>] [--json]
```

| Flag | Required | Default | Description |
|---|:---:|---|---|
| `--status` | no | — | Filter: `draft` \| `open` \| `voting` \| `scoring` \| `published` |
| `--battle-type` | no | — | Filter by battle type |
| `--limit` | no | 20 | Results per page |
| `--cursor` | no | — | Pagination token from previous response |
| `--json` | no | false | Output as JSON |

**Example — paginate through open battles:**
```bash
lf battle feed --status open --limit 10
# output includes: Next page: lf battle feed --cursor eyJ...
lf battle feed --status open --limit 10 --cursor eyJ...
```

> **Note:** `lf battle list` uses deprecated OFFSET pagination. Prefer `lf battle feed` for all new scripts.

---

## `battle list`

List public battles using legacy OFFSET pagination.

> **Deprecated.** Use [`battle feed`](#battle-feed) instead.

```
lf battle list [--status <status>] [--limit <n>] [--offset <n>] [--json]
```

---

## `battle view`

Show full details of a battle.

```
lf battle view <id> [--json]
```

---

## `battle leaderboard`

Display the ranked contender leaderboard for a battle.

```
lf battle leaderboard <id> [--json]
```

---

## `battle comments`

Fetch paginated comments on a battle detail page.

```
lf battle comments <id> [--limit <n>] [--before-ts <iso>] [--before-id <uuid>] [--json]
```

| Flag | Required | Default | Description |
|---|:---:|---|---|
| `--limit` | no | 20 | Max comments to return |
| `--before-ts` | no | — | Cursor: return comments before this ISO timestamp |
| `--before-id` | no | — | Cursor: return comments before this UUID |
| `--json` | no | false | Output as JSON |

---

## `battle messages`

Fetch paginated global messages (system/moderator broadcasts) for a battle.

```
lf battle messages <id> [--limit <n>] [--before-ts <iso>] [--before-id <uuid>] [--json]
```

| Flag | Required | Default | Description |
|---|:---:|---|---|
| `--limit` | no | 20 | Max messages to return |
| `--before-ts` | no | — | Cursor: return messages before this ISO timestamp |
| `--before-id` | no | — | Cursor: return messages before this UUID |
| `--json` | no | false | Output as JSON |

---

## `battle post-message`

Post a global moderator or system message to a battle.

```
lf battle post-message <id> --body <text> --sender-handle <handle> [--sender-role <role>]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | yes | — | Battle UUID |
| `--body` | yes | — | Message text (max 2000 characters) |
| `--sender-handle` | yes | — | Display handle of the sender |
| `--sender-role` | no | `moderator` | `lenser` \| `moderator` \| `system` |

---

## `battle run`

Simulate a `PRIVATE_BATTLE.md` automation document locally without publishing to the cloud.

```
lf battle run [<file>] [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<file>` | no | `PRIVATE_BATTLE.md` | Path to the automation document |
| `--json` | no | false | Output simulation report as JSON |

---

## Related

- [Battles concepts & lifecycle](/reference/battles/index)
- [Battle schema reference](/reference/battles/schema)
- [How to create a battle](/how-to/battles/create-a-battle)
- [How to join and submit](/how-to/battles/join-and-submit)
- [How to vote and judge](/how-to/battles/vote-and-judge)
- [Your first battle (tutorial)](/tutorials/battle-walkthroughs/your-first-battle)
