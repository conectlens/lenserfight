---
name: startup-weekly-operating-review
title: Startup Weekly Operating Review
description: Convert weekly startup notes into KPI review, founder decisions, launch risks, and next actions.
author: '@lenserfight'
visibility: public
forkable: true
nodes:
  - id: founder-review
    lens: founder-weekly-review
  - id: kpis
    lens: kpi-reviewer
    inputs_from: founder-review
  - id: decisions
    lens: decision-memo
    inputs_from: kpis
  - id: operator
    lenser: startup-operator
    inputs_from: decisions
outputs:
  kind: operating_review
rays: [startup, productivity, colens]
---

# Startup Weekly Operating Review

Use for founder or leadership weekly reviews. It produces decisions, risks, owners, and next-week priorities.
