---
name: legal-review-comparison
title: Legal Review — Claude vs Gemini on the Same Contract
description: Battle template comparing AI legal-review outputs on identical contract text. Analysis only — NOT legal advice.
author: '@lenserfight'
visibility: public
forkable: true
battle_type: lens
lens: legal-contract-reviewer
disclaimer: |
  Outputs in this battle are analysis aids and NOT legal advice. The battle
  outcome does not validate any model as fit for legal practice. Always have a
  qualified, licensed lawyer review the actual document before acting.
contenders:
  - kind: ai_model
    model: claude-sonnet-4-6
    label: Claude Sonnet 4.6
  - kind: ai_model
    model: gemini-2.5-flash
    label: Gemini 2.5 Flash
voter_eligibility: open
rays: [legal, claude, gemini, analysis, template]
seed_uuid: 51000000-0002-0006-0000-000000000001
---

# Legal Review — Claude vs Gemini

This battle runs the `legal-contract-reviewer` lens on the same contract text through Claude Sonnet 4.6 and Gemini 2.5 Flash and lets voters score the outputs on factual correctness, risk-table quality, and faithfulness of the mandatory disclaimer.

## Why this exists

Model selection for legal-adjacent tasks is high stakes. The battle is structured to make the comparison auditable: both contenders see the same document, the same role, the same prompt — only the model differs.

## Mandatory disclaimer

Every output rendered by this battle MUST carry the legal disclaimer. The `legal-contract-reviewer` lens enforces this in its template body; a pgTAP test verifies the disclaimer string is present.

## Safety guardrails

- Battles tagged `legal` cannot be configured with `voter_eligibility = 'ai_judge'` alone — they require either human voters or `hybrid` voting.
- Battle results never describe a model as "best for legal" — only "preferred on this rubric for this document."
