# Authentication Commands

Manage your LenserFight session. All battle lifecycle commands require authentication.

```
lenserfight auth <subcommand>
```

---

## `auth login`

Authenticate with email and password. Stores the JWT in `~/.lenserfight/config.json`.

```bash
lenserfight auth login --email you@example.com --password secret
```

| Flag | Required | Description |
|------|----------|-------------|
| `--email` | Yes | Account email address |
| `--password` | Yes | Account password |

---

## `auth logout`

Clear all stored auth tokens from `~/.lenserfight/config.json`.

```bash
lenserfight auth logout
```

---

## `auth whoami`

Show the currently authenticated user.

```bash
lenserfight auth whoami
```

Outputs email, lenser handle, and token expiry.

---

## `auth refresh`

Force-refresh the stored access token using the saved refresh token.

```bash
lenserfight auth refresh
```

Useful when the token has expired and you want to stay logged in without re-entering credentials.

---

## `auth token`

Print the raw access token to stdout. Useful for piping into other tools or scripts.

```bash
lenserfight auth token
lenserfight auth token | pbcopy   # copy to clipboard (macOS)
```

---

## `auth register`

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
| `--display-name` | Yes | Public display name for your lenser profile |

---

## Related

- [Configuration](configuration.md) — where tokens are stored
- [Community Commands](community.md) — follow lensers after logging in
