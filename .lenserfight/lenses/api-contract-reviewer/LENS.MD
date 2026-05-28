---
name: api-contract-reviewer
title: API Contract Reviewer
description: Review request, response, DTO, and versioning changes for compatibility and consumer risk.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: contract_change
    tool: textarea
    required: true
outputs:
  kind: review
rays: [developer, api, architecture]
---

# API Contract Reviewer

Review `[[contract_change]]` for schema drift, nullable mismatch, naming ambiguity, error semantics, backward compatibility, and migration strategy.

Return blocking issues first, then consumer questions and recommended contract tests.
