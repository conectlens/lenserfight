---
title: BYOK Usage Log
description: Last 50 model calls made with a single BYOK key, with provider, model, token totals, and cost estimate.
---

# BYOK Usage Log

The **Key Usage Log** is the read-only audit feed for one BYOK key. It refreshes every minute and shows the most recent 50 calls.

## Columns

| Column | Source |
|---|---|
| Timestamp | gateway-side ingest time |
| Provider | provider id |
| Model | model id used |
| Prompt tokens | provider response |
| Completion tokens | provider response |
| Cost estimate | gateway-side multiplier × provider pricing |

## When to use it

- **Verifying a key works** after rotation — recent rows should appear.
- **Spotting runaway loops** — clusters of identical model calls within seconds.
- **Cost reconciliation** — sum the cost column for the current period and compare against your provider invoice.


## Code-backed workflow

Source of truth: ByokUsageLog.tsx. The implementation calls agentWorkspaceService.listByokUsage(keyId, 50) and refreshes on the query interval used by the section.

1. Open the log from a BYOK key context so the page has a key id.
2. Read provider, model, token totals, estimated cost, and timestamp together.
3. Treat the table as recent evidence, not a full billing export. It intentionally loads the last 50 records.

Verification: if a new model call does not appear here, check [Providers](./providers), [Runs](./runs), and [Logs](./logs) before assuming usage accounting failed.

## Related

- [BYOK Section](./byok)
- [Cost Section](./cost)
