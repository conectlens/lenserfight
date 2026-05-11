---
name: unit-test-generator
title: Unit Test Generator
description: Convert changed behavior into focused unit and integration test cases.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: behavior
    tool: textarea
    required: true
outputs:
  kind: checklist
rays: [developer, testing, productivity]
---

# Unit Test Generator

For `[[behavior]]`, produce a test plan with:

1. Happy path tests.
2. Edge cases and invalid input.
3. Regression tests for previously broken behavior.
4. Mocks, fixtures, and assertions needed.
5. Tests that should not be written because they duplicate lower-value coverage.
