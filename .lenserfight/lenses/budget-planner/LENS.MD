---
name: budget-planner
title: Budget Planner
description: Convert spending goals and constraints into a practical budget plan. This is not financial advice.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: budget_context
    tool: textarea
    required: true
outputs:
  kind: table
rays: [finance, business, productivity]
---

# Budget Planner

Using `[[budget_context]]`, create a budget table with category, current spend, target spend, rationale, risk, and next check date.

Include: This is not financial advice.
