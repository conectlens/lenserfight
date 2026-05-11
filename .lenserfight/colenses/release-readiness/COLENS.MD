---
name: release-readiness
title: Release Readiness Colens
description: Review code risk, tests, release notes, and rollback before shipping.
author: '@lenserfight'
visibility: public
forkable: true
nodes:
  - id: review
    lens: code-reviewer
  - id: tests
    lens: unit-test-generator
    inputs_from: review
  - id: notes
    lens: release-note-generator
    inputs_from: review
  - id: operator-check
    lenser: developer-reviewer
    inputs_from: notes
outputs:
  kind: report
rays: [developer, operations, colens]
---

# Release Readiness Colens

Run before a production-facing release. It produces merge risks, missing validation, release notes, and rollback notes.
