---
id: d10adea1-1eee-4eee-aeee-000000000ak1
title: Image Generation Demo
description: |
  Single-node workflow that takes a prompt and produces an image via
  fal-ai/flux/dev. Phase AK foundation demo — see examples/workflows/image-generation-demo/README.md.
visibility: public
phase: AK
inputs:
  - key: prompt
    label: Prompt
    type: string
    required: true
nodes:
  - id: img
    kind: model_call
    provider: fal-ai
    model_id: fal-ai/flux/dev
    output_modality: image
    inputs:
      prompt: "{{ inputs.prompt }}"
    outputs:
      - kind: image
        mime_type: image/png
edges: []
---

# Image Generation Demo

A minimal generative-media workflow used to verify the AK foundation is wired
end-to-end: provider → upload → media.objects → media-proxy → CLI download.

The single node calls `fal-ai/flux/dev` with the user's prompt and produces a
`media.objects` row in the `generated-media` bucket. Output is private by
default (Phase AK security invariant #1).
