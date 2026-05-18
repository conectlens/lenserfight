# Global Flags: `--local` and `--debug`

Two global flags are available on every LenserFight CLI command.

---

## `--local`

Override the project config mode to `local` for the duration of the command.

### What it does

- Forces all API calls to use localhost endpoints (`http://127.0.0.1:54321`, `http://localhost:8786`) regardless of what `.lenserfight.json` specifies.
- Prints `local mode active` to stderr on startup.
- Disables telemetry for this invocation.
- Warns if the resolved Supabase or API URL still points to production (soft warning — does not abort the command).

### Invocation patterns

```sh
lf --local <command>           # global flag before subcommand
lf <command> --local           # global flag after subcommand
LF_LOCAL=1 lf <command>        # via environment variable
```

All three forms are equivalent.

### Configuration precedence with `--local`

When `--local` is active the config resolution order becomes:

1. Explicit CLI flags on the command itself
2. Environment variables and `.env.local`
3. `.env`
4. `~/.lenserfight/lenserfight.json` (user-level)
5. **Well-known local Supabase defaults** (forced by `--local`)

The project config file (`mode` field in `.lenserfight.json`) is overridden for this invocation only and is not modified on disk.

### Note on `lf battle leaderboard --local`

The `--local` flag on `lf battle leaderboard` is a **separate per-command flag** that shows local battles ranked by vote totals. It has a different meaning from the global `--local` described here.

---

## `--debug`

Enable verbose diagnostic output on stderr.

### What it does

- Sets the log level to `debug`, enabling `consola.debug()` output.
- Prints a config summary to stderr on every `resolveConfig()` call:
  - Mode, Supabase URL, cloud API URL
  - Which `.env` files were loaded
- Traces every network request: method, URL (with secrets redacted), response status, and duration.
- Appends a stack trace to error output.
- Prints overall command timing (`done in Xms`) on process exit.
- Logs when telemetry is skipped.

### Invocation patterns

```sh
lf --debug <command>           # global flag before subcommand
lf <command> --debug           # global flag after subcommand
LF_DEBUG=1 lf <command>        # via environment variable
```

### Output routing

Normal command output goes to **stdout**. All debug diagnostics go to **stderr**. Machine-readable output (e.g. `--json` flag) is not affected.

---

## Combined usage

```sh
lf --local --debug <command>
lf <command> --local --debug
LF_LOCAL=1 LF_DEBUG=1 lf <command>
```

With both flags active:

- Config summary shows local endpoints.
- Any resolved production URL triggers a warning.
- Telemetry is skipped and the skip is logged.
- Full request traces and stack traces are printed to stderr.

---

## Secret redaction

Debug output never prints raw secrets. The following values are always redacted as `[REDACTED]`:

- JWT tokens (including the well-known Supabase local dev keys)
- API keys and tokens ≥ 40 characters
- HTTP headers: `authorization`, `x-api-key`, `apikey`, `cookie`, `set-cookie`
- URL query parameters: `key`, `token`, `secret`, `access_token`, `api_key`, `refresh_token`

---

## Backward compatibility

When neither flag is provided the CLI behaves exactly as before. Existing scripts and workflows are unaffected.
