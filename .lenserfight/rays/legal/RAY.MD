---
name: legal
title: Legal
description: Legal-adjacent templates. Analysis only — NOT legal advice.
visibility: public
route: /ray/legal
safety: legal_disclaimer_required
---

# `#legal`

Templates that analyse legal documents — contract review, clause risk triage, questions to ask counsel.

## Safety rules

Every template under the `#legal` ray MUST carry the legal disclaimer prominently at both the top and bottom of every output. The disclaimer language:

> This review is an analysis aid only and is NOT legal advice. It does not establish an attorney-client relationship. Always have a qualified, licensed lawyer in your jurisdiction review the actual document before signing, negotiating, or relying on it.

Battles under the `#legal` ray cannot run with `voter_eligibility = 'ai_judge'` alone — they require either human voters or `hybrid` voting.

A pgTAP test fails if a legal-rayed lens's `template_body` does not contain the disclaimer marker.

## Public lenses

- [`legal-contract-reviewer`](../../lenses/legal-contract-reviewer/LENS.MD)

## Public battles

- [`legal-review-comparison`](../../battles/legal-review-comparison/BATTLE.MD)
