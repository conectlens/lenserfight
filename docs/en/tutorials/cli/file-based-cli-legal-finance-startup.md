---
title: Legal, finance, and startup workflows
description: Build legal-adjacent, finance, and startup operating workflows with required disclaimers.
---

# Legal, finance, and startup workflows

## Build a legal document review workflow

Goal: summarize a document, create a risk checklist, and prepare questions for counsel.

Structure:

```text
.lenserfight/colenses/legal-document-review/COLENS.MD
```

Relationship: legal lenses feed the `legal-triage` agent.

Validation: `lf validate` requires a not-legal-advice disclaimer.

Common mistakes: drafting legal language, implying attorney-client advice.

Expected outcome: a lawyer-prep packet. This is not legal advice and must be reviewed by a qualified lawyer.

## Build a finance report explanation workflow

Goal: explain a finance report, review KPIs, and draft an investor update.

Structure:

```text
.lenserfight/colenses/finance-report-review/COLENS.MD
```

Relationship: finance lenses feed the `finance-analyst` agent.

Validation: `lf validate` requires a not-financial-advice disclaimer.

Common mistakes: making investment, tax, audit, or certified advice claims.

Expected outcome: an operator-ready memo. This is not financial advice.

## Build a startup weekly operating review workflow

Goal: convert weekly notes into decisions, KPI review, and next actions.

Structure:

```text
.lenserfight/colenses/startup-weekly-operating-review/COLENS.MD
```

Relationship: founder review, KPI review, and decision memo lenses feed the startup operator agent.

Validation: `lf validate`.

Common mistakes: no owner, no success metric, no decision date.

Expected outcome: a weekly operating memo with owners and risks.
