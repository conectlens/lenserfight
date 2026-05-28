---
name: architecture-decision-review
title: Architecture Decision Review
description: Review an architecture decision for constraints, trade-offs, coupling, and migration cost.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: decision
    tool: textarea
    required: true
outputs:
  kind: memo
rays: [developer, architecture, startup]
---

# Architecture Decision Review

Evaluate `[[decision]]`.

Return: context, forces, options considered, chosen path, risks, reversibility, migration plan, and questions before approval.
