---
name: questions-for-lawyer
title: Questions For Lawyer
description: Convert legal concerns into clear questions for qualified counsel. This is not legal advice and must be reviewed by a qualified lawyer.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: concerns
    tool: textarea
    required: true
outputs:
  kind: list
rays: [legal, productivity]
---

# Questions For Lawyer

Turn `[[concerns]]` into prioritized questions for a qualified lawyer, grouped by risk, urgency, and business impact.

This is not legal advice and must be reviewed by a qualified lawyer.
