---
title: lf login
description: Authenticate with your LenserFight account. Shorthand for lf auth login.
---

# `lf login`

Top-level shorthand for [`lf auth login`](./auth.md#auth-login).

```bash
lf login
lf login --email you@example.com --password secret
lf login --username @alice --password secret
lf login --no-browser
```

Omit credentials to use browser-based device login (recommended). The CLI opens your browser, prints an approval code, and saves the session to your user config after you approve.

## Flags

| Flag | Description |
|------|-------------|
| `--email`, `-e` | Account email (headless login) |
| `--username`, `-u` | Account handle, e.g. `alice` or `@alice` (headless login) |
| `--password`, `-p` | Account password (headless login) |
| `--no-browser` | Print the approval URL instead of opening the browser |

## Related

- [`lf auth login`](./auth.md#auth-login) — full authentication reference
- [`lf logout`](./logout.md) — clear stored session tokens
- [`lf auth whoami`](./auth.md) — verify the active session
