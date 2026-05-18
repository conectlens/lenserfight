---
title: Update your LenserFight installation
description: How to keep the CLI and web app up to date, understand release channels, and troubleshoot stale installs.
---

# Update your LenserFight installation

LenserFight notifies you automatically when a newer version is available. This guide covers how to act on those notifications, how to update the CLI and the web app, and how to resolve common issues.

---

## CLI

### Check whether you are up to date

```sh
lf update
```

This queries the npm registry, compares your installed version, and prints the correct update command.

### Install the latest stable version

```sh
# npm
npm install -g @lenserfight/cli@latest

# pnpm
pnpm add -g @lenserfight/cli@latest

# yarn
yarn global add @lenserfight/cli@latest
```

### Verify after updating

```sh
lf --version
lf doctor
```

`lf doctor` runs a full environment check including a version freshness test.

### Background update hint

After every command the CLI prints a one-line hint to `stderr` if a newer version exists in its local cache. The cache is refreshed at most once per 24 hours — no network call fires on every command.

```
  ╭─────────────────────────────────────────────────────╮
  │  Update available: v0.10.0-alpha.2 → v0.11.0        │
  │  Run `lf update` for upgrade instructions.          │
  ╰─────────────────────────────────────────────────────╯
```

### Suppress update checks

```sh
LF_NO_UPDATE_CHECK=1 lf <command>   # skip for this invocation
lf --local <command>                 # local mode also skips
```

---

## Web app

### Automatic banner

When a newer web version is deployed, a slim banner appears at the top of the page:

> **Update available: v0.10.0-alpha.2 → v0.11.0** · [Refresh]

Click **Refresh** to reload the page with the new version. The banner dismisses itself for the current browser session. It reappears in a new tab or after a browser restart.

### Why is there a banner instead of an auto-reload?

The web app deliberately does **not** force-reload. Unexpected reloads can disrupt in-progress work (writing a battle, configuring a lens, mid-session).

### Hard refresh

If you suspect a stale bundle without a banner:

```
Ctrl+Shift+R  (Windows/Linux)
Cmd+Shift+R   (macOS)
```

Or clear the browser cache via DevTools → Application → Storage → Clear site data.

---

## Release channels

| Channel | Who should use it |
|---|---|
| `stable` (`latest` tag) | Production use — recommended |
| `beta` | Pre-release feature testing |
| `rc` | Release candidates |
| `nightly` | Bleeding-edge builds |

The CLI update-check and web banner only compare against the **stable** channel by default.

To pin to a pre-release channel:

```sh
npm install -g @lenserfight/cli@beta
```

---

## Troubleshooting

### `lf update` cannot reach the registry

1. Check your internet connection.
2. If behind a corporate proxy, set:
   ```sh
   export HTTPS_PROXY=http://proxy.corp.example.com:8080
   ```
3. Use `--json` to see the raw result for debugging:
   ```sh
   lf update --json
   ```

### The banner does not appear even though a new version is deployed

- The web app fetches `/version.json` at most once per hour. Wait up to an hour, or do a hard refresh.
- `/version.json` is written only during a production build. Local dev builds will not show update banners.
- If the banner was dismissed in this session, it will not reappear until you open a new tab.

### The CLI hint keeps showing after updating

The cache at `~/.lenserfight/update-check.json` may still hold the old version. Delete it:

```sh
rm ~/.lenserfight/update-check.json
```

### Multiple global installs

If you have both `npm` and `pnpm` global paths on your `$PATH`, you may run different versions depending on which one resolves first. Check:

```sh
which lf
lf --version
```

Uninstall from the unused package manager to avoid confusion.

### Rollback

Downgrade to a specific CLI version:

```sh
npm install -g @lenserfight/cli@0.10.0
```

List all published versions:

```sh
npm view @lenserfight/cli versions --json
```

---

## See also

- [`lf update` reference](../../reference/cli/update.md)
- [`lf doctor` reference](../../reference/cli/runner.md)
- [Global flags](../../reference/cli/global-flags.md)