---
name: blog-vs-youtube-content
title: Blog vs YouTube — Same Topic, Different Medium
description: Creator-side battle comparing the blog outline and YouTube script for the same topic.
author: '@lenserfight'
visibility: public
forkable: true
battle_type: workflow
contenders:
  - kind: colens
    workflow: blog-writer
    label: Blog Writer
  - kind: lens
    lens: youtube-script-generator
    label: YouTube Script Generator
voter_eligibility: open
rays: [content, creator, blog, youtube, template]
seed_uuid: 51000000-0002-0005-0000-000000000001
---

# Blog vs YouTube — Same Topic, Different Medium

Creators repurpose content across mediums without thinking about whether the medium is actually right. This battle takes the same topic, runs the Blog Writer workflow and the YouTube Script Generator lens, and lets voters score them on which medium fits the message.

## Rubric

A custom rubric scores both outputs on:

- Stickiness — does the format hold attention to the end?
- Conversion fit — does the format serve the underlying business goal?
- Effort — can the creator realistically produce this format weekly?

## Forkability

The battle template clones cleanly into team-specific forks via `fn_battles_create_rematch`. Common forks change the rubric to weight one criterion higher.
