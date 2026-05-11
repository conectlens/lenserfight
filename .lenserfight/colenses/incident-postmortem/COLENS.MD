---
name: incident-postmortem
title: Incident Postmortem Colens
description: Build a blameless incident report and release follow-up tasks.
author: '@lenserfight'
visibility: public
forkable: true
nodes:
  - id: postmortem
    lens: incident-postmortem
  - id: release-notes
    lens: release-note-generator
    inputs_from: postmortem
  - id: review
    lenser: developer-reviewer
    inputs_from: release-notes
outputs:
  kind: report
rays: [developer, operations, colens]
---

# Incident Postmortem Colens

Use after an outage, regression, data issue, or failed launch. The colens turns notes into a postmortem and follow-up release notes.
