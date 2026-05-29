# Sync file workspace and Supabase local

Use `lf sync` to move automation objects between **file workspace** (markdown + `.lenserfight/automation-registry.json`) and **Supabase local** (`lf use local`).

This does not target Cloud. For cloud drafts from file battles, use `lf battle file push`.

## Prerequisites

- Objects imported: `lf import <path>`
- API mode: `lf use local` or `lf --local sync …`
- Optional: `lf db dev` if the local stack is not running

## Commands

```bash
lf sync status          # list registry entries
lf sync plan            # dry-run push plan (requires Supabase local)
lf sync push --all      # push registry to local Supabase
lf sync push --path ./lenses/my-lens/LENS.MD
lf sync pull --kind lens --id <id>   # refresh file from registry export
```

## Supported kinds (push)

MVP push supports **lens** documents with a body of at least 50 characters via `fn_create_lens`. Other kinds are listed in plan output and skipped until RPC coverage expands.

## Errors

| Message | Fix |
|---------|-----|
| requires Supabase local | `lf use local` or prefix with `lf --local` |
| stack not running | `lf db dev` |
| missing cloud keys on validate | You ran a cloud command; file commands do not need keys |
