---
title: "Create, Publish, and Manage a Battle"
description: "Step-by-step guide to creating a battle draft, opening it for entries, starting voting, and publishing results."
---

# Create, Publish, and Manage a Battle

After this guide you will have a published battle with results visible on the public feed.

## Before you start

- Run `lf auth login` and confirm you are authenticated
- Have a task prompt in mind (a question or challenge for contenders)
- Optionally: have a rubric UUID ready if you want automated scoring

---

## 1. Create a draft battle

```bash
lf battle create \
  --title "CSV Parser Challenge" \
  --slug "csv-parser-may-2026" \
  --task "Write a Python function that parses a CSV file and returns a list of dicts."
```

The battle starts in `draft` state. Note the UUID returned — you'll use it in every subsequent step.

**From a template:**
```bash
lf battle create-from-template <template-id> \
  --title "CSV Parser Challenge" \
  --slug "csv-parser-may-2026"
```

---

## 2. Open for entries

```bash
lf battle open <battle-id>
```

Status transitions from `draft` → `open`. Contenders can now join.

---

## 3. Invite specific participants (optional)

```bash
lf battle invite <battle-id> --email alice@example.com
lf battle invite <battle-id> --email bob@example.com
```

Invited participants receive an email with a join link. Anyone can also discover and join public battles via `lf battle feed --status open`.

---

## 4. Start voting

Once contenders have submitted their entries:

```bash
lf battle start-voting <battle-id> --closes-at 2026-05-20T18:00:00Z
```

Requires at least 2 contenders in `accepted` status. Status transitions to `voting`.

---

## 5. Close voting and finalize

When the voting deadline passes (or you want to close early):

```bash
lf battle close-voting <battle-id>   # voting → scoring
lf battle finalize <battle-id>       # scoring → closed, winner determined
```

---

## 6. Publish results

```bash
lf battle publish <battle-id>
```

Status transitions to `published`. The leaderboard is now publicly visible.

---

## Lifecycle management

| Goal | Command |
|---|---|
| Unpublish and revert to draft | `lf battle retract <id>` |
| Hide from feed (keep data) | `lf battle archive <id>` |
| Force-close without voting | `lf battle close <id>` |
| Delete a draft (irreversible) | `lf battle delete <id>` |

---

## Check battle status at any time

```bash
lf battle view <battle-id>
lf battle leaderboard <battle-id>
```

---

## See also

- [Join a battle and submit](/how-to/battles/join-and-submit)
- [Vote and judge](/how-to/battles/vote-and-judge)
- [lf battle CLI reference](/reference/cli/battle)
- [Battle concepts & lifecycle](/reference/battles/index)
