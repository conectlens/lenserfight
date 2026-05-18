---
title: Linux Setup
description: Install and configure LenserFight CLI on Linux — XDG config paths, bash/zsh usage, and environment variables.
---

# Linux Setup

Covers Debian/Ubuntu, Fedora, Arch, and any XDG-compliant distribution. For Pardus specifically, see [Pardus Setup](./pardus).

## Config paths

| Layer | Path |
|-------|------|
| Project config | `.lenserfight/lenserfight.json` (inside your project root) |
| Device config | `$XDG_CONFIG_HOME/lenserfight/config.json` |
| Default device | `~/.config/lenserfight/config.json` (when `XDG_CONFIG_HOME` is unset) |
| Legacy device | `~/.lenserfight/lenserfight.json` (read fallback, written if file already exists) |

The CLI respects the [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/latest/). If you use a custom `XDG_CONFIG_HOME`, the device config follows it automatically.

## Install Node.js

Use [nvm](https://github.com/nvm-sh/nvm) for version management (recommended):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc   # or ~/.zshrc
nvm install 20
nvm use 20
```

Or install from your distro's package manager (ensure version 20+):

```bash
# Debian / Ubuntu
sudo apt update && sudo apt install nodejs npm

# Fedora
sudo dnf install nodejs

# Arch
sudo pacman -S nodejs npm
```

## Install pnpm

```bash
npm install -g pnpm
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

Export in your shell session:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

To persist, add the exports to `~/.bashrc` or `~/.zshrc`.

Alternatively, place them in `.env.local` at your project root:

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

## Device config location

After `lf auth login` or `lf connect`:

```
~/.config/lenserfight/config.json
```

This file contains secrets — do not commit it. The `.lenserfight/` directory inside your project is safe to add to `.gitignore` except for `config.json` (no secrets there).

Recommended `.gitignore` additions for your project:

```gitignore
.lenserfight.json
.lenserfight/runs/
.lenserfight/reports/
.lenserfight/local-battles/
```

`config.json` inside `.lenserfight/` is safe to commit (it contains no secrets).

## Validate automation objects

```bash
pnpm lenserfight validate ./automation
```

> Create a template first if needed:
> ```bash
> pnpm lenserfight export agent --template --out ./LENSER.MD
> ```

## Run a local battle

```bash
pnpm lenserfight battle run ./PRIVATE_BATTLE.md
pnpm lenserfight battle run ./PRIVATE_BATTLE.md --execute
```

## Related

- [Platform Setup Overview](./index)
- [Pardus Setup](./pardus)
- [CLI Configuration Reference](/en/reference/cli/configuration)
- [Execute a PRIVATE_BATTLE.md](/en/tutorials/battle-walkthroughs/private-battle-execute)
