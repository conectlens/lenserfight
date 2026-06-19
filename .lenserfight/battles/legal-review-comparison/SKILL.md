---
name: legal-review-comparison
description: Battle template comparing AI legal-review outputs on identical contract text. Analysis only — NOT legal advice.
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
