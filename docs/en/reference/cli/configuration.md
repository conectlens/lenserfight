# CLI Configuration

The CLI uses a **two-layer config model** to keep secrets out of your repository.

## User config — OS path (default for `lf init`)

Stores your personal mode, Supabase URL, and ports. **Not** written into git repositories by default.

| Operating System | Path |
|-----------------|------|
| Linux | `$XDG_CONFIG_HOME/lenserfight/lenserfight.json` (default: `~/.config/lenserfight/lenserfight.json`) |
| macOS | `~/Library/Application Support/lenserfight/lenserfight.json` |
| Windows | `%APPDATA%\lenserfight\lenserfight.json` |

Run `lenserfight init` from any directory to create this file. Use `lenserfight init --project` only when you intentionally want a repo-local override (see below).

---

## Project config — `.lenserfight/lenserfight.json` (optional)

Stores non-secret settings for a specific repository. Safe to commit when the team shares the same target. Created only with `lenserfight init --project`.

```
your-project/
└── .lenserfight/
    ├── config.json            ← project config (this section)
    └── automation-registry.json
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | `local` \| `cloud` | `local` | Target environment |
| `supabaseUrl` | string | `http://127.0.0.1:54321` | Supabase API URL |
| `cloudApiUrl` | string | `{SUPABASE_URL}/functions/v1` | Supabase Edge Functions base (override with `API_URL`) |
| `cloudId` | string | — | Project identifier on LenserFight Cloud |
| `dbPort` | number | `54322` | PostgreSQL port |
| `apiPort` | number | `54321` | PostgREST API port |
| `autoOpenBrowser` | boolean | — | Auto-open browser on `dev` |
| `enabledApps` | string[] | — | Apps to start (e.g. `["web", "docs"]`) |

**Secrets and tokens are never written to this file.**

### Legacy flat-file format

Projects created before v0.2 used `.lenserfight.json` at the project root. The CLI still reads this file as a fallback but always writes to `.lenserfight/lenserfight.json`. Running `lenserfight init` on an existing project migrates to the directory format automatically.

---

## Device config — OS-aware path

Stores secrets and auth tokens globally per machine. Created by `lenserfight auth login` or `lenserfight connect`.

| Operating System | Path |
|-----------------|------|
| Windows | `%APPDATA%\lenserfight\config.json` |
| macOS | `~/Library/Application Support/lenserfight/config.json` |
| Linux | `$XDG_CONFIG_HOME/lenserfight/config.json` (default: `~/.config/lenserfight/`) |
| Pardus | same as Linux (XDG-compliant) |
| Legacy (all) | `~/.lenserfight/lenserfight.json` *(read fallback; written if the file already exists)* |

| Field | Description |
|-------|-------------|
| `authToken` | JWT for authenticated requests |
| `authRefreshToken` | Refresh token |
| `authExpiresAt` | Token expiry (ISO 8601) |
| `developerTokenId` | ID of the current developer token |
| `developerToken` | Time-bounded developer token used for automation |
| `developerTokenExpiresAt` | Developer token expiry (ISO 8601) |
| `supabaseAnonKey` | Anon key (if stored explicitly) |
| `supabaseServiceRoleKey` | Service role key (for admin ops) |
| `defaultAdapterId` | Default Agent adapter UUID for `run` |
| `workspaces` | Registry of project directories synced from project configs |

Private runtime artifacts such as local battle state, workflow simulation runs, and generated reports are written to user runtime storage, not project `.lenserfight/`, by default. Legacy `.lenserfight/local-battles/` files are still read for compatibility and migrated on access when possible.

### Workspace registry (sync)

Each time a project config is saved, the CLI writes a `workspaces` entry to the device config so the TUI dashboard can discover all known projects without a filesystem scan:

```json
{
  "workspaces": {
    "/home/user/projects/my-project": {
      "mode": "local",
      "lastSeenAt": "2026-05-09T12:00:00.000Z",
      "configPath": "/home/user/projects/my-project/.lenserfight/lenserfight.json"
    }
  }
}
```

---

## Resolution order

The CLI resolves each field independently. First non-empty value wins:

| Priority | Source |
|----------|--------|
| 1 | `process.env` environment variable |
| 2 | `.env.local` in project root |
| 3 | `.env` in project root |
| 4 | Device config at OS-aware path |
| 5 | Legacy `~/.lenserfight/lenserfight.json` |
| 6 | Well-known local Supabase defaults *(local mode only)* |

### Key resolution table

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` / `SUPABASE_URL` | Supabase API URL |
| `SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `LENSERFIGHT_CLOUD_API_URL` / `API_URL` | Cloud API URL |
| `LENSERFIGHT_DEVELOPER_TOKEN` | Override stored developer token |
| `LENSERFIGHT_DEVELOPER_TOKEN_EXPIRES_AT` | Override developer token expiry |
| `LENSERFIGHT_OLLAMA_BASE_URL` / `OLLAMA_BASE_URL` | Ollama base URL |
| `LENSERFIGHT_API_KEY` | Platform API key |
| `AUTH_BASE_URL` | Auth service base URL |

For `mode: local`, the anon key and service role key resolve automatically from Supabase local dev defaults — no manual configuration needed.

---

## Cloud mode setup

Connect to LenserFight Cloud:

```bash
lf connect
```

This opens a browser for authentication, saves your cloud token to the device config, and writes `cloudApiUrl` and `cloudId` to `.lenserfight/lenserfight.json`.

Or manually:

```bash
# .env.local (project root)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Then initialise:

```bash
lenserfight init --mode cloud --url https://your-project.supabase.co
```

---

## .gitignore recommendations

```gitignore
# Never commit — device config lives in the OS-specific path, not here
.lenserfight.json

# Runtime artifacts — not needed in version control
.lenserfight/runs/
.lenserfight/reports/

# Legacy local battle state — private runtime data
.lenserfight/local-battles/

# .lenserfight/lenserfight.json is safe to commit (no secrets)
```

---

## Debug mode

```bash
LF_DEBUG=1 lf <command>
```

Prints the resolved `mode`, `supabaseUrl`, `cloudApiUrl`, device config path, and loaded `.env` files to stderr.

---

## Related

- [Platform Setup by OS](/en/platform-setup/) — OS-specific install and config paths
- [Environment Variables](/en/reference/platform-api/environment-variables)
- [CLI Overview](/en/reference/cli/index)
- [CLI Auth Commands](/en/reference/cli/auth)
