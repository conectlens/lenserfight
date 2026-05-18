---
title: Create a Lenser
description: How to design, document, and submit a new Lenser character for community review and approval.
---

# Create a Lenser

This guide walks you through proposing a new Lenser character — from DNA spec to community vote. The process is modeled on champion proposals in competitive games: you design the character, the community votes, and approved characters become part of the official roster.

## Before you start

Read [Lenser DNA](/en/explanation/lensers/lenser-dna) to understand the base blueprint, visual constraints, and naming rules. Your proposal must comply with them or it will be rejected at the DNA validation step.

Key rules:
- Name starts with `L` or `C`, max 8 characters
- One central eye-lens — no exceptions
- Yellow primary body (`#ffde59`) — not overridable
- Every character needs a distinct emotional role

## Step 1 — Define the character concept

Answer these questions before touching JSON:

1. **What is this character's emotional role?** (e.g. analytical, playful, diplomatic, fierce)
2. **What problem or persona does it represent?** (e.g. debugging agent, community facilitator, data scientist)
3. **What makes it different from CHAO, LAHİT, LAPSEKİ, LENSA, LENSE, LOLA, and LUPEM?**
4. **What would its `core_color` be and why?** Colors carry meaning — pick one that reinforces the role.

## Step 2 — Create the variant JSON

Fork the repo and create `docs/public/brand/lensers/<YourName>.json`. Use this minimal template:

```json
{
  "variant_name": "Lara",
  "inherits_from": "lenser.json",
  "status": "proposed",
  "role": "Your Role Here",
  "proposed_by": "@your-github-handle",
  "body_modifications": {
    "height_cm": 60,
    "body_shape": "describe silhouette",
    "antenna_tip": "describe tip shape",
    "lens_frame": "standard or describe modification"
  },
  "clothing": {
    "cape": {
      "color_outer": "#HEX",
      "color_inner": "#HEX",
      "style": "describe cut and style"
    },
    "bodysuit": {
      "color": "#FFFFFF",
      "accent_lines": "#ffde59",
      "addition": "optional addition"
    }
  },
  "chest_core_override": { "core_color": "#HEX" },
  "facial_expression": {
    "style": "describe LED expression",
    "emotional_focus": "describe primary emotion"
  },
  "personality_shift": {
    "primary_traits": ["trait1", "trait2", "trait3"],
    "secondary_traits": ["trait4", "trait5"]
  },
  "symbolism_extension": {
    "key_element": "what it represents"
  },
  "views_delta": {
    "front": "describe what differs from base front view",
    "top": "describe what differs from base top view"
  }
}
```

Only list fields that **differ** from `base`. Anything not listed is inherited unchanged from `lenser.json`.

## Step 3 — Validate your DNA

Use the **Lenser DNA Validator** lens to check your file against all base rules:

```bash
lf lens run lenser-dna-validator --input ./docs/public/brand/lensers/YourName.json
```

The validator checks:
- Name starts with `L` or `C` and is ≤8 characters
- `visual_rule` not violated (no additional eyes defined)
- `core_color` does not conflict with `#ffde59`
- All required fields present

Fix any reported issues before opening a PR.

## Step 4 — Open a Pull Request

Create a PR with:
- `docs/public/brand/lensers/<YourName>.json` — the DNA variant file
- A concept sketch, reference image, or description of the visual look (can be a link or embedded image in the PR body)
- A short paragraph explaining the character's role and why it adds something new to the roster

PR title format: `feat(lenser-dna): propose <Name> — <role>`

## Step 5 — Community vote

A maintainer will start a **"Lenser Character Design Vote"** battle in the arena linked to your PR. The community votes your proposal against the rubric:

| Criterion | Weight | What reviewers check |
|-----------|--------|----------------------|
| DNA Compliance | 3.0 | Does the JSON follow base rules? Does the validator pass? |
| Visual Consistency | 2.5 | Does the design feel coherent with the existing roster? |
| Emotional Role Clarity | 2.5 | Is the character's role clearly distinct and meaningful? |
| Brand Alignment | 2.0 | Does it fit the LenserFight visual identity? |
| Naming Convention | 1.0 | Valid L/C prefix, ≤8 chars, pronounceable? |

You can watch the vote live in the arena or via `lf battle status <battle-id>`.

## Step 6 — Approval and assets

If the vote passes and a maintainer approves:

1. Your JSON is merged into `docs/public/brand/lensers/`
2. The character entry is added to `lenser.json` under `"characters"` with `"status": "official"`
3. An asset commission is opened for the character image
4. Once assets are delivered, they are published to `cdn.lenserfight.com/brand/lensers/AI/{NAME}.png` (AI Lensers) or `cdn.lenserfight.com/brand/lensers/HUMAN/{NAME}.png` (Human Lensers)
5. The character appears in the `AiLenserFamily` component on the next release

## Cross-ecosystem characters

If your character represents another product or ecosystem (like Chainabit's **Chao**), use the `C`-prefix and include in the PR body:
- The ecosystem it represents
- How it will be used (e.g. documentation mascot, workflow guide, brand ambassador)
- Any coordination with the ecosystem's maintainers

Cross-ecosystem characters go through the same vote process.

## Related

- [Lenser DNA](/en/explanation/lensers/lenser-dna) — base blueprint and visual constraints
- [lenser.json source](https://github.com/conectlens/lenserfight/blob/main/docs/public/brand/lensers/lenser.json) — the canonical registry
- [Contributing Guide](/en/how-to/contributors/contributing) — general contribution process
