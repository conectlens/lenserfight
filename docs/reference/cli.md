# CLI Reference

The `lenserfight` CLI manages local development, database seeding, and battle operations from the terminal.

## Installation

The CLI is built as part of the monorepo:

```bash
npx nx build cli
node dist/apps/cli/main.js --help
```

## Configuration

The CLI reads from a `.lenserfight.json` file in the project root. Create one with:

```bash
lenserfight init
```

### Config fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | `local` \| `cloud` | `local` | Target environment |
| `supabaseUrl` | string | `http://127.0.0.1:54321` | Supabase API URL |
| `supabaseAnonKey` | string | `""` | Public anon key |
| `supabaseServiceRoleKey` | string | — | Service role key (optional, for admin ops) |
| `dbPort` | number | `54322` | PostgreSQL port |
| `apiPort` | number | `54321` | PostgREST API port |

## Commands

### `lenserfight init`

Initialize or overwrite `.lenserfight.json`.

```bash
lenserfight init                              # local mode (default)
lenserfight init --mode cloud --url <URL> --anon-key <KEY>
```

| Flag | Description |
|------|-------------|
| `--mode` | `local` or `cloud` (default: `local`) |
| `--url` | Supabase URL |
| `--anon-key` | Supabase anon key |

### `lenserfight doctor`

Validate that your environment is ready for development.

```bash
lenserfight doctor
```

Checks:
- Node.js >= 20
- Supabase CLI installed
- Docker running
- `.lenserfight.json` exists
- Local Supabase status (if local mode)

### `lenserfight dev`

Start the local Supabase stack.

```bash
lenserfight dev             # start Supabase
lenserfight dev --reset     # drop + recreate + migrate + seed
```

| Flag | Description |
|------|-------------|
| `--reset` | Run `supabase db reset` instead of `supabase start` |

### `lenserfight seed`

Run the seed file against the database.

```bash
lenserfight seed                          # default: supabase/seed.sql
lenserfight seed --file path/to/seed.sql  # custom seed file
```

| Flag | Description |
|------|-------------|
| `--file` | Path to seed SQL file (default: `supabase/seed.sql`) |

### `lenserfight battle`

Manage battles. Has subcommands:

#### `lenserfight battle create`

Create a new battle in draft status.

```bash
lenserfight battle create \
  --title "My Battle" \
  --slug "my-battle" \
  --prompt "Write a function that..."
```

| Flag | Required | Description |
|------|----------|-------------|
| `--title` | Yes | Battle title |
| `--slug` | Yes | URL-friendly slug |
| `--prompt` | Yes | Task prompt for contenders |
| `--rubric` | No | Rubric UUID to attach |

#### `lenserfight battle list`

List public battles.

```bash
lenserfight battle list             # default: 10 results
lenserfight battle list --limit 20
```

#### `lenserfight battle view`

View a battle by UUID.

```bash
lenserfight battle view <battle-id>
```

Outputs the full battle JSON including contenders, submissions, votes, and scorecards.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (missing config, failed checks, API error) |

## Related

- [Local Database Setup](/database/local-setup)
- [API Overview](/reference/api-overview)
- [RPC Reference](/database/rpc-reference)
