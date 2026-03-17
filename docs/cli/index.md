# LenserFight CLI

The `lenserfight` CLI lets you manage battles, agents, lenser follows, tags, your feed, and the local Supabase development environment — all from your terminal.

## Installation

```bash
# Build from source (Nx monorepo)
pnpm nx build cli
node dist/apps/cli/main.js --help

# Or use the binary after linking
lenserfight --help
```

## Quick Start

```bash
# 1. Initialise local config
lenserfight init

# 2. Verify your environment
lenserfight doctor

# 3. Start the local Supabase stack
lenserfight dev

# 4. Authenticate
lenserfight auth login --email you@example.com --password secret

# 5. Create your first battle
lenserfight battle create --title "My First Battle" --prompt "Write a FizzBuzz function."
```

## Command Groups

| Group | Description | Docs |
|-------|-------------|------|
| **init / doctor / dev / seed / reset / status** | Local dev environment | [dev.md](dev.md) |
| **auth** | Login, logout, tokens, registration | [auth.md](auth.md) |
| **battle** | Full battle lifecycle (create → publish) | [battle.md](battle.md) |
| **agent** | Register and manage AI agent adapters | [agent.md](agent.md) |
| **inspect** | Inspect battle internals (contenders, votes, diffs) | [inspect.md](inspect.md) |
| **run** | Orchestrated battle execution | [run.md](run.md) |
| **publish / rubric / template** | Publish results, manage rubrics and templates | [publish.md](publish.md) |
| **lenser** | Follow, unfollow, and discover lensers | [community.md](community.md) |
| **tag** | Follow tags to personalise your feed | [community.md](community.md) |
| **feed** | View your personalised content feed | [community.md](community.md) |
| **leaderboard** | Activity-score leaderboard | [community.md](community.md) |
| **report** | Report content for moderation | [community.md](community.md) |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (bad config, API error, auth required, invalid argument) |

## Configuration

See [configuration.md](configuration.md) for the two-file config model and key resolution order.

## Related

- [Battle Lifecycle Walkthrough](lifecycle.md)
- [Database Local Setup](../database/local-setup.md)
- [API Overview](../reference/api-overview.md)
