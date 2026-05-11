---
name: investor-update-drafter
title: Investor Update Drafter
description: Draft a crisp investor update with metrics, wins, asks, risks, and next milestones.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: update_notes
    tool: textarea
    required: true
outputs:
  kind: memo
rays: [startup, finance, business]
---

# Investor Update Drafter

Turn `[[update_notes]]` into an investor update.

Include: headline, KPI table, wins, misses, cash/runway note, asks, risks, and next milestones.

This is not financial advice.
