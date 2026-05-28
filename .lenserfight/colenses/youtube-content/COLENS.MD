---
name: youtube-content
title: YouTube Content Colens
description: Plan a YouTube video from topic to script, storyboard, thumbnail, and short-form repurposing.
author: '@lenserfight'
visibility: public
forkable: true
nodes:
  - id: script
    lens: youtube-script-generator
  - id: storyboard
    lens: video-storyboard-planner
    inputs_from: script
  - id: thumbnail
    lens: thumbnail-prompt-generator
    inputs_from: script
  - id: shorts
    lens: short-form-video-repurposer
    inputs_from: script
  - id: producer
    lenser: content-producer
    inputs_from: storyboard
outputs:
  kind: content_kit
rays: [creator, youtube, multimodal, colens]
---

# YouTube Content Colens

Use for creator production: it turns a topic into a full script, visual plan, thumbnail prompts, and short-form clips.
