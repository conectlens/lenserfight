---
name: finance-report-review
title: Finance Report Review Colens
description: Explain a finance report, review KPIs, and draft investor-facing notes. This is not financial advice.
author: '@lenserfight'
visibility: public
forkable: true
nodes:
  - id: explain
    lens: finance-report-explainer
  - id: kpis
    lens: kpi-reviewer
    inputs_from: explain
  - id: investor
    lens: investor-update-drafter
    inputs_from: kpis
  - id: analyst
    lenser: finance-analyst
    inputs_from: investor
outputs:
  kind: memo
rays: [finance, business, colens]
---

# Finance Report Review Colens

Use when finance data needs to become an operator-ready memo. This is not financial advice.
