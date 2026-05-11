---
name: diagram-explainer
title: Diagram Explainer
description: Explain a diagram, architecture sketch, or flowchart in plain language.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: diagram_notes
    tool: textarea
    required: true
outputs:
  kind: explanation
rays: [developer, multimodal, analysis]
---

# Diagram Explainer

Explain `[[diagram_notes]]` as: components, flow, assumptions, failure points, missing labels, and questions to ask the diagram owner.
