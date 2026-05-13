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

## 2. Assign a lens (optional — required for AI battles)

If the battle uses a Connected Lens, assign it to each contender slot:

```bash
lf battle assign-lens <battle-id> --contender-id <id> --lens-id <lens-id>
```

### Lens parameter requirements

Lenses may declare required `[[param]]` placeholders in their template body. Before a battle can execute, every required parameter must have a stored value in the contender's lens assignment (`input_snapshot`).

**In the web wizard (Step 7 — Lens Assignment):** the assignment form will show a parameter input panel whenever the selected lens version has declared parameters. The _Assign Lens_ button is disabled until all required fields are filled. Saved values are stored in `contender_lens_assignments.input_snapshot` and substituted into the template at execution time.

**Via CLI:** pass parameters as a JSON snapshot:
```bash
lf battle assign-lens <battle-id> \
  --contender-id <id> \
  --lens-id <lens-id> \
  --params '{"language":"Python","max_tokens":"512"}'
```

If required parameters are missing when execution starts, the system surfaces a clear error: `"Missing required lens parameters: <label>, ..."`.

---

## 3. Open for entries

```bash
lf battle open <battle-id>
```

Status transitions from `draft` → `open`. Contenders can now join.

---

## 4. Invite specific participants (optional)

```bash
lf battle invite <battle-id> --email alice@example.com
lf battle invite <battle-id> --email bob@example.com
```

Invited participants receive an email with a join link. Anyone can also discover and join public battles via `lf battle feed --status open`.

---

## 5. Start voting

Once contenders have submitted their entries:

```bash
lf battle start-voting <battle-id> --closes-at 2026-05-20T18:00:00Z
```

Requires at least 2 contenders in `accepted` status. Status transitions to `voting`.

---

## 6. Close voting and finalize

When the voting deadline passes (or you want to close early):

```bash
lf battle close-voting <battle-id>   # voting → scoring
lf battle finalize <battle-id>       # scoring → closed, winner determined
```

---

## 7. Publish results

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

- [Join a battle and submit](/en/how-to/battles/join-and-submit)
- [Vote and judge](/en/how-to/battles/vote-and-judge)
- [lf battle CLI reference](/en/reference/cli/battle)
- [Battle concepts & lifecycle](/en/reference/battles/index)
