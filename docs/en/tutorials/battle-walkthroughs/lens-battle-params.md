---
title: "Lens Battle Shared Parameters"
description: "How to use shared [[parameter]] values in Lens Battles to ensure every contender receives the same inputs for a fair comparison."
---

# Lens Battle Shared Parameters

<ExperimentalBadge title="Battles" description="Battles is still being built end-to-end. Matchmaking, voting and result flows may shift — please try them and report what feels off." />

When a lens contains `[[parameter]]` placeholders, the battle creator fills them once in the new **Inputs** wizard step. Every contender receives the same resolved prompt — no one gets an advantage from different input values.

---

## What are shared parameters?

A lens prompt can include placeholders written as `[[parameter_name]]`. For example:

```
Write a [[tone]] blog post about [[topic]] for a [[audience]] audience.
```

This lens has three parameters: `topic`, `tone`, and `audience`. When you use this lens in a battle, the wizard asks you to fill each one before the battle is created. The values you enter are locked in — both contenders see the same fully-resolved prompt.

---

## Why shared parameters matter

Without shared parameters, you would need to hard-code every detail into the lens prompt. Parameters let you reuse a single lens template across many battles while guaranteeing fairness:

- **Same inputs for all contenders.** The `[[topic]]` you enter applies equally to every side.
- **Reusable lens templates.** One lens handles many battles — just change the parameter values each time.
- **Transparent judging.** Voters see the resolved prompt and know both contenders worked from identical instructions.

---

## The Inputs wizard step

The Inputs step appears between Source and Basics in the Lens Battle creation wizard. It is only shown when the selected lens contains at least one `[[parameter]]` placeholder.

### Wizard flow

1. **Format** — select Lens Battle.
2. **Source** — pick the lens you want to use.
3. **Inputs** — fill in the shared parameter values. Each `[[parameter]]` in the lens prompt becomes a labeled text field.
4. **Basics** — title and optional description.
5. Remaining steps (type, configuration, schedule, contenders) proceed as usual.

If the selected lens has no parameters, the Inputs step is skipped automatically.

---

## Example walkthrough

Suppose you have a lens called **Blog Draft Challenge** with this prompt:

```
Write a [[tone]] blog post about [[topic]] targeting a [[audience]] audience.
Keep it under 500 words.
```

### Step 1 — Format

Select **Lens Battle**.

### Step 2 — Source

Choose **Blog Draft Challenge** from your lens list.

### Step 3 — Inputs

The wizard shows three fields:

| Parameter | Your value |
|---|---|
| `topic` | renewable energy storage |
| `tone` | persuasive |
| `audience` | technical decision-makers |

### Step 4 — Basics

Title the battle: *"Persuasive Energy Storage Draft — GPT-4o vs Claude Sonnet"*

### Result

Both contenders receive the fully resolved prompt:

```
Write a persuasive blog post about renewable energy storage targeting a
technical decision-makers audience. Keep it under 500 words.
```

No contender sees the raw `[[parameter]]` template. Voters can verify the resolved prompt on the battle page.

---

## Tips

- **Use descriptive parameter names.** `[[audience]]` is clearer than `[[p1]]`.
- **Keep parameter count small.** Three to five parameters is usually enough. More than that may signal the lens is trying to do too much.
- **Test your lens first.** Run a quick generation in the Lenses section to make sure the prompt reads well with realistic parameter values before using it in a battle.

---

## See also

- [Lens Battle — Format Guide](/en/tutorials/battle-walkthroughs/lens-battle)
- [Create a Lens](/en/tutorials/walkthroughs/create-a-lens)
- [Output Compatibility](/en/explanation/battles/output-compatibility) — what happens when content types and models don't align
