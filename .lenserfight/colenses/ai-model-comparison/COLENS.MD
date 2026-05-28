---
name: ai-model-comparison
title: AI Model Comparison Colens
description: Compare model outputs using output comparison, reasoning quality, and a judge lenser.
author: '@lenserfight'
visibility: public
forkable: true
nodes:
  - id: compare
    lens: ai-output-comparator
  - id: reasoning
    lens: reasoning-quality-comparison
    inputs_from: compare
  - id: judge
    lenser: evaluation-judge
    inputs_from: reasoning
outputs:
  kind: scorecard
rays: [ai-comparison, openai, claude, gemini, colens]
---

# AI Model Comparison Colens

Use when multiple model outputs need a transparent rubric and repeatable judgment.
