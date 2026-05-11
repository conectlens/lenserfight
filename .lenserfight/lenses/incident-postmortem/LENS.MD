---
name: incident-postmortem
title: Incident Postmortem
description: Produce a blameless incident review with timeline, impact, root causes, and action items.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: incident_notes
    tool: textarea
    required: true
outputs:
  kind: report
rays: [developer, operations, business]
---

# Incident Postmortem

Using `[[incident_notes]]`, write a blameless postmortem with summary, customer impact, timeline, contributing factors, detection gaps, action items, owners, and due dates.
