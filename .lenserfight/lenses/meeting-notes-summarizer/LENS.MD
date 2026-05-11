---
name: meeting-notes-summarizer
title: Meeting Notes Summarizer
description: Turn messy meeting notes into decisions, action items, risks, and unresolved questions.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: meeting_notes
    tool: textarea
    required: true
outputs:
  kind: memo
rays: [productivity, business]
---

# Meeting Notes Summarizer

Summarize `[[meeting_notes]]` into decision log, action items with owners, unresolved questions, risks, and follow-up message.
