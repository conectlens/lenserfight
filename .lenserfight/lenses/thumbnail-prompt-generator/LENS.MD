---
name: thumbnail-prompt-generator
title: Thumbnail Prompt Generator
description: Generate image prompts and layout notes for clear, clickable video thumbnails.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: video_topic
    tool: textarea
    required: true
outputs:
  kind: image_prompt
rays: [creator, youtube, multimodal]
---

# Thumbnail Prompt Generator

For `[[video_topic]]`, create three thumbnail concepts with composition, focal object, emotion, text overlay, color contrast, and image-generation prompt.
