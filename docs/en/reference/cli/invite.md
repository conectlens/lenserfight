---
title: lf invite
description: Manage battle invites (QR, public links, private, stats) and community invites.
---

# lf invite

`lf invite` manages both **battle invites** and **community invites**.

```
lf invite <subcommand> [options]
```

---

## Battle invite subcommands

### `lf invite create`

Create a battle invite link.

```bash
lf invite create --battle <battle-id> --type public
lf invite create --battle <battle-id> --type qr
lf invite create --battle <battle-id> --type private --target @alice
lf invite create --battle <battle-id> --type link --json
```

| Flag | Default | Description |
|---|---|---|
| `--battle <id>` | required | Battle UUID |
| `--type <type>` | `public` | `public` · `private` · `link` · `qr` |
| `--target <handle\|email>` | — | Required for `--type private` |
| `--json` | false | Output invite URL and token as JSON |

Invite types:

| Type | Accessible by | Tracked |
|---|---|---|
| `public` | Anyone (unauthenticated) | click_count, referral_source |
| `private` | Specific handle or email | invite_target, accepted_at |
| `link` | Anyone with the URL | click_count |
| `qr` | QR code scan | qr_scan_count |

**Output:**
```
✔ Battle invite created.
URL:   https://lenserfight.com/b/my-battle?ref=abc123
Token: a1b2c3d4e5
Type:  public
```

Marks `invite_sent` in the developer journey on first use.

---

### `lf invite qr`

Render the battle invite QR code in the terminal.

```bash
lf invite qr --battle <battle-id>
```

Generates a new invite of type `qr` and renders it using block characters. If the terminal does not support the output, prints the URL as a fallback.

---

### `lf invite stats`

Show invite statistics for a battle.

```bash
lf invite stats --battle <battle-id>
lf invite stats --battle <battle-id> --json
```

**Output:**
```
Battle invite stats for a1b2c3d4-...
Link clicks:  14
QR scans:     3
Accepted:     2
Converted:    1
```

---

### `lf invite list`

List all invites for a battle.

```bash
lf invite list --battle <battle-id>
lf invite list --battle <battle-id> --json
```

---

## Community invite subcommands

### `lf invite send`

Send a community invite to a user.

```bash
lf invite send @alice
lf invite send alice@example.com --role moderator
lf invite send @alice --community my-community --message "Join us!"
```

| Flag | Default | Description |
|---|---|---|
| `<target>` | required | Handle or email (positional) |
| `--role <role>` | `member` | `member` · `moderator` · `admin` |
| `--community <slug>` | context | Override active community |
| `--message <text>` | — | Optional personal message |
| `--json` | false | Output as JSON |

---

### `lf invite status`

Check the status of a community invite by ID.

```bash
lf invite status <invite-id>
lf invite status <invite-id> --json
```

---

### `lf invite revoke`

Revoke a community invite by ID.

```bash
lf invite revoke <invite-id>
```

---

### `lf invite pending`

List pending community invites.

```bash
lf invite pending
lf invite pending --community my-community
lf invite pending --json
```

---

## Joining a battle via invite link

```bash
lf battle join https://lenserfight.com/b/my-battle?ref=abc123
```

The `ref` parameter is preserved through the auth flow and written to your referral source on account creation.

---

## New RPCs required (migration gate)

The battle invite subcommands depend on Supabase functions that are added in the upcoming `YYYYMMDD_battle_invites.sql` migration:

| RPC | Purpose |
|---|---|
| `fn_battle_invite_create` | Create invite, return URL + token |
| `fn_battle_invite_stats` | Return click/scan/accepted/converted counts |
| `fn_battle_invite_list` | List all invites for a battle |
| `fn_battle_invite_accept` | Mark an invite as accepted |

Until the migration is applied, these subcommands will return an error. Run `lf doctor --check journey` to verify RPC availability.

---

## Related

- [lf battle](/en/reference/cli/battle)
- [lf setup](/en/reference/cli/setup)
- [Developer Onboarding — Step 7](/en/tutorials/getting-started/developer-onboarding#step-7----invite-friends-with-qr--link)
- [Battle Reference](/en/reference/battles/index)

<!-- AUTO-GEN-START -->

# `lf invite`

Manage invites. Use `lf invite create --battle <id>` for battle invites or `lf invite send <target>` for community invites.

<!-- AUTO-GEN-END -->
