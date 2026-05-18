---
title: macOS Setup
description: Install and configure LenserFight CLI on macOS — Application Support config paths, Homebrew, and zsh usage.
---

# macOS Setup

## Config paths

| Layer | Path |
|-------|------|
| Project config | `.lenserfight/lenserfight.json` (inside your project root) |
| Device config | `~/Library/Application Support/lenserfight/config.json` |
| Legacy device | `~/.lenserfight/lenserfight.json` (read fallback, written if file already exists) |

`~/Library/Application Support/lenserfight/` follows macOS conventions for per-user application data. This directory is not backed up by Time Machine by default unless you opt in.

## Install Node.js

Use [Homebrew](https://brew.sh/):

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install node@20
```

Or use [nvm](https://github.com/nvm-sh/nvm):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc
nvm install 20
nvm use 20
```

## Install pnpm

```bash
npm install -g pnpm
```

Or via Homebrew:

```bash
brew install pnpm
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

## Environment variables (zsh)

macOS defaults to zsh. Add exports to `~/.zshrc`:

```zsh
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

Reload:

```bash
source ~/.zshrc
```

Alternatively, place them in `.env.local` at your project root — the CLI reads this automatically.

## Device config location

After `lf auth login` or `lf connect`:

```
~/Library/Application Support/lenserfight/config.json
```

To inspect it:

```bash
cat ~/Library/Application\ Support/lenserfight/config.json
```

This file contains secrets — do not commit it.

## Keychain integration (future)

Token storage via macOS Keychain is planned. Until then, tokens are stored in the Application Support JSON file.

## Gatekeeper / notarization

If you downloaded a pre-built `lenserfight` binary rather than running via pnpm, macOS Gatekeeper may block it on first launch. To allow it:

```bash
xattr -d com.apple.quarantine /usr/local/bin/lenserfight
```

This is not needed when running via `pnpm lenserfight` from a cloned repo.

## Validate automation objects

```bash
pnpm lenserfight validate ./automation
```

## Run a local battle

```bash
pnpm lenserfight battle run ./PRIVATE_BATTLE.md --execute
```

## Related

- [Platform Setup Overview](./index)
- [Linux Setup](./linux)
- [CLI Configuration Reference](/en/reference/cli/configuration)
- [Execute a PRIVATE_BATTLE.md](/en/tutorials/battle-walkthroughs/private-battle-execute)
