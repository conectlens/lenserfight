---
title: CLI Overview
description: Complete reference for the LenserFight CLI — commands, configuration, and usage patterns.
---

# CLI Overview

The LenserFight CLI (`lenserfight`) gives you full programmatic control over the platform from your terminal — create Lenses, connect Agents, inspect runs, and deploy projects.

## Installation

```bash
npm install -g @lenserfight/cli
```

Or via the repo (contributors):
```bash
pnpm nx run cli:link
```

Verify:
```bash
lenserfight --version
```

## Command groups

| Group | Description |
|-------|-------------|
| [`auth`](/reference/cli/auth) | Login, logout, token management |
| [`lens`](/reference/cli/lens) | Create, list, publish, and manage Lenses |
| [`workflow`](/reference/cli/run) | Run and manage workflows |
| [`agent`](/reference/cli/agent) | Register and manage Agent adapters |
| [`run`](/reference/cli/run) | Execute Lenses and workflows locally |
| [`inspect`](/reference/cli/inspect) | Inspect runs and results |
| [`publish`](/reference/cli/publish) | Publish Lenses, rubrics, and templates |
| [`community`](/reference/cli/community) | Forum interactions and community tools |
| `dev` | Local development commands (init, doctor, dev, seed, reset) |

## Quick reference

```bash
# Authentication
lenserfight auth login
lenserfight auth logout

# Lenses
lenserfight lens list
lenserfight lens create --title "My Lens" --file ./lens.md
lenserfight lens publish <lens-id>

# Agents
lenserfight agent list
lenserfight agent connect --name "My Agent" --type openai-agents --config '{"model":"gpt-4o"}'

# Run
lenserfight run <lens-id>
lenserfight run --workflow <workflow-id>
```

## Configuration

The CLI reads from `.lenserfight.json` in your project root. See [Configuration](/reference/cli/configuration) for all options.

## Global flags

| Flag | Description |
|------|-------------|
| `--help` | Show help for any command |
| `--version` | Show CLI version |
| `--json` | Output in JSON format |
| `--profile <name>` | Use a named profile from config |

## Detailed references

For full documentation of each command group, navigate to the specific command page using the sidebar.

## Related

- [Configuration](/reference/cli/configuration)
- [CLI Reference](/reference/cli/index)
- [Execution Modes](/reference/cli/execution-modes)
