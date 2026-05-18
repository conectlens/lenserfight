---
title: Pardus Setup
description: Install and configure LenserFight CLI on Pardus — TÜBİTAK's national Linux distribution, Debian-based, XDG config paths.
---

# Pardus Setup

[Pardus](https://pardus.org.tr/) is Turkey's national Linux distribution, developed by [TÜBİTAK ULAKBİM](https://www.tubitak.gov.tr/). It is Debian-based and XDG-compliant, so config paths match the [Linux Setup](./linux) exactly.

## Config paths

| Layer | Path |
|-------|------|
| Project config | `.lenserfight/lenserfight.json` (inside your project root) |
| Device config | `$XDG_CONFIG_HOME/lenserfight/config.json` |
| Default device | `~/.config/lenserfight/config.json` (when `XDG_CONFIG_HOME` is unset) |
| Legacy device | `~/.lenserfight/lenserfight.json` (read fallback) |

## Install Node.js on Pardus

Pardus's default apt repositories may not carry Node.js 20+. Use the NodeSource setup script:

```bash
# Install Node.js 20 from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # should print v20.x.x
```

Or use nvm for per-user version management:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

## Install pnpm

```bash
npm install -g pnpm
```

## Install build dependencies (if needed)

Some native Node addons require build tools:

```bash
sudo apt install -y build-essential python3
```

## Install the CLI

From your project root:

```bash
pnpm install
```

Verify:

```bash
pnpm lenserfight --version
pnpm lf --version
```

## Initialize a project

```bash
pnpm lenserfight init
```

Creates `.lenserfight/lenserfight.json` with local-mode defaults.

## Environment variables

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

Add to `~/.bashrc` or `~/.profile` to persist. Or place in `.env.local` at your project root.

## Device config location

```
~/.config/lenserfight/config.json
```

This file contains secrets — do not commit it.

## Pardus-specific notes

- Pardus ships with GNOME or XFCE desktops. Both support XDG conventions fully.
- The GNOME Pardus Software Center does not list Node.js — use apt or nvm as shown above.
- If you use the Pardus Live DVD for testing, set `mode: local` in your project config — no internet connection is needed for local-mode battles.
- Pardus 23 (Karınca) and Pardus 21 (Anka) are both Debian-based and work identically for this setup.

## Run a local battle

```bash
pnpm lenserfight battle run ./PRIVATE_BATTLE.md
pnpm lenserfight battle run ./PRIVATE_BATTLE.md --execute
```

## Related

- [Platform Setup Overview](./index)
- [Linux Setup](./linux)
- [CLI Configuration Reference](/en/reference/cli/configuration)
- [Pardus official site](https://pardus.org.tr/)
- [Execute a PRIVATE_BATTLE.md](/en/tutorials/battle-walkthroughs/private-battle-execute)
