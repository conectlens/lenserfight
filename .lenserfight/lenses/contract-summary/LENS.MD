---
name: contract-summary
title: Contract Summary
description: Summarize a contract into obligations, deadlines, unusual terms, and lawyer questions. This is not legal advice and must be reviewed by a qualified lawyer.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: contract_text
    tool: textarea
    required: true
outputs:
  kind: summary
rays: [legal, productivity]
---

# Contract Summary

Summarize `[[contract_text]]` into obligations, deadlines, termination terms, payment terms, unusual clauses, and questions for counsel.

This is not legal advice and must be reviewed by a qualified lawyer.
