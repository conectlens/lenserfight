---
title: Profile Commands
description: CLI reference for managing multiple LenserFight CLI profiles — switch between Supabase backends per command, per shell, or per workspace.
---

# `lf profile`

Manage CLI profiles for talking to multiple Supabase backends from one machine. A profile bundles a Supabase URL, anon key, and optional access/refresh tokens. The active profile is the one the CLI uses for every other command.

Profiles are stored as JSON files at `~/.lenserfight/profiles/<name>.json` with file mode `0600` (owner read/write only). The active profile name is stored in `~/.lenserfight/profiles/.active`.

See also: [`lf completion`](./completion.md) for shell completion of subcommands, and [Operate LenserFight from the TUI dashboard](/how-to/operations/cli-dashboard) for an interactive view that respects the active profile.

## File format

Each profile is a JSON object:

```json
{
  "name": "default",
  "supabase_url": "https://your-project.supabase.co",
  "supabase_anon_key": "eyJhbGciOiJI…",
  "access_token": "eyJhbGciOiJI…",
  "refresh_token": "eyJhbGciOiJI…",
  "default_workflow_id": "8f3e4a12-0001-0002-0003-000000000001",
  "created_at": "2026-05-08T10:30:00Z"
}
```

| Field | Required | Description |
|---|:---:|---|
| `name` | yes | Profile name (matches the file name without `.json`). |
| `supabase_url` | yes | Supabase project URL. |
| `supabase_anon_key` | yes | Supabase anon API key. |
| `access_token` | no | OAuth access token from `lf auth login`. |
| `refresh_token` | no | OAuth refresh token. |
| `default_workflow_id` | no | UUID used when a command needs a workflow but none is passed. |
| `created_at` | yes | ISO 8601 timestamp set when the profile is created. |

## Profile resolution order

The CLI picks the profile at startup using the first match:

1. `--profile <name>` flag on the command line.
2. `LF_PROFILE` environment variable.
3. The active profile recorded by `lf profile use <name>` (in `~/.lenserfight/profiles/.active`).
4. The literal name `default`.

If no profile file matches the resolved name, the CLI falls back to environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, …) for backwards compatibility.

## `lf profile list`

List all configured profiles and mark the active one.

```bash
lf profile list
lf profile list --json
```

| Flag | Description |
|---|---|
| `--json` | Output `{ active, profiles: [...] }` as JSON. |

Output columns: `Name | Active`.

## `lf profile create`

Create a new profile. The file is written with mode `0600`.

```bash
lf profile create \
  --name staging \
  --url https://staging.supabase.co \
  --anon-key eyJhbGciOiJI… \
  --token eyJhbGciOiJI… \
  --default-workflow 8f3e4a12-0001-0002-0003-000000000001
```

| Flag | Required | Description |
|---|:---:|---|
| `--name <name>` | yes | Profile name. Must be filesystem-safe. |
| `--url <url>` | yes | Supabase URL. |
| `--anon-key <key>` | yes | Supabase anon key. |
| `--token <jwt>` | no | Optional access token (from `lf auth login`). |
| `--default-workflow <uuid>` | no | Optional workflow UUID stored as `default_workflow_id`. |

After creation, activate the profile with `lf profile use <name>`.

## `lf profile use`

Set the active profile (writes to `~/.lenserfight/profiles/.active`).

```bash
lf profile use staging
```

The change persists across shells. Override per-shell with `LF_PROFILE`, or per-command with `--profile`.

## `lf profile delete`

Delete a profile. Removes the JSON file from disk.

```bash
lf profile delete staging
lf profile delete staging --force
```

| Flag | Description |
|---|---|
| `--force` | Delete even if it would leave you with no profiles. |

If the deleted profile was active, the CLI will fall back to the resolution chain on the next invocation.

## `lf profile show`

Print profile details (the active profile if no name is given). Tokens are always redacted to `••••••`.

```bash
lf profile show
lf profile show staging
lf profile show staging --json
```

| Flag | Description |
|---|---|
| `--json` | Output as JSON (tokens still redacted). |

The anon key is shortened to its first 12 characters in human-readable mode.

## Security

- Profile files are written with mode `0600`. Anyone with read access to the operator's home directory can still read them — see [Known Limitations](/reference/known-limitations#api-and-docs).
- `lf profile show` redacts `access_token` and `refresh_token` so the values never appear in screenshots or shared terminal sessions.
- For stricter handling, leave the tokens out of the file and inject them at runtime via `LF_PROFILE` paired with a per-shell credential manager (`pass`, `1password-cli`, `keychain`, etc.).
