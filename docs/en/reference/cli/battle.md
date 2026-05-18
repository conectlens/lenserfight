---
title: "lf battle — CLI Reference"
description: "Complete reference for all lf battle subcommands: create, join, submit, vote, feed, comments, messages, lifecycle transitions, local offline battles, and BYOK cloud execution."
---

# `lf battle`

Create, join, manage, and interact with battles on LenserFight Cloud. Use `lf battle local` for fully offline battles on your machine.

```
lf battle <subcommand> [options]
```

---

## Running from source (monorepo contributors)

The `lf` binary lives in [`apps/cli`](../../../../apps/cli) and is **not** published to npm during development. If you cloned the repo and tried to run `lf battle`, you may see:

```
bash: /home/<you>/.npm-global/bin/lf: Permission denied
```

This happens because the build output (`dist/apps/cli/main.js`) doesn't yet have the executable bit set. Fix it with the Nx targets:

```bash
# 1. Build the CLI
pnpm nx run cli:build

# 2. Set the executable bit on the output
pnpm nx run cli:chmod

# 3. Link it globally so `lf` resolves in your shell
pnpm nx run cli:link
```

After `link`, `lf battle` works from any directory. Re-run `cli:build` (and `cli:chmod` if needed) whenever you change source files — or use the watch mode for continuous rebuilds:

```bash
pnpm nx run cli:serve
```

`cli:serve` rebuilds on every file change but does **not** re-link; the linked binary auto-picks up the new `dist/apps/cli/main.js` without relinking.

::: tip Already linked but still getting Permission denied?
Run `pnpm nx run cli:chmod` — the executable bit is sometimes lost after a clean build that regenerates `dist/apps/cli/main.js`.
:::

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
| `rematch` | yes | Create a draft rematch from a finalized battle (creator) |
| `delete` | yes | Delete a draft battle (irreversible) |
| `exec` | yes* | Execute a cloud battle with BYOK keys (no credits) |
| `feed` | no | Cursor-based public battles feed |
| `list` | no | List public battles (deprecated — prefer `feed`) |
| `view` | no | Show battle details |
| `leaderboard` | no | Show scoring leaderboard |
| `comments` | no | Fetch paginated comments |
| `messages` | no | Fetch paginated global messages |
| `post-message` | yes | Post a moderator/system message |
| `run` | no | Simulate or execute a `PRIVATE_BATTLE.md` locally |
| `local init` | no | Create a new offline local battle |
| `local add-contender` | no | Add a contender slot to a local battle |
| `local run` | no | Execute local battle with BYOK keys |
| `local vote` | no | Record a vote on a local battle |
| `local status` | no | Show local battle state and vote tally |
| `local list` | no | List all local battles |
| `local push` | yes | Publish a local battle shell to LenserFight Cloud |
| `stream-feed` | yes | Tail INSERT/UPDATE events on `battles.battles` via Supabase realtime |
| `validate` | no | Validate a battle creation configuration (V1 legacy or V2 concept-separated) |
| `formats` | no | List supported task sources with allowed contender structures and judging modes |
| `challenge-types` | no | List supported human game/challenge types |
| `explain-invalid` | no | Explain why a task-source / contender / judging combination is invalid |

*`exec`: auth only required when using `--stream-to-web`

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

## `battle new --from-template`

Friendly wrapper around `create-from-template` introduced in Phase AW. Resolves a public template by slug *or* UUID, prompts for title and slug if they are not provided, and creates the new battle.

```
lf battle new --from-template <slug|uuid> [--title <title>] [--slug <slug>] [--json]
```

| Flag | Required | Default | Description |
|---|:---:|---|---|
| `--from-template` | yes | — | Public template slug *or* UUID |
| `--title` | no | prompted | Battle title |
| `--slug` | no | derived | URL-safe slug; defaults to a slugified title |
| `--json` | no | false | Output JSON |

**Example:**
```bash
lf battle new --from-template reasoning-quality-shootout \
  --title "Reasoning Quality Shootout — May 12" \
  --slug "reasoning-quality-shootout-2026-05-12"
```

Backed by `fn_list_public_battle_templates` (slug resolution) and `fn_battles_create_from_template` (creation).

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

Submit an entry to an open battle. Provide exactly one content source among `--text`, `--url`, `--run-id`, or `--workflow`.

```
lf battle submit <id> [--text <text>] [--url <url>] [--run-id <run-id>] [--workflow <id>] \
  [--attestation] [--envelope-kid <uuid>] [--envelope-iat <iso>] [--envelope-nonce <text>] \
  [--canonical-jcs-b64url <b64url>] [--signature-b64url <b64url>] \
  [--workflow-hash <text>] [--lens-hash <text>] [--agent-config-hash <text>] \
  [--lenser-version <text>] [--cli-version <text>] [--agent <uuid>] [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | yes | — | Battle UUID |
| `--text` | one of four | — | Inline text submission |
| `--url` | one of four | — | External URL to submitted content |
| `--run-id` | one of four | — | Execution run UUID (AI-generated output) |
| `--workflow` | one of four | — | Workflow UUID for workflow-type submission |
| `--attestation` | no | false | With `--run-id`, record a **signed** execution attestation via `fn_record_signed_attestation` (requires envelope + signature flags) |
| `--envelope-kid` | with signed path | — | Device UUID (`kid`) for the signed envelope |
| `--envelope-iat` | with signed path | — | Envelope issued-at (ISO timestamptz) |
| `--envelope-nonce` | with signed path | — | Replay-protection nonce |
| `--canonical-jcs-b64url` | with signed path | — | Base64url JCS-canonical envelope bytes |
| `--signature-b64url` | with signed path | — | Base64url Ed25519 signature |
| `--workflow-hash` | no | — | Optional metadata forwarded to `fn_record_signed_attestation` |
| `--lens-hash` | no | — | Optional metadata for signed attestation |
| `--agent-config-hash` | no | — | Optional metadata for signed attestation |
| `--lenser-version` | no | — | Optional lenser/daemon version metadata |
| `--cli-version` | no | — | Optional `lf` CLI version metadata |
| `--agent` | with `--workflow` | — | Agent UUID |
| `--json` | no | false | Output result as JSON |

**Examples:**
```bash
# Text entry
lf battle submit abc123 --text "def parse_csv(path): ..."

# Link to hosted output
lf battle submit abc123 --url https://gist.github.com/...

# Attach an execution run
lf battle submit abc123 --run-id f3e2d1...

# Signed local attestation (envelope fields from gateway/lenser)
lf battle submit abc123 --run-id f3e2d1... --attestation \
  --envelope-kid <device-uuid> --envelope-iat 2026-05-09T00:00:00Z \
  --envelope-nonce <nonce> --canonical-jcs-b64url <b64url> --signature-b64url <b64url> \
  --workflow-hash <optional> --lens-hash <optional>
```

---

## `battle series` (Phase BH)

Run a best-of-N tournament composed of full battles derived from the same template. The series tracks the current round; `advance` promotes the winner of the current round and seeds the next, then stamps `status = complete` after the final round.

```bash
# Create a 5-round series from a template you own (or any public template).
lf battle series create --template <template-id> --title "Spring tournament" --rounds 5

# Inspect status — per-round battle slug, status, winner.
lf battle series view <series-id>
lf battle series view <series-id> --json

# Promote the current round's winner and seed the next battle.
# Errors with 22023 'current_round_has_no_winner' if the current round is
# still in voting / scoring / open; 42501 'series_not_owned' if you are not
# the creator.
lf battle series advance <series-id>
```

The corresponding HTTP route on the web app is `/battles/series/:id`. Owners see an "Advance series" button once the current round's battle reaches `closed`.

---

## `battle template` (Phase BD)

Author and manage your own battle templates. Each subcommand is owner-scoped:
RPCs raise `42501 template_not_owned` when you try to mutate someone else's.

```bash
# Create a new private template.
lf battle template create \
  --title "Quick poem face-off" \
  --prompt "Write a 4-line poem on the prompt: {{topic}}" \
  --category creative

# Publish it (or pass --public at create time).
lf battle template update <template-id> --public

# Rename a published template — only the fields you pass are touched.
lf battle template update <template-id> --title "Quick poem duel"

# Soft-delete (sets deleted_at; row remains in the database).
lf battle template delete <template-id>
lf battle template delete <template-id> --force
```

| Flag | Purpose |
|------|---------|
| `--title` | Required on create; optional patch on update. |
| `--prompt` | Required on create; optional patch on update. |
| `--description` | Short blurb shown in the gallery card. |
| `--category` | One of `creative\|technical\|business\|gaming`. |
| `--max-contenders` | Defaults to 2 on create. |
| `--public` / `--no-public` | Toggle visibility in the public gallery. |
| `--json` | Print the RPC return row. |

---

## `battle submit-media` (Phase BC)

Upload an image / video / audio file as a contender submission. The file is
streamed to the private `battles-media` Storage bucket under
`<battle-id>/<contender-id>/<timestamp>-<name>`, a 24-hour signed URL is
generated, and the URL is stored on `battles.submissions` together with the
MIME type and the inferred output modality.

```
lf battle submit-media <battle-id> --file <path> --contender-id <id> [--modality image|video|audio] [--json]
```

| Flag | Required | Notes |
|------|----------|-------|
| `<battle-id>` | yes | Battle UUID. |
| `--file` | yes | Local path; ≤ 50 MB. |
| `--contender-id` | yes | Contender UUID — caller must own it. |
| `--modality` | no | Forces the modality. By default it is inferred from the file's MIME type prefix. |
| `--json` | no | Print the submission row as JSON. |

Errors:
- `42501 contender_not_owned` — you do not own this contender.
- `22023 invalid_output_modality` — modality is not one of `image|video|audio`.
- Upload errors from the Storage API are surfaced verbatim.

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

## `battle rematch`

Create a draft rematch from a finalized parent battle. The caller must own the parent and the parent must be in a terminal status (`closed`, `published`, or `archived`). Structural fields are copied; vote totals, voter records, and contender comments are not. See [Rematches, Replays, and Series](/en/explanation/battles/rematches-and-series) for the full preservation contract.

```
lf battle rematch <slug> [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<slug>` | yes | — | Source battle slug |
| `--json` | no | false | Output `{ rematch_id, slug }` as JSON |

**Example:**
```bash
lf battle rematch csv-parser-2026
# i Resolving battle: csv-parser-2026
# ✔ Created rematch: csv-parser-2026-r3a7f2c

lf battle rematch csv-parser-2026 --json
# { "rematch_id": "9b2e4f1a-...", "slug": "csv-parser-2026-r3a7f2c" }
```

The new battle starts in `draft`. Run `lf battle open` (and the rest of the lifecycle) on it as you would any new battle.

**Error cases:**

| Error | Cause |
|---|---|
| Slug not found | The slug doesn't resolve via PostgREST. Check spelling; soft-deleted parents also surface as not-found. |
| `parent_battle_not_terminal` | The parent battle is still `draft` / `open` / `voting` / `scoring`. Finalize and close it first. |
| `not_battle_owner` | The signed-in lenser is not the parent's `creator_lenser_id`. Only the original creator can spawn a rematch. |
| `authentication_required` | Run `lf auth login` (or `lf profile use`) before retrying. |

For tournament-style chains where rematches are spawned automatically on a cron schedule, see [How to: rematch and series](/en/how-to/battles/rematch-and-series).

---

## `battle delete`

Permanently delete a draft battle (creator only). Cannot be undone.

```
lf battle delete <id> --confirm
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | yes | — | Battle UUID |
| `--confirm` | yes | false | Required: confirm deletion. The CLI shows an impact summary before proceeding. |

Every deletion is recorded in `~/.lenserfight/audit.log`.

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

Simulate or execute a `PRIVATE_BATTLE.md` automation document locally.

```
lf battle run [<file>] [--execute] [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<file>` | no | `PRIVATE_BATTLE.md` | Path to the automation document |
| `--execute` | no | false | Call AI providers and stream outputs (requires `provider`+`model` in participant frontmatter) |
| `--json` | no | false | Output report as JSON |

Without `--execute`: validates the file structure and generates a simulation report — no API calls made. With `--execute`: streams both contenders to the terminal, writes `{slug}.result.md` and `{slug}.result.json`.

**Example:**
```bash
# Dry-run validation only
lf battle run PRIVATE_BATTLE.md

# Execute both AI contenders
lf battle run PRIVATE_BATTLE.md --execute
```

---

## `battle exec`

Execute a LenserFight Cloud battle using your own provider API keys (BYOK). No platform credits are charged.

```
lf battle exec <battle-id> [--byok] [--stream-to-web] [--slot <A|B|both>]
  [--provider-a <p>] [--model-a <m>]
  [--provider-b <p>] [--model-b <m>]
  [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<battle-id>` | yes | — | Cloud battle UUID |
| `--byok` | no | false | Use your local provider API keys instead of platform credits |
| `--stream-to-web` | no | false | Broadcast each token to the web arena via Supabase Realtime |
| `--slot` | no | `both` | Execute `A`, `B`, or `both` contender slots |
| `--provider-a` | no | stored config | Override provider for slot A |
| `--model-a` | no | stored config | Override model for slot A |
| `--provider-b` | no | stored config | Override provider for slot B |
| `--model-b` | no | stored config | Override model for slot B |
| `--json` | no | false | Output execution summary as JSON |

The battle must be in `open` status before executing. After both slots complete, the battle auto-transitions to `voting`.

`--stream-to-web` requires `lf auth login` — the broadcast channel is authenticated to prevent spoofing.

**Examples:**
```bash
# Execute with your Anthropic key
lf battle exec abc123 --byok

# Override both models
lf battle exec abc123 --byok \
  --provider-a anthropic --model-a claude-sonnet-4-6 \
  --provider-b openai    --model-b gpt-4o

# Stream tokens to the web arena
lf battle exec abc123 --byok --stream-to-web

# Execute only slot A
lf battle exec abc123 --byok --slot A
```

---

## `battle byok-key`

Manage per-agent BYOK (Bring Your Own Key) provider credentials stored on the platform.

### `battle byok-key set`

Store or replace a BYOK API key for a provider.

```bash
lf battle byok-key set --agent <uuid> --provider <name> --key <value>
```

| Flag | Required | Description |
|---|:---:|---|
| `--agent` | yes | Agent UUID |
| `--provider` | yes | Provider name (e.g. `anthropic`, `openai`) |
| `--key` | yes | API key value |

### `battle byok-key list`

List registered BYOK providers for an agent.

```bash
lf battle byok-key list --agent <uuid>
```

| Flag | Required | Description |
|---|:---:|---|
| `--agent` | yes | Agent UUID |
| `--json` | no | Output as JSON |

### `battle byok-key revoke`

Permanently remove a BYOK key for a provider. The key cannot be recovered. Requires `--force`.

```bash
lf battle byok-key revoke --agent <uuid> --provider <name> --force
```

| Flag | Required | Description |
|---|:---:|---|
| `--agent` | yes | Agent UUID |
| `--provider` | yes | Provider to revoke |
| `--force` | yes | Required: confirm key revocation |

Re-provision after revocation with `lf battle byok-key set --agent <uuid> --provider <name>`. Every revocation is recorded in `~/.lenserfight/audit.log`.

---

## `battle force-transition`

Force a battle into a target status, bypassing normal lifecycle guards (admin only). Requires `--force` in CI.

```bash
lf battle force-transition <battle-id> --status <status> --reason <text> [--force]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<battle-id>` | yes | — | Battle UUID |
| `--status` | yes | — | Target status: `draft` \| `open` \| `executing` \| `voting` \| `scoring` \| `closed` \| `published` \| `archived` |
| `--reason` | yes | — | Reason for the forced transition (logged) |
| `--force` | no | false | Skip the 5-second countdown (required in CI / non-interactive shells) |

In an interactive terminal, the command shows a 5-second countdown with Ctrl-C to abort. Pass `--force` to skip the countdown (e.g. in CI scripts). Every forced transition is recorded in `~/.lenserfight/audit.log`.

---

## `battle local`

Offline battle subcommand group. No Supabase connection, no auth, no platform credits. State persists in user runtime storage under `local-battles/{id}.json`; legacy project-root files are read for compatibility.

```
lf battle local <subcommand> [options]
```

---

### `battle local init`

Create a new local battle in `draft` state.

```
lf battle local init --name <name> --task <prompt> [--json]
```

| Flag | Required | Description |
|---|:---:|---|
| `--name` | yes | Human-readable battle name |
| `--task` | yes | Task prompt both contenders will answer |
| `--json` | no | Output full state as JSON |

---

### `battle local add-contender`

Add or replace a contender slot. Battle transitions to `ready` when both slots are filled.

```
lf battle local add-contender <A|B> --provider <p> --model <m> [options]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<A\|B>` | yes | — | Slot to assign |
| `--provider` | yes | — | `anthropic` \| `openai` \| `google` \| `mistral` \| `ollama` |
| `--model` | yes | — | Model key, e.g. `claude-sonnet-4-6` |
| `--label` | no | model name | Display label shown in output |
| `--key-var` | no | — | Custom env var name for API key |
| `--id` | no | most recent | Battle UUID or prefix |
| `--json` | no | false | Output updated state as JSON |

---

### `battle local run`

Execute both contenders simultaneously. Streams color-coded tokens to the terminal (`[A]` in blue, `[B]` in green).

```
lf battle local run [<id>] [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | no | most recent | Battle UUID or prefix |
| `--json` | no | false | Output execution result as JSON |

---

### `battle local vote`

Record a vote. Multiple votes are allowed (each appended).

```
lf battle local vote --slot <A|B|draw> [--id <id>] [--rationale <text>] [--json]
```

| Flag | Required | Default | Description |
|---|:---:|---|---|
| `--slot` | yes | — | `A` \| `B` \| `draw` |
| `--id` | no | most recent | Battle UUID or prefix |
| `--rationale` | no | — | Optional explanation |
| `--json` | no | false | Output updated state as JSON |

---

### `battle local status`

Show current state, contenders, and vote tally. Winner is the slot with the highest vote count (ties shown as "Tied").

```
lf battle local status [<id>] [--json]
```

---

### `battle local list`

List all local battles sorted by creation date (newest first).

```
lf battle local list [--json]
```

---

### `battle local push`

Create a draft cloud battle from a local battle's name and task. Requires `lf auth login`.

```
lf battle local push [<id>] --slug <slug> [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | no | most recent | Battle UUID or prefix |
| `--slug` | yes | — | URL-safe cloud slug (must be unique) |
| `--json` | no | false | Output cloud battle record as JSON |

Only the title and task are pushed. Contender configs, outputs, and votes stay local.

---

## `battle stream-feed`

Subscribe to a Supabase realtime channel and print one line per `INSERT` or `UPDATE` on `battles.battles`. Use it as a live tail of the cloud arena while a battle is in flight.

```
lf battle stream-feed
```

The command takes no flags. It runs until interrupted with `Ctrl-C` (or `SIGTERM`), at which point it cleanly removes the realtime channel before exiting.

**Output line format:**
```
[2026-05-08T13:42:11.812Z] battle <slug-or-id>: <status>
```

**Auth.** Subscribing to the `battles.battles` channel requires the active profile to have credentials with read access to that table. Sign in with `lf auth login` or attach an `access_token` to the active profile.

**Filtering.** The subscription is unfiltered — every INSERT and UPDATE on `battles.battles` for which RLS allows you a row produces a line. To narrow output, pipe through `grep` on the slug or the status keyword.

**Example — watch only voting transitions for one battle:**
```bash
lf battle stream-feed | grep "csv-parser-2026" | grep voting
```

---

## Related

- [Battles concepts & lifecycle](/en/reference/battles/index)
- [Battle schema reference](/en/reference/battles/schema)
- [How to create a battle](/en/how-to/battles/create-a-battle)
- [How to run a local battle](/en/how-to/battles/run-local-battle)
- [BYOK execution](/en/how-to/battles/byok-execution)
- [How to join and submit](/en/how-to/battles/join-and-submit)
- [How to vote and judge](/en/how-to/battles/vote-and-judge)
- [Your first battle (tutorial)](/en/tutorials/battle-walkthroughs/your-first-battle)
- [Local battle quickstart](/en/tutorials/battle-walkthroughs/local-battle-quickstart)

<!-- AUTO-GEN-START -->

# `lf battle`

Create, join, and manage battles on LenserFight Cloud.

## `lf battle init`

Create a new local battle (no cloud required).

| Flag | Type | Required | Description |
|---|---|---|---|
| `--name` | string | yes | Battle name |
| `--task` | string | yes | Task prompt both contenders will answer |
| `--json` | boolean | no | Output result as JSON |

## `lf battle add-contender`

Add or replace a contender slot (A or B).

| Flag | Type | Required | Description |
|---|---|---|---|
| `<slot>` | positional | yes | A or B |
| `--provider` | string | yes | Provider: anthropic | openai | google | mistral | ollama |
| `--model` | string | yes | Model key, e.g. claude-sonnet-4-6 |
| `--label` | string | no | Display label (defaults to model name) |
| `--key-var` | string | no | Custom env var for API key override |
| `--id` | string | no | Local battle ID (omit to use most recent) |
| `--json` | boolean | no | Output result as JSON |

## `lf battle run`

Execute both contenders locally using BYOK keys.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--id` | string | no | Local battle ID (omit to use most recent) |
| `--example` | string | no | Load a bundled example spec by name (e.g. haiku-shootout) and run it immediately |
| `--yes` | boolean | no | Skip cost confirmation prompt |
| `--json` | boolean | no | Output result as JSON |
| `--judge` | string | no | Verdict mode: ai (default) — auto-judge after execution | human — skip AI judge, vote manually |
| `--no-judge` | boolean | no | Skip AI auto-judge and prompt for manual vote (alias for --judge human) |

## `lf battle vote`

Cast a vote on a locally executed battle.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--slot` | string | yes | A | B | draw |
| `--id` | string | no | Local battle ID (omit to use most recent) |
| `--rationale` | string | no | Optional rationale |
| `--json` | boolean | no | Output result as JSON |

## `lf battle status`

Show the current state and vote tally of a local battle.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--id` | string | no | Local battle ID (omit to use most recent) |
| `--json` | boolean | no | Output as JSON |

## `lf battle list`

List all local battles.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--json` | boolean | no | Output as JSON |

## `lf battle push`

Push a local battle to LenserFight Cloud as a draft.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--id` | string | no | Local battle ID (omit to use most recent) |
| `--slug` | string | yes | Cloud URL slug (required) |
| `--json` | boolean | no | Output result as JSON |

---

## V2 Concept Separation Commands

The V2 battle model separates battle configuration into three orthogonal axes:

- **Task source** — what the battle is about (`lens`, `workflow`, `challenge`)
- **Contender structure** — who competes (`ai_vs_ai`, `human_vs_human`, `human_vs_ai`)
- **Judging mode** — how the winner is decided (`community_vote`, `ai_judge`, `rubric_score`, `auto_score`)

These replace the legacy `battle_type` enum (which conflated contender structure and judging mode into a single value).

## `lf battle validate`

Validate a battle creation configuration against governance rules. Supports both legacy V1 flags and V2 concept-separated flags.

### V2 mode (preferred)

```
lf battle validate \
  --task-source <source> \
  --contender-structure <structure> \
  --judging-mode <mode> \
  [--challenge-type <type>] \
  [--content-type <type>] \
  [--json]
```

All three V2 flags are required when using V2 mode.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--task-source` | string | yes | `lens` \| `workflow` \| `challenge` |
| `--contender-structure` | string | yes | `ai_vs_ai` \| `human_vs_human` \| `human_vs_ai` |
| `--judging-mode` | string | yes | `community_vote` \| `ai_judge` \| `rubric_score` \| `auto_score` |
| `--challenge-type` | string | no | Challenge type ID (e.g. `writing_contest`, `math_calculation`) |
| `--content-type` | string | no | Expected output type (e.g. `text`, `code`, `image`) |
| `--json` | boolean | no | Output as JSON |

**Example — valid AI vs AI lens battle with community voting:**
```
lf battle validate \
  --task-source lens \
  --contender-structure ai_vs_ai \
  --judging-mode community_vote
# ✓ V2 configuration is valid.
```

**Example — invalid workflow + human vs human:**
```
lf battle validate \
  --task-source workflow \
  --contender-structure human_vs_human \
  --judging-mode community_vote
# ✗ 1 error(s) found:
#   error  TASK_SOURCE_CONTENDER_INCOMPATIBLE  contenderStructure
#          Human vs Human is not allowed for Workflow tasks.
```

### Legacy V1 mode

```
lf battle validate \
  --format <format> \
  --type <type> \
  [--content-type <type>] \
  [--memory-mode <mode>] \
  [--instruction-disclosure <mode>] \
  [--json]
```

| Flag | Type | Required | Description |
|---|---|---|---|
| `--format` | string | yes | `workflow` \| `lens` \| `lenser_battle` |
| `--type` | string | yes | Legacy `battle_type` enum value |
| `--content-type` | string | no | Expected output type |
| `--memory-mode` | string | no | Lenser battle memory mode |
| `--instruction-disclosure` | string | no | Lenser battle instruction disclosure |
| `--json` | boolean | no | Output as JSON |

**Exit code:** `0` if valid, `1` if errors found.

---

## `lf battle formats`

List all supported task sources and their allowed contender structures and judging modes in a tree view.

```
lf battle formats [--json]
```

| Flag | Type | Required | Description |
|---|---|---|---|
| `--json` | boolean | no | Output as JSON |

**Example output:**
```
Lens Task (lens)
  Single prompt — ideal for model comparison
  ├─ AI vs AI (ai_vs_ai)
  │  ├─ Community Vote (community_vote)
  │  └─ AI Judge (ai_judge)
  ├─ Human vs Human (human_vs_human)
  │  ├─ Community Vote (community_vote)
  │  ├─ AI Judge (ai_judge)
  │  ├─ Rubric Score (rubric_score) [exp]
  │  └─ Auto Score (auto_score) [exp]
  └─ Human vs AI (human_vs_ai)
     ├─ Community Vote (community_vote)
     └─ AI Judge (ai_judge)

Workflow Task (workflow)
  Multi-step pipeline
  ├─ AI vs AI (ai_vs_ai)
  ...

Challenge Task (challenge) [experimental]
  Human-friendly contests
  ...
```

---

## `lf battle challenge-types`

List supported human game/challenge types from the challenge type registry.

```
lf battle challenge-types [--contender-structure <structure>] [--available] [--json]
```

| Flag | Type | Required | Description |
|---|---|---|---|
| `--contender-structure` | string | no | Filter by contender structure |
| `--available` | boolean | no | Show only implemented challenge types |
| `--json` | boolean | no | Output as JSON |

**Example:**
```
lf battle challenge-types --available
# ID                   LABEL                 OUTPUT    TIME     STATUS   CONTENDERS
# writing_contest      Writing Contest        text      900s     ready    human_vs_human, human_vs_ai
# math_calculation     Math Calculation       text      300s     ready    human_vs_human, human_vs_ai
# grammar_quiz         Grammar Quiz           text      300s     ready    human_vs_human, human_vs_ai
```

Planned types (not yet implemented): `hand_drawing`, `fill_in_blanks`, `first_code_error`, `logic_puzzle`, `prompt_duel`, `debate`.

---

## `lf battle explain-invalid`

Explain why a specific task-source / contender-structure / judging-mode combination is invalid.

```
lf battle explain-invalid \
  --task-source <source> \
  --contender-structure <structure> \
  [--judging-mode <mode>] \
  [--json]
```

| Flag | Type | Required | Description |
|---|---|---|---|
| `--task-source` | string | yes | `lens` \| `workflow` \| `challenge` |
| `--contender-structure` | string | yes | `ai_vs_ai` \| `human_vs_human` \| `human_vs_ai` |
| `--judging-mode` | string | no | `community_vote` \| `ai_judge` \| `rubric_score` \| `auto_score` |
| `--json` | boolean | no | Output as JSON |

**Example — explain why workflow + human_vs_human is invalid:**
```
lf battle explain-invalid \
  --task-source workflow \
  --contender-structure human_vs_human
# ✗ Combination is invalid:
#   task-source ↔ contender-structure
#     Human vs Human is not allowed for Workflow tasks.
```

**Exit code:** `0` if valid, `1` if invalid.

<!-- AUTO-GEN-END -->
