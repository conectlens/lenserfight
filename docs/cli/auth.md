# Authentication Commands

Manage your LenserFight session, browser-based device approval, and time-bounded developer tokens.

```bash
lf auth <subcommand>
```

---

## `auth login`

### Browser login (recommended)

Run `lf auth login` with no flags. The CLI opens your browser and waits.

```bash
lf auth login
```

**What happens:**

1. The CLI creates a short-lived approval request and prints a code + URL.
2. Your browser opens `https://auth.lenserfight.com/device-approval?mode=login`.
3. Sign in (or you are already signed in) — the code is pre-filled.
4. Click **Approve login**.
5. The CLI detects approval and saves your session to `~/.lenserfight/config.json`.

If the browser does not open automatically, copy the URL printed in the terminal and open it manually.

### Email / password (headless / CI)

Still supported for scripted and headless environments:

```bash
lf auth login --email you@example.com --password secret
```

| Flag | Required | Description |
|------|----------|-------------|
| `--email` | No* | Account email address (*required when using email/password path) |
| `--password` | No* | Account password (*required when using email/password path) |

### `auth logout`

Clear stored session tokens and any saved developer token metadata.

```bash
lenserfight auth logout
```

### `auth whoami`

Show the currently authenticated user.

```bash
lenserfight auth whoami
```

Outputs email, lenser handle, and token expiry.

### `auth refresh`

Force-refresh the stored access token using the saved refresh token.

```bash
lenserfight auth refresh
```

Use this when the session is still valid but the access token expired.

### `auth token`

Print the raw Supabase session access token to stdout.

```bash
lenserfight auth token
lenserfight auth token | pbcopy   # macOS clipboard
```

### `auth register`

Create a new account and lenser profile in one step.

```bash
lenserfight auth register \
  --email you@example.com \
  --password secret \
  --display-name "Ada Lovelace"
```

| Flag | Required | Description |
|------|----------|-------------|
| `--email` | Yes | Account email address |
| `--password` | Yes | Password (min 8 characters) |
| `--display-name` | No | Public display name for your lenser profile |

## Device approval

### `auth device request`

Start a short-lived device approval request, open the auth app route, and wait for a developer token to be minted.

```bash
lenserfight auth device request --label "MacBook Pro"
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--label` | No | `null` | Optional display label for the resulting developer token |
| `--request-ttl-minutes` | No | `10` | How long the approval code stays valid |
| `--token-ttl-hours` | No | `24` | How long the developer token stays valid |
| `--json` | No | `false` | Print the initial request payload as JSON |

The command prints the approval code and the auth app URL. Approve it in the browser at `/device-approval` while you are signed in. The CLI then polls until the token is issued and saves it separately from the session tokens.

## Developer tokens

### `auth developer-token current`

Show the locally stored developer token metadata.

```bash
lenserfight auth developer-token current
```

### `auth developer-token list`

List the developer tokens associated with the currently signed-in user.

```bash
lenserfight auth developer-token list
lenserfight auth developer-token list --json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--json` | No | `false` | Print the token list as JSON |

### `auth developer-token revoke`

Revoke a developer token by UUID.

```bash
lenserfight auth developer-token revoke <token-id>
```

## Security model

- Session tokens continue to power the normal Supabase auth flow.
- Developer tokens are time-bounded and stored separately in `~/.lenserfight/config.json`.
- The browser approval page only approves the request; it never reveals the session token or password.
- The approval and token RPCs require an authenticated session.

## Related

- [Configuration](configuration.md) - where tokens are stored
- [Environment Variables](../reference/environment-variables.md) - env precedence and auth URLs
- [Community Commands](community.md) - follow lensers after logging in
