---
name: task-prioritization
title: Task Prioritization
description: Rank tasks by impact, urgency, dependency, effort, and risk.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: task_list
    tool: textarea
    required: true
outputs:
  kind: table
rays: [productivity, business]
---

# Task Prioritization

Prioritize `[[task_list]]` into Now, Next, Later, Drop, with reason, owner, dependency, and first action.
