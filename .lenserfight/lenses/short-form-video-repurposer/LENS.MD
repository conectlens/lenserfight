---
name: short-form-video-repurposer
title: Short-Form Video Repurposer
description: Convert long-form content into short vertical video concepts with hooks and captions.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: source_content
    tool: textarea
    required: true
outputs:
  kind: list
rays: [creator, youtube, social, multimodal]
---

# Short-Form Video Repurposer

From `[[source_content]]`, produce five short-form ideas with hook, 30-second script, caption, visual beat, and target audience.
