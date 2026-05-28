---
name: legal-document-review
title: Legal Document Review Colens
description: Summarize a legal document, create a risk checklist, and prepare questions for counsel. This is not legal advice and must be reviewed by a qualified lawyer.
author: '@lenserfight'
visibility: public
forkable: true
nodes:
  - id: summary
    lens: contract-summary
  - id: risks
    lens: legal-risk-checklist
    inputs_from: summary
  - id: questions
    lens: questions-for-lawyer
    inputs_from: risks
  - id: triage
    lenser: legal-triage
    inputs_from: questions
outputs:
  kind: checklist
rays: [legal, colens, productivity]
---

# Legal Document Review Colens

This colens helps prepare for a lawyer conversation. It is not legal advice and must be reviewed by a qualified lawyer.
