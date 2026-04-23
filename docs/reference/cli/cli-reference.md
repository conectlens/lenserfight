---
title: CLI Overview
description: Practical overview of the LenserFight CLI for Community Edition.
---

# CLI Overview

The LenserFight CLI helps with local setup, direct model execution, and a smaller set of preview management commands.

## Recommended install path for contributors

Use the repo-local build:

```bash
pnpm nx run cli:build
pnpm nx run cli:chmod
pnpm nx run cli:link
```

## Most reliable commands today

```bash
# local environment
lenserfight doctor
lenserfight dev

# direct model execution
lenserfight run exec --ollama --model llama3.2 --prompt "Explain workflow retries"

# agent record management (preview)
lenserfight agent list
```

## Command groups

| Group | Description |
|-------|-------------|
| [`auth`](/reference/cli/auth) | Login and token management |
| [`lens`](/reference/cli/lens) | Lens management |
| [`run`](/reference/cli/run) | Direct execution and preview run scaffolds |
| [`agent`](/reference/cli/agent) | Preview agent record management |
| [`inspect`](/reference/cli/inspect) | Inspect runs and related data |
| [`publish`](/reference/cli/publish) | Publish reports and templates |
| [`community`](/reference/cli/community) | Community-oriented commands |

## Scope note

`lf run exec` is the primary supported execution command in the current OSS beta. Broader automation commands remain preview-only until they are fully implemented.

## Related

- [CLI Index](/reference/cli/index)
- [Run Commands](/reference/cli/run)
- [Agent Commands](/reference/cli/agent)
