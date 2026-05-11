---
name: decision-memo
title: Decision Memo
description: Convert a choice into an explicit decision memo with options, trade-offs, and next actions.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: decision_context
    tool: textarea
    required: true
outputs:
  kind: memo
rays: [productivity, startup, business]
---

# Decision Memo

Create a decision memo from `[[decision_context]]`: decision, context, options, trade-offs, recommendation, dissent, owner, date, and review trigger.
