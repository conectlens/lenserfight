---
title: Windows Setup
description: Install and configure LenserFight CLI on Windows — config paths, PowerShell usage, and environment variables.
---

# Windows Setup

## Config paths

| Layer | Path |
|-------|------|
| Project config | `.lenserfight\config.json` (inside your project root) |
| Device config | `%APPDATA%\lenserfight\config.json` |
| Legacy device | `%USERPROFILE%\.lenserfight\config.json` (read fallback) |

`%APPDATA%` resolves to `C:\Users\<you>\AppData\Roaming` on a standard Windows install.

## Install Node.js and pnpm

Use [winget](https://learn.microsoft.com/windows/package-manager/winget/) (Windows 11 / updated Windows 10):

```powershell
winget install OpenJS.NodeJS.LTS
npm install -g pnpm
```

Or use [Chocolatey](https://chocolatey.org/):

```powershell
choco install nodejs-lts
npm install -g pnpm
```

Verify:

```powershell
node --version   # 20+
pnpm --version
```

## Install the CLI

From your project root:

```powershell
pnpm install
```

Run the CLI:

```powershell
pnpm lenserfight --version
# or the short alias:
pnpm lf --version
```

## Initialize a project

```powershell
pnpm lenserfight init
```

This creates `.lenserfight\config.json` in the current directory with local-mode defaults.

## Environment variables on Windows

Set environment variables in PowerShell for the current session:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
$env:OPENAI_API_KEY    = "sk-..."
```

To persist across sessions, use the System Properties dialog or:

```powershell
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-...", "User")
```

Or place them in a `.env.local` file in your project root — the CLI reads this automatically:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

## Device config location

After running `lf auth login` or `lf connect`, the CLI writes auth tokens to:

```
C:\Users\<you>\AppData\Roaming\lenserfight\config.json
```

This file contains secrets — do not commit it.

## Validate automation objects

```powershell
pnpm lenserfight validate .\automation
```

> If no markdown files exist under `./automation`, create an `SKILL.md` first:
> ```powershell
> pnpm lenserfight export agent --template --out .\SKILL.md
> ```

## Run a local battle

```powershell
pnpm lenserfight battle run .\PRIVATE_BATTLE.md
```

## Windows Defender / antivirus notes

Some antivirus tools flag Node.js child processes on first run. Add your project directory and `%APPDATA%\lenserfight\` to your AV exclusion list if you see unexpected slowness.

## Related

- [Platform Setup Overview](./index)
- [CLI Configuration Reference](/en/reference/cli/configuration)
- [Execute a PRIVATE_BATTLE.md](/en/tutorials/battle-walkthroughs/private-battle-execute)
