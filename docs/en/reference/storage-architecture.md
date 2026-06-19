# Storage Architecture — Portable vs Runtime

LenserFight separates filesystem state into two strict layers. The rules below apply equally to the LenserFight web app, the `lenserfight` CLI, and the Chainabit operator agent.

## The two layers

| Layer            | Path                  | Tracked in git | Contains                                                                                              |
| ---------------- | --------------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| **Portable**     | `.lenserfight/` (repo) | YES            | Lenses, agents, workflows, battles, rays, documentation, evaluators, scorers — anything safe to share |
| **Runtime**      | `~/.lenserfight/`     | NO             | Local battle traces, AI execution caches, auth sessions, runtime logs, user preferences, secrets      |

Crossing the boundary is a bug. Never write portable assets into `~/.lenserfight/`; never write per-user runtime state into `.lenserfight/`.

## What MUST NOT live in `.lenserfight/`

- API tokens, OAuth refresh tokens, signed URLs
- Per-machine configuration (paths, hostnames, machine IDs)
- Local battle execution traces (`local-battles/<id>.json` is **runtime**, not portable)
- AI provider response caches
- Personal user metadata
- `.env`, `.env.user`, `.env.tokens`

If any of these appear under `.lenserfight/`, treat it as a security incident — quarantine, rotate, and open a defect ticket.

## Where runtime state lives

```
~/.lenserfight/
├── runtime/
│   ├── battles/<battle-id>/
│   │   ├── traces.jsonl       ← per-step execution trace
│   │   ├── outputs/           ← cached AI outputs
│   │   └── checkpoints.json
│   ├── workflows/<run-id>/
│   └── lenses/<execution-id>/
├── cache/
│   ├── ai-responses/          ← keyed by content hash
│   └── manifest-index/
├── profiles/<profile>.json    ← CLI auth (0600 mode)
├── secrets/                   ← encrypted secret store
│   └── *.age | *.gpg
├── .env.user                  ← user-level env overrides
├── .env.tokens                ← API tokens (do NOT inline in YAML)
└── state.db                   ← optional SQLite for local indexes
```

The CLI and web runtime never store the contents of `secrets/` in plaintext. All access goes through an OS keychain or an encrypted file. The path layout is intentionally similar to Claude Code's `~/.claude/` and Gemini CLI's `~/.gemini/` so operators can apply the same backup policies.

## Environment variable layering

LenserFight loads environment variables in this order. Later sources override earlier ones:

1. OS defaults
2. `.env.example` (committed, illustrative only — never read at runtime)
3. `.env` (gitignored, project defaults — optional)
4. `.env.development` / `.env.test` / `.env.production` (gitignored, per-env)
5. `.env.local` (gitignored, per-developer)
6. `~/.lenserfight/.env.user` (gitignored, per-user across all projects)
7. `~/.lenserfight/.env.tokens` (gitignored, secret-only)
8. Process environment variables (highest precedence)

Tokens live exclusively in layers 6, 7, and 8. Templates (`SKILL.md`, `SKILL.md`, `SKILL.md`, YAML, JSON) must never contain raw token values — they reference variable names only.

## Battle storage separation

The legacy `.lenserfight/local-battles/<id>.json` path mixed portable battle definitions with runtime execution traces. The new layout splits them:

| Concept                          | Path                                              | Layer      |
| -------------------------------- | ------------------------------------------------- | ---------- |
| Battle template definition       | `.lenserfight/battles/<slug>/SKILL.md`           | Portable   |
| Battle config (rubric, scoring)  | `.lenserfight/battles/<slug>/config.yaml`         | Portable   |
| Battle execution trace           | `~/.lenserfight/runtime/battles/<battle-id>/`     | Runtime    |
| Cached AI responses for a battle | `~/.lenserfight/cache/ai-responses/`              | Runtime    |
| Battle decryption key            | `LENSERFIGHT_LOCAL_BATTLE_KEY` (env, not on disk) | Process    |

Any tool that reads or writes battle data MUST honour this split. Migration of legacy `.lenserfight/local-battles/*` files is handled by the CLI command `lf battle migrate-legacy` (one-shot).

## ConectLens terminology

LenserFight belongs to the **ConectLens** ecosystem. The filesystem layout preserves ConectLens vocabulary in the canonical filename:

- `SKILL.md` — prompt asset (ConectLens-native)
- `SKILL.md` — owner profile (reserved, not yet exported)
- `SKILL.md` — configured AI lenser
- `SKILL.md` — DAG of lenses
- `SKILL.md` — scored competition
- `SKILL.md` — discovery ray

`SKILL.MD` is supported as an industry-compatibility alias for `SKILL.md` because many OSS AI ecosystems (Claude Code, agentskills.io, others) standardise on `SKILL.MD` for the same concept. When both files exist for the same template they MUST contain byte-identical content; the recommended pattern is to keep `SKILL.md` as the source and `SKILL.MD` as a generated mirror created by `lf doctor sync-aliases`.

## How the database mirrors this tree

Every public template in the database has a 1:1 sibling under `.lenserfight/` keyed by slug:

| DB table              | Mirrored at                          |
| --------------------- | ------------------------------------ |
| `lenses.lenses`       | `.lenserfight/lenses/<slug>/SKILL.md` |
| `agents.ai_lensers`   | `.lenserfight/lensers/<slug>/SKILL.md` |
| `lenses.workflows`    | `.lenserfight/colenses/<slug>/SKILL.md` |
| `battles.battles`     | `.lenserfight/battles/<slug>/SKILL.md` |
| `content.tags`        | `.lenserfight/rays/<slug>/SKILL.md`   |

A pgTAP test (`supabase/tests/31_seed_quality.sql`) enforces this invariant for every seed under `supabase/seeds/4*_*templates.sql`.

## OS-grade rationale

The two-layer split mirrors how professional infrastructure tools draw the line:

| Tool          | Portable             | Runtime                                  |
| ------------- | -------------------- | ---------------------------------------- |
| Docker        | `docker-compose.yml` | `~/.docker/`                             |
| Supabase      | `supabase/`          | `~/.supabase/`                           |
| Claude Code   | `.claude/`           | `~/.claude/projects/`, `~/.claude/state/` |
| Gemini CLI    | `.gemini/`           | `~/.gemini/`                             |
| LenserFight   | `.lenserfight/`      | `~/.lenserfight/`                        |

If you are introducing a new file under `.lenserfight/` and you are not certain it is safe to commit, check the rules above. When in doubt, default to runtime.
