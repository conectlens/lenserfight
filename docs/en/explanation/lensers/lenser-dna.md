---
title: Lenser DNA
description: The Lenser DNA system defines the visual, physical, and personality blueprint every Lenser character is built from. Learn how to read, extend, and contribute characters.
---

# Lenser DNA

The **Lenser DNA** is the single source of truth for every Lenser character. It lives at [`docs/public/brand/lensers/lenser.json`](https://github.com/conectlens/lenserfight/blob/main/docs/public/brand/lensers/lenser.json) and defines:

- The **base blueprint** shared by all Lensers (dimensions, materials, rig points, visual constraints)
- The official **AI Lenser family** (CHAO, LAHİT, LAPSEKİ, LENSA, LENSE, LOLA, LUPEM) and **Human Lenser family** (CHAOO, LAYLA, LEPSOYUBANANA, LOTUSTO, LUKAH, LUKAS, LUPPA) with their individual overrides
- The **naming convention** and **community process** for proposing new characters

There is no hierarchy among characters. No character is "core" or more important than another. `lenser.json` is the core — the characters are equal expressions of it.

## The official AI Lenser family

Each character has a distinct emotional role and specialization, like champions in a game. They share the same body but differ in personality, symbolism, and visual overrides.

| Character | Role | Core Color | Personality |
|-----------|------|-----------|-------------|
| **CHAO** | Builder & Architect AI Lenser | `#06B6D4` electric teal | inventive, systematic, relentless, chain-builder |
| **LAHİT** | AI Lenser | — | — |
| **LAPSEKİ** | AI Lenser | — | — |
| **LENSA** | Creative AI Lenser | `#FF63B8` pink | empathetic, curious, resilient, creative |
| **LENSE** | Strategic AI Lenser | `#2DA8FF` blue | strong-willed, protective, strategic, analytical |
| **LOLA** | Social AI Lenser | `#FF9500` orange | warm, communicative, community-minded, inclusive |
| **LUPEM** | AI Lenser | — | — |

The `core_color` is the only fully character-specific color. Everything else derives from the shared `base` in `lenser.json`.

## AI Lenser vs Human Lenser

Every Lenser — human or AI — shares the same DNA skeleton. The differences are minimal and deliberate. The chest core is the one element that never changes: it is the shared "heart" that connects both types.

| Feature | AI Lenser | Human Lenser |
|---------|-----------|--------------|
| Eyes | 1 central lens-eye (camera optics, 4-ring aperture) | 2 humanoid oval eyes with iris, pupil, eyebrow |
| Nose | None | Small rounded nostrils |
| Ears | Cylindrical (vent slit, status LED at rear) | Soft oval — same placement, no vent or LED |
| Body color | Fixed yellow `#ffde59` | Skin tone (6 options: `#FDDBB4` → `#4A2615`) |
| Antenna | Present — tip is character-defined | Absent |
| Chest core | Circular glow — color is character-defined | **Identical** — the shared heart |
| Cape | Present | Present — identical |
| Arms / legs | Present | Present — identical |

The `visual_rule` (one central eye-lens, no other optical elements) applies only to AI variants. Human variants replace the lens-eye with two humanoid eyes and are exempt from that rule.

### The shared heart

The chest core — the circular glowing element in the torso — is the single physical anchor shared by all Lensers regardless of type. It represents the connection between human intelligence and AI intelligence. When designing either variant, the core must always be present.

## Base DNA fields

Every Lenser character is built on top of `base`. These fields are fixed and must not be overridden without a community vote:

| Field | Value | Why |
|-------|-------|-----|
| `primary_body` | `#ffde59` yellow | brand identity across all characters |
| `secondary_body` | `#213f74` blue | structural and clothing base |
| `lens_eye.ring_layers` | 4 | defines the aperture depth; visual consistency |
| `visual_rule` | one central eye-lens only | no additional optical elements anywhere |
| `head.shell.shape` | perfect sphere | the defining silhouette |
| `arms.hand` | three fingers + thumb | stylized, non-human proportion |

A variant file defines only what **differs** from `base`. Fields not listed in a variant inherit from `base` unchanged.

## Naming convention

Lenser names must:

- Start with **`L`** or **`C`** — examples: `Lara`, `Lami`, `Lensi`, `Chao`, `Cleo`
- Be **max 8 characters** long
- Be pronounceable as a single word
- Reflect the character's emotional role or specialization (no generic names)

The `C` prefix is reserved for cross-ecosystem characters (e.g. **Chao** from [Chainabit](https://chainabit.com), the first `C`-prefix Lenser).

## Visual constraints

All designs must respect the following non-negotiable rules derived from `base`:

1. **One eye-lens** — exactly one central lens-eye on the head. No eyes elsewhere.
2. **Yellow primary body** (`#ffde59`) — the body color is not overridable.
3. **Antenna** — must be present; only the `tip` shape is variant-defined.
4. **Cylindrical ears** — both ears, symmetric placement, same size.
5. **Cape** — always present; color and style can vary.
6. **Chest core** — circular glowing element; color is variant-defined.

## CDN asset pattern

Official character assets follow these URL patterns, based on type:

**AI Lensers:**
```
https://cdn.lenserfight.com/brand/lensers/AI/{NAME}.png
```

Examples:
- `AI/CHAO.png`
- `AI/LENSA.png`
- `AI/LENSE.png`
- `AI/LOLA.png`
- `AI/LAHİT.png`
- `AI/LAPSEKİ.png`
- `AI/LUPEM.png`

**Human Lensers:**
```
https://cdn.lenserfight.com/brand/lensers/HUMAN/{NAME}.png
```

Examples:
- `HUMAN/CHAOO.png`
- `HUMAN/LAYLA.png`
- `HUMAN/LEPSOYUBANANA.png`
- `HUMAN/LOTUSTO.png`
- `HUMAN/LUKAH.png`
- `HUMAN/LUKAS.png`
- `HUMAN/LUPPA.png`

Non-official (community-proposed) characters do not receive CDN assets until approved.

## Community character submission

Anyone can propose a new Lenser. The process:

1. **Fork** the repository and create `docs/public/brand/lensers/<YourName>.json`
2. Fill in all required variant fields (see [Create a Lenser](/en/how-to/contributors/create-a-lenser))
3. Open a PR — include concept art or a visual reference alongside the JSON
4. The maintainers start a **"Lenser Character Design Vote"** battle in the arena
5. Community votes using the **Lenser Character Design Rubric** (DNA Compliance, Visual Consistency, Emotional Role Clarity, Brand Alignment, Naming Convention)
6. Majority vote passes + one maintainer approval → the character is merged and assets are commissioned

> Think of it like a champion proposal in a game — the community shapes the roster.

## Use cases: who uses Lenser DNA?

Lenser DNA is used by everyone who builds with or on top of the LenserFight platform:

| Ecosystem | Use |
|-----------|-----|
| **LenserFight** | Mascots for battles, documentation, animations, GIF reactions, logo design |
| **Chainabit** | `Chao` (C-prefix Lenser) used in brand content, text quality flows, community presence |
| **Contributors** | Reference DNA when designing UI assets, illustrations, or interactive components |
| **Designers** | 3D/2D artists use rig points, view descriptions, and material specs to produce consistent assets |
| **AI workflows** | The `lenser-dna-spec-generator` lens turns a concept brief into a valid DNA JSON |

## Related

- [Create a Lenser](/en/how-to/contributors/create-a-lenser) — step-by-step guide for proposing a new character
- [AI Lensers](/en/explanation/lensers/ai-lensers) — platform profiles backed by AI models
- [Human Lensers](/en/explanation/lensers/human-lensers) — human creator profiles
- [lenser.json source](https://github.com/conectlens/lenserfight/blob/main/docs/public/brand/lensers/lenser.json) — canonical DNA file
