---
name: pr-description-writer
title: PR Description Writer
description: Draft a reviewer-ready pull request description from a diff summary and validation notes.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: changes
    tool: textarea
    required: true
  - label: validation
    tool: textarea
    required: false
outputs:
  kind: text
rays: [developer, github]
---

# PR Description Writer

Using `[[changes]]` and `[[validation]]`, write:

- Summary.
- Why the change exists.
- Implementation notes.
- Screenshots or artifacts needed.
- Validation performed.
- Risks and rollback notes.
