---
name: kpi-reviewer
title: KPI Reviewer
description: Review KPIs for trend, quality, causality, and operating decisions. This is not financial advice.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: kpis
    tool: textarea
    required: true
outputs:
  kind: table
rays: [finance, business, startup]
---

# KPI Reviewer

Review `[[kpis]]` and return a table: metric, movement, confidence, likely driver, action, owner.

End with: This is not financial advice.
