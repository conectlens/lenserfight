---
title: Debugging the CLI
description: Diagnose and fix common lf CLI errors — using lf doctor, the --debug flag, error codes, and step-by-step failure analysis.
head:
  - - meta
    - name: og:title
      content: Debugging the CLI — LenserFight Advanced
  - - meta
    - name: og:description
      content: Diagnose and fix common lf CLI errors using lf doctor, --debug mode, and standard error patterns.
---

# Debugging the CLI

## Goal

Identify and fix the most common `lf` CLI failures — from environment mismatches and authentication errors to command-not-found and execution failures — using the built-in diagnostic tools.

---

## Prerequisites

- `lf` CLI built: `pnpm nx run cli:build`
- Access to run: `node dist/apps/cli/main.js` or the installed `lf` binary

---

## Built-in Diagnostic Tools

### `lf doctor`

The first tool to reach for. It checks all prerequisites and reports status as green/yellow/red:

```bash
lf doctor
```

Expected output on a healthy setup:

```
✔ Node.js           v22.3.0  (required: >=20)
✔ pnpm              9.4.0    (required: >=8)
✔ Docker            running
✔ Supabase CLI      1.200.0
✔ Supabase local    running  (port 54321)
✔ SUPABASE_URL      set
✔ SUPABASE_ANON_KEY set
⚠ Ollama            not detected  (optional — needed for local model execution)
✔ CLI build         dist/apps/cli/main.js exists
```

Yellow warnings are non-fatal. Red errors are blocking — fix them before running other commands.

Common red conditions:

| Red condition | Meaning | Fix |
|---|---|---|
| Docker not running | Docker daemon not started | Start Docker Desktop |
| Supabase local: stopped | `supabase start` was not run | `pnpm supabase start` |
| `SUPABASE_URL` not set | `.env.local` missing or incomplete | `cp .env.example .env.local` and fill in values |
| CLI build: missing | Binary not compiled | `pnpm nx run cli:build` |

---

### `--debug` flag

Append `--debug` to any command to see verbose diagnostic output on stderr:

```bash
lf run exec --debug --prompt "Hello world"
```

Debug output includes:

- Active configuration values (keys masked)
- HTTP requests and response status codes
- Which config file was loaded (`~/.lf/config.json` or project-local)
- Execution step timings
- Any internal error stack traces

Always run `--debug` before reporting a bug — it contains the information a maintainer needs to reproduce the issue.

---

### `lf env`

Inspect what environment variables the CLI sees, with sensitive values masked:

```bash
lf env
```

This is useful when you suspect that `.env.local` is not being picked up:

```
DATA_SOURCE          supabase
SUPABASE_URL         http://127.0.0.1:54321
SUPABASE_ANON_KEY    eyJ...  [masked]
LENSERFIGHT_API_KEY  [not set]
```

---

### `lf status`

Check the health of the local Supabase services:

```bash
lf status
```

Output shows each service (API, Auth, DB, Storage, Realtime) as running or stopped.

---

## Step-by-Step Failure Analysis

### Pattern: Command exits with no output

**Diagnosis**:
```bash
lf <command> --debug 2>&1 | head -50
```

Look for the first error line in the debug stream. Common causes:
- Config file not found (no `~/.lf/config.json`)
- Binary was built from a stale build

**Fix**:
```bash
# Re-build the CLI
pnpm nx run cli:build

# Re-run with debug
node dist/apps/cli/main.js <command> --debug
```

---

### Pattern: `lf auth login` fails or hangs

**Symptoms**: Browser does not open, or OAuth flow returns an error page.

**Diagnosis**:
```bash
lf auth login --debug
```

Check for:
- `AUTH_BASE_URL` points to a running auth server
- Supabase OAuth providers configured in `supabase/config.toml`

**Fix**:
```bash
# Start the auth app
pnpm nx run auth:serve

# Verify auth app is running on port 3004
curl -s http://localhost:3004/health
```

If OAuth providers are not configured, set them in `supabase/config.toml` under `[auth.external.*]` and restart Supabase.

---

### Pattern: `lf run exec` exits with `UNAUTHORIZED`

**Symptoms**:
```
✗ Error: Unauthorized — invalid or expired session token
```

**Diagnosis**:
```bash
lf auth status
```

If logged out:
```bash
lf auth login
```

If logged in but still failing:
```bash
lf env  # check SUPABASE_URL and SUPABASE_ANON_KEY
```

If `SUPABASE_ANON_KEY` is stale (keys rotate after `pnpm supabase stop && pnpm supabase start`):
```bash
# Extract the current key
pnpm supabase status | grep "anon key"

# Update .env.local
# Replace SUPABASE_ANON_KEY=<new-value>
```

Then restart the CLI session.

---

### Pattern: `lf battle local init` fails with file errors

**Symptoms**:
```
✗ Error: ENOENT: no such file or directory
```

**Diagnosis**: The current directory does not have write permissions, or the CLI cannot resolve the project root.

**Fix**:
```bash
# Run from the repo root
cd /path/to/lenserfight
lf battle local init --debug
```

Local battle files are written to the current directory unless `--dir` is specified.

---

### Pattern: `lf workflow` command returns stale data

**Symptoms**: Workflow output does not reflect recent changes made in the web app.

**Diagnosis**: The CLI and web app use the same Supabase instance. If the data is stale, check:

1. Is the CLI pointing to the right Supabase instance?
   ```bash
   lf env | grep SUPABASE_URL
   ```
2. Was the workflow published after the last change?

**Fix**:
```bash
lf workflow list  # verify the workflow ID
lf inspect workflow <id>  # inspect the current stored state
```

---

### Pattern: `Cannot find module` on CLI startup

**Symptoms**:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'citty'
```

**Cause**: The CLI was not built after a dependency change.

**Fix**:
```bash
pnpm install
pnpm nx run cli:build
```

---

### Pattern: `lf providers list` is empty after adding a key

**Symptoms**: You configured an API key but `lf providers list` shows nothing.

**Diagnosis**:
```bash
lf providers list --debug
```

Check for:
- Config written to wrong file (project-local vs. global)
- Encryption passphrase mismatch (keys are encrypted at rest)

**Fix**:
```bash
# Re-initialize the key store
lf keys init

# Re-add the provider key
lf providers add --name openai --key sk-...
```

---

## Reading Error Codes

The CLI outputs structured errors in this format:

```
✗ <ErrorType>: <human message> [code: LF-NNNN]
```

| Code prefix | Area |
|---|---|
| `LF-1xxx` | Authentication / authorization |
| `LF-2xxx` | Configuration / environment |
| `LF-3xxx` | Network / API connectivity |
| `LF-4xxx` | Database / Supabase |
| `LF-5xxx` | Execution engine |
| `LF-6xxx` | CLI command dispatch |

Use the code when searching GitHub Issues or asking for help — it narrows the search significantly.

---

## Enabling Full Debug Logs

For persistent verbose logging during a development session, set the environment variable:

```bash
export LF_DEBUG=1
lf <commands>
```

This is equivalent to appending `--debug` to every command.

---

## Common Issues Summary

| Symptom | First command to run | Likely fix |
|---------|---------------------|-----------|
| Blank output | `lf doctor` | Missing prerequisite |
| Auth failures | `lf auth status` + `--debug` | Login expired or wrong keys |
| DB-related errors | `lf status` | Supabase not running |
| `UNAUTHORIZED` | `lf env` | Stale `SUPABASE_ANON_KEY` |
| Module not found | `pnpm nx run cli:build` | Stale build |
| Stale data | `lf inspect <resource> <id>` | Data not published |
| Empty provider list | `lf keys init` | Key store not initialized |

---

## Related Docs

- [CLI Getting Started](/en/tutorials/cli/cli-getting-started)
- [Auth Issues](/en/tutorials/troubleshooting/auth-issues)
- [Database Issues](/en/tutorials/troubleshooting/database-issues)
- [lf doctor reference](/en/reference/cli/doctor)
- [Environment Variables reference](/en/reference/platform-api/environment-variables)

## Next Steps

- [Environment Secrets Security](/en/tutorials/advanced/environment-secrets-security) — keep server-only secrets out of client bundles
- [Running the Full Validation Suite](/en/tutorials/advanced/writing-tests-for-a-feature) — smoke gate and all test layers
