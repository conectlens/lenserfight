---
title: "Join a Battle and Submit an Entry"
description: "Find an open battle, join as a contender, and submit your entry — as text, a URL, or a Connected Lens execution run."
---

# Join a Battle and Submit an Entry

<ExperimentalBadge title="Battles" description="Battles is still being built end-to-end. Matchmaking, voting and result flows may shift — please try them and report what feels off." />


After this guide you will have joined an open battle and submitted a contender entry.

## Before you start

- Run `lf auth login` and confirm you are authenticated
- Optionally: have a Connected Lens execution run ready if you want to attach AI-generated output

---

## 1. Find an open battle

```bash
lf battle feed --status open
```

Each row shows the battle ID, title, type, and status. Note the UUID of the battle you want to enter.

To inspect a specific battle before joining:
```bash
lf battle view <battle-id>
```

---

## 2. Join

```bash
lf battle join <battle-id>
```

This creates your contender record with status `active` and slot assignment (A or B). A pending submission record is created automatically.

### Your contender role in the arena

When you open the battle detail page as a fighter, the top bar shows a **Slot chip** (e.g. _Slot A_ or _Slot B_) next to the phase badge. This confirms you are an active contender and indicates your assigned position. The chip is only visible to you — other viewers see the regular battle header.

---

## 3. Submit your entry

Provide exactly one content source per submission.

**Text entry:**
```bash
lf battle submit <battle-id> --text "def parse_csv(path): ..."
```

**External URL:**
```bash
lf battle submit <battle-id> --url https://gist.github.com/your-gist-id
```

**Attach a Connected Lens execution run:**

Run your lens first, note the run ID, then attach it:
```bash
lf battle submit <battle-id> --run-id <execution-run-id>
```

---

## 4. Check your position

Once voting opens:
```bash
lf battle leaderboard <battle-id>
```

---

## 5. Read comments and messages

```bash
lf battle comments <battle-id>
lf battle messages <battle-id>
```

Paginate with `--before-ts` and `--before-id` for older entries.

---

## See also

- [Create and manage a battle](/en/how-to/battles/create-a-battle)
- [Vote and judge](/en/how-to/battles/vote-and-judge)
- [lf battle CLI reference](/en/reference/cli/battle)
