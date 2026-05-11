---
name: terms-of-service-review
title: Terms Of Service Review
description: Review terms of service for practical user or business risks. This is not legal advice and must be reviewed by a qualified lawyer.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: terms_text
    tool: textarea
    required: true
outputs:
  kind: table
rays: [legal, business]
---

# Terms Of Service Review

Review `[[terms_text]]` for data use, cancellation, payment, liability, arbitration, account termination, and content ownership.

This is not legal advice and must be reviewed by a qualified lawyer.
