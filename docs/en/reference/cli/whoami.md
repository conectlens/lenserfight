---
title: lf whoami
description: Show the currently authenticated user. Shorthand for lf auth whoami.
---

# `lf whoami`

Top-level shorthand for [`lf auth whoami`](./auth.md#auth-whoami).

```bash
lf whoami
```

Prints the signed-in account's email, ID, and role. Warns if no session is stored, or if the stored token is expired.

## Related

- [`lf auth whoami`](./auth.md#auth-whoami) — full authentication reference
- [`lf login`](./login.md) — sign in
- [`lf logout`](./logout.md) — clear the stored session
