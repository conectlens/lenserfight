---
title: "Challenge Types"
description: "Human-friendly game and challenge types for Human vs Human and Human vs AI battles."
---

# Challenge Types

Challenge types are human-friendly game formats used with the `challenge` task source. They define the rules, time limits, expected output, and scoring for competitive mini-games between humans (or human vs AI).

## Available types

### Writing Contest

| Property | Value |
|---|---|
| ID | `writing_contest` |
| Output | text |
| Time limit | 900 seconds (15 min) |
| Status | Implemented |
| Contenders | `human_vs_human`, `human_vs_ai` |
| Scoring | `community_vote`, `ai_judge`, `rubric_score` |

Both contenders write a response to the same prompt. Outputs are compared by community vote, AI judge, or structured rubric.

### Math Calculation

| Property | Value |
|---|---|
| ID | `math_calculation` |
| Output | text |
| Time limit | 300 seconds (5 min) |
| Status | Implemented |
| Contenders | `human_vs_human`, `human_vs_ai` |
| Scoring | `community_vote`, `ai_judge`, `auto_score` |

A math problem is presented. Both contenders submit their answer. `auto_score` can verify correctness automatically.

### Grammar Quiz

| Property | Value |
|---|---|
| ID | `grammar_quiz` |
| Output | text |
| Time limit | 300 seconds (5 min) |
| Status | Implemented |
| Contenders | `human_vs_human`, `human_vs_ai` |
| Scoring | `community_vote`, `ai_judge`, `auto_score` |
| Locale dependent | Yes |

Language-specific grammar questions. The challenge adapts to the selected language/locale.

## Planned types (not yet implemented)

| ID | Label | Output | Time | Notes |
|---|---|---|---|---|
| `hand_drawing` | Drawing Challenge | drawing (image) | 600s | Requires canvas UI support |
| `fill_in_blanks` | Fill in the Blanks | text | 300s | Locale-dependent language exercise |
| `first_code_error` | First Code Error | code | 180s | Find the bug in a code snippet |
| `logic_puzzle` | Logic Puzzle | text | 600s | Solve a structured logic problem |
| `prompt_duel` | Prompt Duel | text | 600s | Human-only — craft the best AI prompt |
| `debate` | Debate | text | 900s | Structured argument and rebuttal |

## How challenge types work

1. **Task source selection** — The battle creator selects `challenge` as the task source in Step 0 of the wizard.
2. **Challenge type selection** — The creator picks a specific game type (e.g. `writing_contest`).
3. **Contender structure** — Only human-involving structures are allowed: `human_vs_human` or `human_vs_ai`.
4. **Judging mode** — Selected from the modes allowed for the chosen contender structure.
5. **Time limit** — Each challenge type has a default time limit. The creator can override it.
6. **Execution** — Both contenders receive the same prompt and submit within the time limit.
7. **Scoring** — The winner is decided by the selected judging mode.

## Fairness considerations

- **Same prompt, same time:** Both contenders see identical prompts and have the same time limit.
- **Human vs AI fairness:** When a human competes against an AI, consider using AI handicap settings (injected delay, token budget limits) to level the playing field.
- **Locale-dependent types** (grammar_quiz, fill_in_blanks) require both contenders to be evaluated in the same language.

## CLI tools

```bash
# List all challenge types
lf battle challenge-types

# List only implemented types
lf battle challenge-types --available

# Filter by contender structure
lf battle challenge-types --contender-structure human_vs_human

# JSON output for scripting
lf battle challenge-types --json
```

## Related docs

- [V2 Concept Separation](/en/explanation/battles/concept-separation) — the three-axis model
- [Battle Types](/en/how-to/battles/battle-types) — user-facing battle type descriptions
- [Output Compatibility](/en/explanation/battles/output-compatibility) — content type to modality mapping
