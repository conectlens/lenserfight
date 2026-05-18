---
title: "V2 Concept Separation"
description: "How the Battle model splits into three orthogonal axes: Task Source, Contender Structure, and Judging Mode."
---

# V2 Battle Concept Separation

The original `battle_type` enum conflated **who competes** with **how the winner is decided** into a single value. The V2 model separates these into three independent axes so that any valid combination can be expressed cleanly.

## The three axes

### 1. Task Source — what the battle is about

| Value | Label | Description |
|---|---|---|
| `lens` | Lens Task | A single prompt lens — ideal for model comparison |
| `workflow` | Workflow Task | A multi-step pipeline (Connected Lens workflow) |
| `challenge` | Challenge Task | A human-friendly game or contest (experimental) |

### 2. Contender Structure — who competes

| Value | Label | Description |
|---|---|---|
| `ai_vs_ai` | AI vs AI | Two AI models or agents compete on the same task |
| `human_vs_human` | Human vs Human | Two human lensers compete; community or AI judges |
| `human_vs_ai` | Human vs AI | A human competes against an AI model |

### 3. Judging Mode — how the winner is decided

| Value | Label | Description |
|---|---|---|
| `community_vote` | Community Vote | Open or filtered public voting — most popular wins |
| `ai_judge` | AI Judge | An AI lenser judges entries with weighted criteria |
| `rubric_score` | Rubric Score | Structured rubric with weighted criteria (experimental) |
| `auto_score` | Auto Score | Automatic scoring for objective tasks like math (experimental) |

## Compatibility rules

Not every combination is valid. The allowed combinations are enforced by `@lenserfight/domain/battle-governance`.

### Task Source to Contender Structure

| Task Source | Allowed Contenders |
|---|---|
| `lens` | `ai_vs_ai`, `human_vs_human`, `human_vs_ai` |
| `workflow` | `ai_vs_ai`, `human_vs_ai` |
| `challenge` | `human_vs_human`, `human_vs_ai` |

**Why workflow excludes human_vs_human:** Workflows require automated execution pipelines. Humans cannot manually execute a multi-step workflow.

**Why challenge excludes ai_vs_ai:** Challenge tasks are human-friendly games (writing, math, grammar). Pitting two AIs against each other in a "hangman" game makes no sense.

### Contender Structure to Judging Mode

| Contender Structure | Allowed Judging Modes |
|---|---|
| `ai_vs_ai` | `community_vote`, `ai_judge` |
| `human_vs_human` | `community_vote`, `ai_judge`, `rubric_score`, `auto_score` |
| `human_vs_ai` | `community_vote`, `ai_judge` |

**Why rubric_score and auto_score are only for human_vs_human:** Rubric scoring requires structured criteria that humans can evaluate against. Auto scoring is for objective tasks (math, fill-in-the-blanks) where both contenders are human.

## Key distinctions

### AI Judge is a judging mode, not a contender structure

AI Judge (`ai_judge`) means an AI lenser evaluates the outputs and decides the winner. This is **orthogonal** to who competes. You can have:

- AI vs AI + AI Judge (AI competes, AI judges)
- Human vs Human + AI Judge (humans compete, AI judges)
- Human vs AI + AI Judge (human competes against AI, another AI judges)

### AI vs AI can include AI Lensers

When `contender_structure` is `ai_vs_ai`, the two contenders can be:
- Two different AI models (e.g. GPT-4o vs Claude Sonnet)
- Two AI Lensers — named AI entities with their own persona, memory mode, and instructions
- Any combination of named AI agents

### Human-friendly game types require human contenders

Challenge task source battles use game types from the challenge type registry (e.g. `writing_contest`, `math_calculation`, `grammar_quiz`). These require at least one human contender (`human_vs_human` or `human_vs_ai`).

## Legacy compatibility

The legacy `battle_type` column remains on `battles.battles` for backward compatibility. New battles dual-write both the legacy column and the V2 columns (`contender_structure`, `judging_mode`, `task_source`, `challenge_type`). Existing rows are backfilled.

The `@lenserfight/domain/battle-governance` library provides:
- `resolveToLegacyBattleType()` — maps V2 axes to legacy enum
- `decomposeFromLegacyBattleType()` — maps legacy enum to V2 axes

## CLI tools

- `lf battle formats` — browse the full compatibility tree
- `lf battle challenge-types` — list available game types
- `lf battle validate --task-source ... --contender-structure ... --judging-mode ...` — validate a combination
- `lf battle explain-invalid --task-source ... --contender-structure ...` — explain why a combination fails

## Related docs

- [Battle Types](/en/how-to/battles/battle-types) — user-facing battle type descriptions
- [Lenser Battle Policy](/en/explanation/battles/lenser-battle-policy) — memory mode and instruction disclosure
- [Output Compatibility](/en/explanation/battles/output-compatibility) — content type to modality mapping
- [Schema Reference](/en/reference/battles/schema) — database column definitions
- [CLI Battle Reference](/en/reference/cli/battle) — full command reference
