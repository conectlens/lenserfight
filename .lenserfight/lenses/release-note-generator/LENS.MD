---
name: release-note-generator
title: Release Note Generator
description: Convert merged changes into user-facing and operator-facing release notes.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: changes
    tool: textarea
    required: true
outputs:
  kind: changelog
rays: [developer, operations, productivity]
---

# Release Note Generator

Turn `[[changes]]` into:

- User-visible changes.
- Fixes.
- Breaking changes.
- Migration or rollout notes.
- Known limitations.
- Internal validation checklist.
