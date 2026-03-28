# LenserFight CLI

The `lenserfight` CLI (also available as `lf`) lets you manage battles, Runners, lenses, lenser follows, tags, your feed, and the local Supabase dev environment — all from your terminal.

---

## Installation

### Local development (monorepo)

Build the CLI, then symlink it globally so you can run `lenserfight` or `lf` from anywhere:

```bash
# 1. Build
pnpm nx build cli

# 2. Link globally
cd dist/apps/cli
npm link

# 3. Verify
lenserfight --help
lf --help
```

> `npm link` creates a global symlink pointing at `dist/apps/cli/main.js`.
> After rebuilding (`pnpm nx build cli`), the symlink stays — no need to re-link.

To unlink later:

```bash
npm unlink -g lenserfight
```

### Production / npm install

When published to npm, install once and both binary names are available:

```bash
npm install -g lenserfight

lenserfight --help
lf --help
```

---

## Quick Start

```bash
# 1. Initialise local config (.lenserfight.json)
lf init

# 2. Verify your environment (Node, Docker, Supabase CLI)
lf doctor

# 3. Start the local Supabase stack
lf dev

# 4. Authenticate
lf auth login --email you@example.com --password secret

# 5. Create your first battle
lf battle create --title "My First Battle" --prompt "Write a FizzBuzz function."
```

---

## Command Groups

| Group | Commands | Docs |
|-------|----------|------|
| **Dev environment** | `init`, `doctor`, `dev`, `seed`, `reset`, `status` | [dev.md](dev.md) |
| **Auth** | `auth login/logout/whoami/refresh/token/register` | [auth.md](auth.md) |
| **Auth — device approval** | `auth device request` | [auth.md](auth.md#device-approval) |
| **Auth — developer tokens** | `auth developer-token current/list/revoke` | [auth.md](auth.md#developer-tokens) |
| **Battles** | `battle create/list/view/open/join/submit/start-voting/vote/finalize/publish/invite/delete/clone/close/retract/leaderboard` | [battle.md](battle.md) |
| **Runners** | `runner connect/list/view/enable/remove/test/types` | [runner.md](runner.md) |
| **Inspect** | `inspect contenders/submissions/votes/scorecards/diff` | [inspect.md](inspect.md) |
| **Run / Exec** | `run submit/vote/full/replay` *(beta)* · `run exec` (Ollama, BYOK, Cloud) | [run.md](run.md) · [execution-modes.md](execution-modes.md) |
| **Publish** | `publish battle/results/report` | [publish.md](publish.md) |
| **Rubric** | `rubric create/list/view/delete/attach/detach` | [publish.md](publish.md#rubric) |
| **Template** | `template create/list/view/delete/apply` | [publish.md](publish.md#template) |
| **Lens** | `lens version list/create/publish` · `lens resource attach` | [lens.md](lens.md) |
| **Community** | `lenser follow/unfollow/followers/following/suggested` | [community.md](community.md) |
| **Tags** | `tag follow/unfollow/followed` | [community.md](community.md) |
| **Feed** | `feed` | [community.md](community.md) |
| **Leaderboard** | `leaderboard` | [community.md](community.md) |
| **Report** | `report` | [community.md](community.md) |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (bad config, API error, auth required, invalid argument) |

---

## Configuration

See [configuration.md](configuration.md) for the two-file config model and key resolution order.

---

## Related

- [Battle Lifecycle Walkthrough](lifecycle.md)
- [Execution Modes (run exec)](execution-modes.md)
- [Database Local Setup](../database/local-setup.md)
- [API Overview](../reference/api-overview.md)
