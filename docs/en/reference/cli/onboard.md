---
title: lf onboard
description: Guided onboarding for local setup, cloud setup, and the developer journey checklist. Friendly alias for `lf setup`.
---

# `lf onboard`

Guided onboarding command. It is a thin, renamed alias of [`lf setup`](setup.md) — the **runtime behavior is identical**, but the name reads better in introductory documentation, screencasts, and the first-run TUI.

```bash
lf onboard                  # same as `lf setup`
lf onboard --interactive    # same as `lf setup --interactive`
```

Internally, `onboard` re-exports `setup`'s implementation with a different `meta.name` and `meta.description`. Every flag, subcommand, prompt, and side effect is exactly the same.

---

## Which one should I use?

| Audience | Recommended |
|----------|-------------|
| New developer, first 5 minutes | `lf onboard` |
| Re-running setup after `lf reset` | `lf setup` |
| Scripts and docs in CI | `lf setup` (canonical) |

Pick one for a given guide and stick with it — mixing the two within the same tutorial only causes confusion.

---

## Source

`apps/cli/src/commands/onboard.ts` is two lines plus the meta override:

```ts
import setupCommand from './setup'

export default {
  ...setupCommand,
  meta: {
    name: 'onboard',
    description: 'Guided onboarding for local setup, cloud setup, and the developer journey checklist.',
  },
}
```

---

## Related

- [`lf setup`](setup.md) — the canonical command. **All flags, subcommands, and behavior are documented there.**
- [Developer Onboarding tutorial](/en/tutorials/getting-started/developer-onboarding)
- [`lf status`](status.md) — check journey progress
- [`lf doctor`](doctor.md) — environment health
