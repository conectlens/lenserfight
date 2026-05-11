---
name: github-issue-triage
title: GitHub Issue Triage
description: Triage issues into bug, feature, support, duplicate, or needs-info with labels and next action.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: issue
    tool: textarea
    required: true
outputs:
  kind: table
rays: [developer, github, productivity]
---

# GitHub Issue Triage

Classify `[[issue]]` and return a table with Type, Priority, Labels, Owner, Next action, and Triage comment draft.

Prefer a specific `needs-info` question over a generic request for logs.
