# CLI runtime backends

The LenserFight CLI has **three independent backends**. Only one API mode is active at a time; the file workspace is always available.

## Summary

| Backend | Config / flag | Docker? |
|---------|---------------|---------|
| **Cloud** (default) | `mode: cloud`, `lf use cloud` | No |
| **Supabase local** | `mode: local`, `lf use local`, `lf --local` | Only for `lf db *` / `lf sync` |
| **File workspace** | (none) | No |

## API mode precedence

1. `lf --local` → Supabase local  
2. `lf --cloud` → Cloud  
3. `lf use <mode>` → persisted in `.lenserfight/lenserfight.json`  
4. No project file → **Cloud**

## Cloud vs `.env.local` (monorepo dev)

Repo-root `.env.local` is tuned for **local** web apps (`SUPABASE_URL=http://127.0.0.1:54321`, Tailscale URLs, etc.). In **cloud** mode the CLI **ignores** those dev values for:

- `SUPABASE_URL` / `API_URL` (localhost, LAN, Tailscale)
- The well-known local Supabase demo anon JWT

Cloud RPC/login defaults to the **official LenserFight Cloud** Supabase project (same publishable credentials as production apps). Override with `lf init --mode cloud --url …` or non-dev `SUPABASE_URL` / `SUPABASE_ANON_KEY` in env. Local `.env.local` values tied to `127.0.0.1` are ignored.

## File workspace

Commands that work on markdown and local state without cloud keys:

- `lf validate`, `lf import`, `lf export`, `lf workflow run`
- `lf battle file` (alias: deprecated `lf battle local`)

## Supabase local ↔ file sync

When both backends are in use:

```bash
lf import .lenserfight/
lf use local
lf db dev          # optional: start stack
lf sync plan
lf sync push --all
```

See [Sync file workspace and Supabase local](/en/how-to/cli/sync-file-and-supabase-local.md).

## Naming

| Term | Meaning |
|------|---------|
| Cloud | Hosted Supabase (PostgREST + Edge Functions) |
| Supabase local | `127.0.0.1` PostgREST |
| File workspace | `.lenserfight/` markdown + registry |
| `--local` (global) | Supabase local API only |
| `battle file` | Offline / BYOK battles on disk |
