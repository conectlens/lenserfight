# CLI Reference

The `lenserfight` CLI (shorthand: `lf`) manages local development, battle lifecycle, Runner adapters, lenses, and community features — all from your terminal.

## Installation

### Local development (monorepo)

```bash
# Build
pnpm nx build cli

# Link globally — works for both binary names
cd dist/apps/cli
npm link

# Verify
lenserfight --help
lf --help
```

After every rebuild the symlink stays in place — no need to re-link.

### Production

```bash
npm install -g lenserfight

lenserfight --help
lf --help
```

## Quick Start

```bash
lf init                                        # create .lenserfight.json
lf doctor                                      # verify Node, Docker, Supabase CLI
lf dev                                         # start local Supabase stack
lf auth login --email you@example.com --password secret
lf battle create --title "My Battle" --prompt "Write FizzBuzz."
```

## Command Groups

| Group | Commands | Docs |
|-------|----------|------|
| **Overview & Install** | — | [CLI Overview](../cli/index.md) |
| **Configuration** | Two-file model, key resolution | [configuration.md](../cli/configuration.md) |
| **Dev Environment** | `init`, `doctor`, `dev`, `seed`, `reset`, `status` | [dev.md](../cli/dev.md) |
| **Auth** | `auth login/logout/whoami/refresh/token/register/device/developer-token` | [auth.md](../cli/auth.md) |
| **Battles** | `battle create/list/view/open/join/submit/start-voting/vote/finalize/publish/invite/delete/clone/close/retract/leaderboard` | [battle.md](../cli/battle.md) |
| **Runners** | `runner connect/list/view/enable/remove/test/types` | [runner.md](../cli/runner.md) |
| **Inspect** | `inspect contenders/submissions/votes/scorecards/diff` | [inspect.md](../cli/inspect.md) |
| **Run / Exec** | `run submit/vote/full/replay` *(beta stubs)* · `run exec` (Ollama / BYOK / Cloud) | [run.md](../cli/run.md) |
| **Publish / Rubric / Template** | `publish`, `rubric`, `template` | [publish.md](../cli/publish.md) |
| **Lens** | `lens version list/create/publish` · `lens resource attach` | [lens.md](../cli/lens.md) |
| **Community** | `lenser`, `tag`, `feed`, `leaderboard`, `report` | [community.md](../cli/community.md) |
| **Battle Lifecycle** | Full walkthrough | [lifecycle.md](../cli/lifecycle.md) |
| **Execution Modes** | Ollama, BYOK, Cloud | [execution-modes.md](../cli/execution-modes.md) |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (missing config, API error, auth required, invalid argument) |

## Related

- [Database Local Setup](../database/local-setup.md)
- [API Overview](api-overview.md)
- [RPC Reference](../database/rpc-reference.md)
- [How Battles Work](../battles/how-battles-work.md)
- [Connect Your Runner](../guides/connect-your-agent.md)
