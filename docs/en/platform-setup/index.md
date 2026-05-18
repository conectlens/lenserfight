---
title: Platform Setup
description: Install and configure LenserFight CLI on Windows, Linux, macOS, and Pardus — with OS-specific config paths and sync rules.
---

# Platform Setup

The LenserFight CLI uses a **two-layer configuration model**: a project-level config committed alongside your code, and a device-level config private to your machine. Config file paths differ by operating system.

## Config layers at a glance

| Layer | File / Directory | Purpose |
|-------|-----------------|---------|
| Project | `.lenserfight/lenserfight.json` | Mode, ports, app list — safe to commit |
| Project (legacy) | `.lenserfight.json` | Older flat file — still read, never written |
| Device — Windows | `%APPDATA%\lenserfight\config.json` | Auth tokens, API keys |
| Device — macOS | `~/Library/Application Support/lenserfight/config.json` | Auth tokens, API keys |
| Device — Linux | `$XDG_CONFIG_HOME/lenserfight/config.json` (default: `~/.config/lenserfight/`) | Auth tokens, API keys |
| Device — Pardus | same as Linux (XDG-compliant) | Auth tokens, API keys |
| Legacy device | `~/.lenserfight/lenserfight.json` | Kept for backward compat; mirrored on write |

## Resolution order

When the CLI resolves a config value, it checks sources in this priority:

1. `process.env` / `.env.local` / `.env` (highest)
2. Device config at the OS-aware path above
3. Legacy `~/.lenserfight/lenserfight.json` (fallback read only)
4. Well-known local Supabase defaults *(local mode only)*
5. Built-in defaults (lowest)

## Workspace sync

Every time `saveConfig` writes a project config, it also registers the workspace in the device config under `workspaces`:

```json
{
  "workspaces": {
    "/home/user/projects/my-lenserfight-project": {
      "mode": "local",
      "lastSeenAt": "2026-05-09T12:00:00.000Z",
      "configPath": "/home/user/projects/my-lenserfight-project/.lenserfight/lenserfight.json"
    }
  }
}
```

This lets the TUI dashboard (`lf`) discover all projects on the device without scanning the filesystem.

## Markdown and JSON automation objects

Automation objects (`LENS.MD`, `LENSER.MD`, `COLENS.MD`, `BATTLE.MD`, `LENSER.MD`, `COLENS.MD`, `TOOL.md`, etc.) are stored as markdown files with YAML frontmatter alongside your code. The local registry at `.lenserfight/automation-registry.json` indexes them. Runtime runs and reports are written to user runtime storage.

```
.lenserfight/
├── config.json            ← project config (this page)
└── automation-registry.json
```

## Choose your platform

- [Windows](./windows) — PowerShell paths, `%APPDATA%`, winget / npm install
- [Linux](./linux) — XDG config, bash/zsh, apt / npm install
- [macOS](./macos) — `~/Library/Application Support`, brew / npm install
- [Pardus](./pardus) — TÜBİTAK Linux, apt-based, same XDG paths as Linux

## Related

- [CLI Configuration Reference](/en/reference/cli/configuration)
- [Environment Variables](/en/reference/platform-api/environment-variables)
- [CLI: Getting Started](/en/tutorials/getting-started/cli-getting-started)
