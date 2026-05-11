---
name: screenshot-review
title: Screenshot Review
description: Review a screenshot for UX clarity, accessibility risk, layout problems, and copy issues.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: screenshot_notes
    tool: textarea
    required: true
outputs:
  kind: review
rays: [developer, creator, multimodal]
---

# Screenshot Review

Using `[[screenshot_notes]]`, return findings for hierarchy, layout, copy, accessibility, empty/loading/error states, and next design change.
