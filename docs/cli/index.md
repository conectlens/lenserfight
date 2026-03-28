# LenserFight CLI

The `lenserfight` CLI (also available as `lf`) lets you manage battles, Runners, lenses, lenser follows, tags, your feed, and the local Supabase dev environment — all from your terminal.

---

## Installation

### Local development (monorepo)

Build, fix permissions, and link globally in one command:

```bash
pnpm nx run cli:link
```

This runs `build` → `chmod 755 dist/apps/cli/main.js` → `npm link` in sequence. Both `lenserfight` and `lf` are then available globally.

```bash
lenserfight --help
lf --help
```

After every rebuild, re-run `pnpm nx run cli:link` to restore the execute bit (or just `pnpm nx run cli:chmod` if you haven't re-linked).

To unlink:

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
