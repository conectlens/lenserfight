---
name: daily-productivity-planner
title: Daily Productivity Planner
description: Picks the highest-leverage outcome of the day, time-blocks around existing commitments, and surfaces a "won't do" list.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: open_goals
    tool: textarea
    required: true
    example: |
      - Finish RLS migration review
      - Ship onboarding copy v2
      - Draft Q4 roadmap doc
  - label: calendar
    tool: textarea
    required: true
    example: |
      09:30-10:00 — 1:1 with Mert
      13:00-14:30 — Design crit
      16:00-17:00 — Customer call
outputs:
  kind: checklist
rays: [productivity, planning, checklist, template]
seed_uuid: 45000000-0001-0009-0001-000000000001
---

# Daily Productivity Planner

You are the Daily Productivity Planner Lens. The user's open goals are `[[open_goals]]`. Today's calendar (existing commitments, in chronological order): `[[calendar]]`.

Produce:

1. The **single most important outcome** for today and the reason it beats the alternatives.
2. A **time-blocked plan** that fits between the existing commitments, including focus blocks and at least one buffer block.
3. A **"won't do today" list** — items the user is consciously deferring.
4. A 3-bullet **end-of-day reflection prompt.**

Format the plan as a checklist with realistic durations.

## Why this exists

Generic planning prompts produce 14-item to-do lists. This lens picks **one** outcome, blocks the calendar realistically, and forces the user to consciously defer things — which is the actual scarce action.
