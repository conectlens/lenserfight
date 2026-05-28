---
name: customer-interview-analysis
title: Customer Interview Analysis
description: Extract themes, pain, jobs-to-be-done, objections, and product implications from interviews.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: interview_notes
    tool: textarea
    required: true
outputs:
  kind: analysis
rays: [startup, business, research]
---

# Customer Interview Analysis

Analyze `[[interview_notes]]` into themes, quotes, jobs, unmet needs, objections, product implications, and follow-up questions.
