---
name: reasoning-quality-shootout
title: Reasoning Quality Shootout
description: Compares model answers with an explicit reasoning-quality scorecard.
author: '@lenserfight'
visibility: public
forkable: true
battle_type: lens
participants:
  - type: lens
    ref: reasoning-quality-comparison
contenders:
  - kind: ai_model
    model: claude-sonnet-4-6
    label: Claude Sonnet 4.6
  - kind: ai_model
    model: gpt-5
    label: GPT-5
  - kind: ai_model
    model: gemini-2.5-flash
    label: Gemini 2.5 Flash
rubric: reasoning-quality-rubric
rays: [ai-comparison, claude, openai, gemini]
---

# Reasoning Quality Shootout

Use this battle when a team wants to compare reasoning quality rather than style.

## Evaluation

Judge evidence use, assumptions, edge cases, calibration, and decision usefulness.
