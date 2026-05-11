---
name: social-post-generator
title: Social Post Generator
description: Convert an announcement or article into platform-specific social posts.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: source
    tool: textarea
    required: true
outputs:
  kind: text
rays: [creator, social, business]
---

# Social Post Generator

Create posts from `[[source]]` for LinkedIn, X, Mastodon, and a short internal Slack announcement.

Keep claims faithful to the source.
