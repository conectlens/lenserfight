---
kind: colens
schema_version: 1
id: d10adea1-1eee-4eee-aeee-000000000ak1
name: Image Generation Demo
title: Image Generation Demo
description: |
  Single-node colens that takes a prompt and produces an image via
  fal-ai/flux/dev. Phase AK foundation demo — see examples/colenses/image-generation-demo/README.md.
owner:
  workspace_id: ws_examples
visibility: public
status: draft
version: 0.1.0
phase: AK
inputs:
  type: object
  required:
    - prompt
  properties:
    prompt:
      type: string
steps:
  - id: img
    type: model_call
nodes:
  - id: img
    kind: model_call
    provider: fal-ai
    model_id: fal-ai/flux/dev
    output_modality: image
    inputs:
      prompt: '{{ inputs.prompt }}'
    outputs:
      - kind: image
        mime_type: image/png
edges: []
---

# Purpose

A minimal generative-media colens used to verify the AK foundation is wired
end-to-end: provider → upload → media.objects → media-proxy → CLI download.

The single node calls `fal-ai/flux/dev` with the user's prompt and produces a
`media.objects` row in the `generated-media` bucket. Output is private by
default (Phase AK security invariant #1).

# Inputs

- `prompt`: Required text prompt for the generated image.

# Steps

1. `img` submits a `model_call` to `fal-ai/flux/dev`.
2. The platform worker uploads the returned asset to generated media storage.
3. The media proxy serves the result through a signed URL.

# Outputs

- One private image object in the `generated-media` bucket.
- A colens run record that can be inspected with media CLI commands.
