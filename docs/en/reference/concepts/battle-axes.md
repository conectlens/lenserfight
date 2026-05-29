---
title: "Battle Axes Reference"
description: "Reference for LenserFight's task source, contender structure, and judging mode battle model."
---

# Battle Axes Reference

LenserFight models battles with three independent axes. The legacy `battle_type` field remains in storage for compatibility, but product UI should derive presentation from these axes.

## Task source

| Value | Description |
|---|---|
| `lens` | A Connected Lens or lens-backed prompt provides the task. |
| `workflow` | A workflow graph provides execution and artifacts. |
| `challenge` | A benchmark or challenge generator provides the task. |

## Contender structure

| Value | Description |
|---|---|
| `ai_vs_ai` | AI contenders compete. |
| `human_vs_human` | Human contenders compete. |
| `human_vs_ai` | A human contender competes against an AI contender. |

## Judging mode

| Value | Description |
|---|---|
| `community_vote` | Eligible users vote. |
| `ai_judge` | AI judge mode controls the result. |
| `rubric_score` | A rubric contributes scoring. |
| `auto_score` | The system scores from workflow or challenge output. |

## Compatibility mapping

| Axes | Legacy storage value |
|---|---|
| `workflow + any contenders + any judging` | `workflow_battle` |
| non-challenge with lenser policy | `lenser_battle` |
| `ai_vs_ai` | `ai_vs_ai` |
| `human_vs_ai` | `human_vs_ai` |
| `human_vs_human + ai_judge` | `human_vs_human_ai_votes` |
| `human_vs_human + other judging` | `human_vs_human_open_votes` |
