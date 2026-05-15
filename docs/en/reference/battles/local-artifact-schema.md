---
title: Local Battle Artifact Schema
description: JSON schema for local battle artifacts persisted by `lf battle local` — fields, types, and storage format.
---

# Local Battle Artifact Schema

<ExperimentalBadge title="Battles" description="Battles is still being built end-to-end. Matchmaking, voting and result flows may shift — please try them and report what feels off." />


Local battles are stored as JSON files in user runtime storage under `local-battles/<uuid>.json`. Legacy project-root `.lenserfight/local-battles/<uuid>.json` files are still read for compatibility. Files are wrapped in an AES-256-GCM encrypted envelope (see [Encryption envelope](#encryption-envelope)).

## Top-level fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID v4) | Unique identifier, generated at creation. |
| `name` | `string` | Human-readable battle name. |
| `task` | `string` | The task prompt given to both contenders. |
| `status` | `"draft" \| "ready" \| "executed" \| "voted"` | Lifecycle state (see [Status transitions](#status-transitions)). |
| `contenders` | `LocalContenderConfig[]` | The two model configurations (slots A and B). |
| `outputs` | `{ A: string; B: string }` | Raw text responses from each contender after execution. |
| `votes` | `LocalVote[]` | Array of recorded votes. |
| `createdAt` | `string` (ISO 8601) | Timestamp of creation. |
| `executedAt` | `string` (ISO 8601) \| `undefined` | Timestamp of first successful execution. |

## `LocalContenderConfig`

```ts
interface LocalContenderConfig {
  slot:     'A' | 'B'   // which contender slot
  label:    string       // display name (e.g. "llama3:8b")
  provider: string       // provider key (e.g. "ollama", "openai")
  model:    string       // model identifier
  keyVar?:  string       // optional env var override for BYOK key resolution
}
```

## `LocalVote`

```ts
interface LocalVote {
  slot:       'A' | 'B' | 'draw'  // which contender won, or draw
  rationale?: string               // optional free-text justification
  votedAt:    string               // ISO 8601 timestamp
}
```

## Status transitions

```
draft → ready      (both slots A and B are configured)
ready → executed   (lf battle local run completes)
executed → voted   (first vote is recorded)
```

A battle in `draft` status cannot be run — both contenders must be added first.

## Example artifact

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "haiku-shootout",
  "task": "Write a haiku about the sea.",
  "status": "voted",
  "contenders": [
    { "slot": "A", "label": "llama3:8b", "provider": "ollama", "model": "llama3" },
    { "slot": "B", "label": "mistral:7b", "provider": "ollama", "model": "mistral" }
  ],
  "outputs": {
    "A": "Waves crash on the shore\nSalt and silence fill the air\nThe sea breathes deeply",
    "B": "Ancient tides return\nMoonlit water, endless dark\nPeace beneath the waves"
  },
  "votes": [
    { "slot": "B", "rationale": "More evocative imagery", "votedAt": "2026-06-01T12:00:00Z" }
  ],
  "createdAt": "2026-06-01T11:55:00Z",
  "executedAt": "2026-06-01T11:58:00Z"
}
```

## Encryption envelope

When `LENSERFIGHT_LOCAL_BATTLE_KEY` is set, the artifact JSON is wrapped in this envelope before writing to disk:

```json
{
  "v": 1,
  "alg": "aes-256-gcm",
  "data": "<base64(IV[12] || ciphertext || authTag[16])>"
}
```

The encryption key is derived via `scrypt(passphrase, "lenserfight-local-battle-v1", 32)`. Legacy plaintext files are automatically migrated to the encrypted format on first read when the env var is present.

## CLI commands for local artifacts

| Command | Description |
|---------|-------------|
| `lf battle local run --example haiku-shootout` | Create and run a bundled example battle |
| `lf battle local list` | List all local battles |
| `lf battle local view <id>` | View a local battle by UUID prefix |
| `lf battle local vote <id>` | Record a vote for a local battle |
| `lf battle leaderboard --local` | Rank all local battles by vote count |
| `lf battle export <id> --as-md` | Export a local battle as a Markdown digest |

## Storage location

New local battles are stored in user runtime storage, outside the current working directory. The legacy project-root directory is still read for compatibility. Keep this path in `.gitignore`:

```
.lenserfight/local-battles/
```
