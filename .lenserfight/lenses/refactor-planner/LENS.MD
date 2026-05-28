---
name: refactor-planner
title: Refactor Planner
description: Turn a messy code area into a scoped refactor plan with risk controls.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: code_area
    tool: textarea
    required: true
outputs:
  kind: plan
rays: [developer, architecture, productivity]
---

# Refactor Planner

For `[[code_area]]`, produce:

1. Current pain and evidence.
2. In-scope and out-of-scope changes.
3. Safe sequence of commits.
4. Tests and observability needed.
5. Rollback plan.
