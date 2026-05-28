---
name: github-issue-triage
title: GitHub Issue Triage Colens
description: Classify issues, draft a response, and produce a maintainers' queue update.
author: '@lenserfight'
visibility: public
forkable: true
nodes:
  - id: classify
    lens: github-issue-triage
  - id: prioritize
    lens: task-prioritization
    inputs_from: classify
  - id: reviewer
    lenser: developer-reviewer
    inputs_from: prioritize
outputs:
  kind: table
rays: [developer, github, colens]
---

# GitHub Issue Triage Colens

Use this when a maintainer wants a deterministic issue queue: classify, prioritize, and draft the response a human can post.
