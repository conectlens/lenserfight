# Development Commands

These commands manage your local Supabase stack, project config, and environment health.

From the monorepo root, regenerate `supabase/seed.sql` from `supabase/seed.manifest` before a full reset:

```bash
pnpm supabase:combine-seeds
pnpm supabase:db:reset
```

---

## `lenserfight init`

Initialise or overwrite `.lenserfight.json`. Keys are never stored here.

```bash
lenserfight init                          # local mode, zero config needed
lenserfight init --mode cloud --url <URL>
lenserfight init --mode cloud --source env   # preview what .env.local provides
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--mode` | No | `local` | `local` or `cloud` |
| `--url` | No | — | Supabase URL (auto-detected for local) |
| `--source` | No | `auto` | Key source hint: `auto`, `env`, `supabase` |

After init, the command prints a resolution summary showing where the anon key and URL will come from.

---

## `lenserfight doctor`

Validate that your environment is ready for development.

```bash
lenserfight doctor
```

Checks performed:

- Node.js >= 20
- Supabase CLI installed
- Docker running
- `.lenserfight.json` exists
- Local Supabase status (if `mode: local`)

---

## `lenserfight dev`

Start the local Supabase stack.

```bash
lenserfight dev           # start Supabase
lenserfight dev --reset   # drop + recreate + migrate + seed
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--reset` | No | `false` | Run `supabase db reset` instead of `supabase start` |

---

## `lenserfight seed`

Run the seed file against the database.

```bash
lenserfight seed                          # default: supabase/seed.sql
lenserfight seed --file path/to/seed.sql  # custom seed file
lenserfight seed --force                  # skip confirmation prompt
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--file` | No | `supabase/seed.sql` | Path to seed SQL file |
| `--force` | No | `false` | Skip confirmation |

---

## `lenserfight reset`

Full environment reset — clears config, drops the database, and removes stored auth tokens.

```bash
lenserfight reset
lenserfight reset --force        # skip confirmation
lenserfight reset --skip-db      # reset config and auth only, keep database
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--force` | No | `false` | Skip confirmation prompt |
| `--skip-db` | No | `false` | Do not run `supabase db reset` |

---

## `lenserfight status`

Show environment, config, and auth status at a glance.

```bash
lenserfight status
```

Outputs:

- Config mode and Supabase URL (resolved)
- Anon key and service role key status (present / missing)
- Auth status (authenticated or not)
- Local Supabase stack status (if `mode: local`)

---

## Related

- [Configuration](configuration.md)
- [Execution Modes](execution-modes.md)

<!-- AUTO-GEN-START -->

# `lf dev`

Start local Supabase stack, run migrations, and seed the database.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--reset` | boolean | no | Run db reset instead of start (drops and recreates) |
| `--echo` | boolean | no | Set USE_ECHO_PROVIDER=true — no real API calls (local testing) |

<!-- AUTO-GEN-END -->
