---
name: validate-output
title: Validate Output
description: Validate an output against its goal, constraints, audience, and quality bar.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: output
    tool: textarea
    required: true
outputs:
  kind: review
rays: [productivity, analysis]
---

# Validate Output

Review `[[output]]` for goal fit, completeness, clarity, unsupported claims, safety issues, and concrete revision steps.
