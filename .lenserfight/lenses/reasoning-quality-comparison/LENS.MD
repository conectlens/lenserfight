---
name: reasoning-quality-comparison
title: Reasoning Quality Comparison
description: Compare model outputs for evidence use, assumptions, edge cases, and decision usefulness.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: outputs
    tool: textarea
    required: true
outputs:
  kind: scorecard
rays: [ai-comparison, openai, claude, gemini]
---

# Reasoning Quality Comparison

Compare `[[outputs]]` across: factual grounding, assumption handling, edge-case coverage, actionability, calibration, and concise reasoning.

Return a score table and a short winner rationale.
