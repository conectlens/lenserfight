# CLI Cross-Platform Compatibility

This page documents how the `lf` CLI behaves across macOS, Linux, and Windows, as well as in headless and CI environments. It explains the design decisions behind the cross-platform support layer and lists known limitations per platform.

---

## Supported platforms

| Platform | Status | Minimum version |
|----------|--------|-----------------|
| macOS (Apple Silicon & Intel) | Fully supported | macOS 12 Monterey |
| Linux (x64, arm64) | Fully supported | glibc ≥ 2.17 (Ubuntu 18.04+, Debian 10+, RHEL 8+) |
| Windows (x64) | Supported | Windows 10 build 1903+ |
| WSL 1 / WSL 2 | Supported | Ubuntu 20.04+ inside WSL |
| Docker (official Node.js images) | Supported | `node:22-alpine`, `node:22-bookworm-slim`, etc. |
| GitHub Actions, GitLab CI, CircleCI | Supported | Use `actions/setup-node@v4` with Node.js 22 |

---

## Node.js version enforcement

The CLI startup banner runs a synchronous Node.js version check **before any module is loaded**:

```
Error: @lenserfight/cli requires Node.js v22 or newer (you have v18.20.4).
Download the latest LTS from https://nodejs.org/en/download
```

This check is injected into the compiled output at build time, so it fires even before the ES Module runtime parses the bundle. If you see a raw `ERR_REQUIRE_ESM` instead, the check did not run — which means you are using a very old binary. Reinstall with `npm install -g @lenserfight/cli@latest`.

### Why ≥ 22?

The CLI and its dependencies (most notably `citty`) are distributed as **ES Modules** (`.mjs`). Stable, synchronous interop between CommonJS callers and ESM packages requires Node.js 22.12+. Requiring ≥ 22 covers the entire stable v22 LTS line.

---

## Terminal and color output

### TTY detection

Color output and the interactive TUI dashboard are enabled only when `process.stdout.isTTY` is `true`. When stdout is piped or redirected (e.g., `lf lenses | grep foo`), all ANSI sequences are stripped automatically.

### NO_COLOR standard

The CLI honours the [no-color.org](https://no-color.org/) specification exactly:

- `NO_COLOR` set to **any value** (including an empty string) → color disabled
- `NO_COLOR` **not present** in the environment → color enabled (if TTY)

```bash
NO_COLOR=1 lf lenses list      # plain text
NO_COLOR= lf lenses list       # also plain text (empty string counts)
unset NO_COLOR; lf lenses list  # color if connected to a TTY
```

### TERM=dumb

Setting `TERM=dumb` also disables color output and the alt-screen TUI. This is the expected behavior for editors and tools that embed terminal output.

### Windows terminal support

The Windows Console (conhost.exe, Windows Terminal, PowerShell 7+, Git Bash, WSL) supports ANSI escape codes from Windows 10 1903 onwards. The CLI does not apply any Windows-specific workarounds — standard TTY detection is sufficient.

---

## File system and paths

### Path separators

All internal path handling uses Node.js `path.join` and `path.resolve`, which produce platform-native separators (`\` on Windows, `/` on Unix). String literals in the source that contain forward slashes are always passed through `resolve()` before use, so they are correct on all platforms.

### Configuration directories

User-level configuration and credentials are stored in the platform-appropriate directory:

| Platform | Config directory |
|----------|-----------------|
| macOS | `~/Library/Application Support/lenserfight/` |
| Linux | `$XDG_CONFIG_HOME/lenserfight/` (falls back to `~/.config/lenserfight/`) |
| Windows | `%APPDATA%\lenserfight\` |

Project-level config lives in `.lenserfight/` inside the project root. Local battle state is stored at `.lenserfight/local-battles/`.

### File permissions

On Unix, credential files (`auth.json`) are created with mode `0600` (owner read/write only). On Windows, Node.js ignores POSIX permission mode arguments; file security is enforced at the directory level through NTFS access control lists instead.

---

## Process spawning and shell commands

### URL opening (`lf docs open`, `lf media play`)

Opening a URL in the default system browser uses `spawnSync` with an array of arguments rather than a shell template string. This prevents shell metacharacter injection if the URL contains special characters:

| Platform | Command used |
|----------|-------------|
| macOS | `open <url>` |
| Windows | `cmd /c start "" <url>` |
| Linux | `xdg-open <url>` |

If the opener fails (e.g., no browser available in a headless container), the CLI prints the URL to the console so it can be opened manually.

### `which` / `where` command detection

When the `doctor` or `onboarding` subsystem checks whether a tool is installed (Docker, Supabase CLI, etc.):

- **Unix:** `which <cmd>`
- **Windows:** `where <cmd>`

The platform is detected at runtime via `process.platform`.

### Bash scripts (`combine-seeds.sh`)

The `lf dev seed` command runs `supabase/combine-seeds.sh` when it is present. On Windows, this requires `bash` to be in `PATH`. If `bash` is not found, the CLI skips the script with a helpful message:

```
combine-seeds.sh found but bash is not in PATH on Windows.
Install Git for Windows (https://git-scm.com) or enable WSL, then run:
  bash supabase/combine-seeds.sh
```

Install [Git for Windows](https://git-scm.com/) to get a `bash.exe` that works in the standard Windows `PATH`.

### `shell: true` spawning

Commands that launch external processes (e.g., `supabase start`, `pnpm install`) use `shell: true` without specifying a shell path. On Unix this resolves to `/bin/sh`; on Windows to `cmd.exe`. Commands that have been tested on both are noted in their respective command references. If you encounter a platform-specific failure, open an issue with the exact command and OS version.

---

## Shell completion

`lf completion` generates completion scripts for:

| Shell | Command |
|-------|---------|
| Bash | `lf completion bash >> ~/.bash_completion` |
| Zsh | `lf completion zsh >> ~/.zshrc` |
| Fish | `lf completion fish > ~/.config/fish/completions/lf.fish` |

**PowerShell** completion is not yet generated automatically. To add basic tab completion for PowerShell, add the following to your `$PROFILE`:

```powershell
Register-ArgumentCompleter -Native -CommandName lf -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)
    # Invoke lf --help and parse subcommands for a basic fallback
}
```

See [Shell Completion](completion.md) for full installation instructions per shell.

---

## CI and headless environments

### Authentication

Use a developer or service token instead of interactive browser login:

```bash
export LENSERFIGHT_API_KEY=lf_svc_...
lf run exec --lens my-lens-slug
```

### Disabling color / TUI

In CI environments, stdout is typically not a TTY, so color and the TUI are automatically disabled. To explicitly disable color regardless of TTY state:

```bash
NO_COLOR=1 lf lenses list
```

### Docker

```dockerfile
FROM node:22-alpine
RUN npm install -g @lenserfight/cli
ENV LENSERFIGHT_API_KEY=lf_svc_...
RUN lf doctor --check api
```

### GitHub Actions

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'
- run: npm install -g @lenserfight/cli
- run: lf run exec --lens my-lens-slug
  env:
    LENSERFIGHT_API_KEY: ${{ secrets.LF_API_KEY }}
```

---

## Known limitations

| Limitation | Platforms affected | Workaround |
|------------|--------------------|------------|
| Bash scripts require `bash` in PATH | Windows | Install Git for Windows or WSL |
| Shell completion not generated for PowerShell | Windows | Manual `Register-ArgumentCompleter` |
| `chmod 600` silently ignored | Windows | NTFS ACL provides equivalent protection |
| Interactive TUI requires a real TTY | CI, Docker | Use `--json` flags for machine-readable output |
| `lf top` (runtime monitor) requires a color-capable terminal | All | Falls back to `lf top stream` in non-TTY |

---

## Related

- [Installation](installation.md)
- [Shell Completion](completion.md)
- [Global Flags](global-flags.md)
- [Environment Variables](env.md)
- [Doctor Command](doctor.md)
