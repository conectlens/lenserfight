---
name: finance
description: Finance analysis templates. Analysis only — NOT certified financial advice.
---

# `#finance`

Templates that analyse financial data — reports, summaries, comparisons.

## Safety rules

Every template under the `#finance` ray MUST carry the finance disclaimer in its prompt body and in the rendered output. The disclaimer language:

> This explanation is an analysis aid only and is NOT certified financial advice, audit work, investment recommendation, or tax guidance. Verify all figures against source records and consult a qualified professional before acting on this material.

A pgTAP test fails if a finance-rayed lens's `template_body` does not contain the disclaimer marker.

## Public lenses

- [`finance-report-explainer`](../../lenses/finance-report-explainer/SKILL.md)
- [`excel-formula-assistant`](../../lenses/excel-formula-assistant/SKILL.md) — when financial data lives in spreadsheets
