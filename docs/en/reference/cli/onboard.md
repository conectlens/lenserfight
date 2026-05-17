---
title: lf onboard
description: Friendly first-run flow — auth check, profile completeness, and public battle templates in one command.
---

# `lf onboard`

Friendly first-run flow designed for new users. Checks authentication, verifies profile completeness, and surfaces public battle templates so the first action is one command away.

```bash
lf onboard               # short first-run flow
lf onboard --json        # structured JSON output
lf onboard --full        # delegate to `lf setup` (long-form journey)
```

---

## What it does

1. **Auth check** — if not signed in, prints a prompt to run `lf auth login` and exits with code 1.
2. **Profile completeness** — fetches your profile via `fn_get_my_lenser_profile`. Warns if handle or display name is missing.
3. **Public templates** — fetches up to 3 public battle templates via `fn_list_public_battle_templates` (no auth required, no cost). Shows title, category, and the command to create a battle from each template.
4. **Next action** — suggests `lf battle new --from-template <slug>`.

---

## Options

| Flag | Type | Default | Description |
|---|---|---|---|
| `--full` | boolean | false | Run the full `lf setup` journey instead of the short flow |
| `--json` | boolean | false | Emit structured JSON output |

---

## Example output

### Success

```
ℹ LenserFight onboarding
✔ Signed in.
✔ Profile ready: @yourhandle (Your Name)

╭ Top public battle templates:
│ ℹ  • Quick Duel (competition)
│       A fast 1v1 battle format
│       run: lf battle new --from-template quick-duel
│ ℹ  • Creative Showdown (creative)
│       Show off your best work
│       run: lf battle new --from-template creative-showdown
╰

╭ Ready for your first battle?
│   → lf battle new --from-template <slug>
│
│ Need a full environment audit? Run: lf onboard --full
╰
```

### Not authenticated

```
⚠ You are not signed in.
ℹ Run: lf auth login
```

Exit code: `1`

### Profile incomplete

```
✔ Signed in.
⚠ Profile incomplete — set your handle and display name.
ℹ Run: lf profile update --handle <handle> --display-name "<your name>"
```

---

## JSON output

```json
{
  "status": "ok",
  "profile": { "handle": "yourhandle", "display_name": "Your Name" },
  "profileComplete": true,
  "templates": [
    { "title": "Quick Duel", "slug": "quick-duel", "category": "competition" }
  ]
}
```

When not authenticated:

```json
{
  "status": "unauthenticated",
  "error": "Not signed in. Run: lf auth login"
}
```

---

## `--full` mode

When `--full` is passed, `lf onboard` delegates entirely to [`lf setup`](setup.md). All setup flags apply.

```bash
lf onboard --full                 # same as lf setup
lf onboard --full --interactive   # same as lf setup --interactive
```

---

## Which one should I use?

| Audience | Recommended |
|----------|-------------|
| New user, first 5 minutes | `lf onboard` |
| Re-running setup after `lf reset` | `lf setup` |
| Scripts and docs in CI | `lf setup` (canonical) |
| Quick health check | `lf doctor` |

---

## Related

- [`lf setup`](setup.md) — full onboarding wizard with journey/env modes
- [`lf doctor`](doctor.md) — environment health checks
- [`lf status`](status.md) — auth, config, and journey progress
- [Developer Onboarding tutorial](/en/tutorials/getting-started/developer-onboarding)

<!-- AUTO-GEN-START -->

# `lf onboard`

Friendly first-run flow: auth + profile check, then surface public battle templates so the first action is one command away. Pass --full to run the long `lf setup` journey.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--full` | boolean | no | Run the full lf setup journey instead of the short first-run flow |
| `--json` | boolean | no | Output JSON |

<!-- AUTO-GEN-END -->
