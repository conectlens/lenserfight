---
name: startup-planning
title: Startup Planning Colens
description: From idea to 12-week roadmap with deep-thinking checks and a weekly operating cadence.
author: '@lenserfight'
visibility: public
forkable: true
nodes:
  - id: clarify
    lens: deep-thinking-decision-helper
    note: Stress-test the idea framing before committing to a roadmap.
  - id: roadmap
    lens: startup-roadmap-designer
    inputs_from: clarify
  - id: operating_cadence
    lens: weekly-operating-review
    inputs_from: roadmap
    note: First-week operating review draft so the cadence is concrete from day one.
outputs:
  kind: table
rays: [startup, planning, deep-thinking, colens, template]
seed_uuid: 48000000-0002-0007-0001-000000000001
---

# Startup Planning Colens

Three-node colens that turns an idea into a roadmap and seeds the operating cadence that will run against it.

## Why three nodes, not more

A planning colens with seven nodes drifts into ceremony. Three nodes ensures every step has to earn its place. The first node is intentionally a deep-thinking check, because most "planning" failures are framing failures.

## Forkability

Fork when:

- The team uses an OKR cadence and wants `weekly-operating-review` replaced with a quarterly variant.
- The idea is product-led-growth, not B2B, and you want the roadmap node to use a different time horizon.
