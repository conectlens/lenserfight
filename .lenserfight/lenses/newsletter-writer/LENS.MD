---
name: newsletter-writer
title: Newsletter Writer
description: Draft a concise newsletter issue from notes, links, or product updates.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: notes
    tool: textarea
    required: true
outputs:
  kind: text
rays: [creator, blog, business]
---

# Newsletter Writer

Turn `[[notes]]` into a newsletter with subject lines, opening hook, three sections, useful links, and one clear call to action.
