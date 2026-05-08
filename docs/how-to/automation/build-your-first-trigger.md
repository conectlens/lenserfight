---
title: Build your first trigger
description: Walk through creating an end-to-end automation rule that posts to a Slack webhook every time one of your battles finalizes.
---

# Build your first trigger

This guide walks through wiring an end-to-end automation rule: **when a battle finalizes, post to Slack**.

You will use the [event bus](/explanation/automation/event-bus-architecture), the [trigger rule schema](/reference/automation/trigger-rule-schema), and the [`lf automation` CLI](/reference/cli/automation-rules).

## Prerequisites

- A self-hosted or cloud LenserFight instance running Phase U migrations or later.
- A Slack incoming webhook URL (or any HTTPS endpoint that accepts `POST application/json`).
- A signed-in `lf` CLI session — verify with `lf auth status`.

## Step 1 — Write the rule file

Create `slack-on-battle-finalized.json`:

```json
{
  "name": "Slack on battle finalized",
  "match_event_type": "battle.finalized",
  "match_filter": {},
  "action_kind": "webhook",
  "action_config": {
    "url": "https://hooks.slack.com/services/XXX/YYY/ZZZ",
    "headers": {
      "Content-Type": "application/json"
    }
  },
  "is_active": true
}
```

`match_filter: {}` matches every `battle.finalized` event you own. To narrow further — for example, only battles where you won — add a clause:

```json
"match_filter": {
  "/winner_contender_id": {
    "eq": "00000000-0000-0000-0000-000000000001"
  }
}
```

::: tip YAML support
The current Phase U build accepts JSON only. YAML rule files are tracked as a follow-up.
:::

## Step 2 — Dry-run the rule

Validate the rule against a synthetic event before persisting it:

```bash
lf automation test \
  --file slack-on-battle-finalized.json \
  --event '{"event_type":"battle.finalized","payload":{"winner_contender_id":"00000000-0000-0000-0000-000000000001"}}'
```

Expected output:

```
WOULD FIRE — rule "Slack on battle finalized" matches event type battle.finalized
```

If the filter does not match, the CLI prints `NO MATCH` and the failing clause.

## Step 3 — Create the rule

```bash
lf automation create --file slack-on-battle-finalized.json
```

Expected output:

```json
{
  "rule_id": "1234abcd-...",
  "name": "Slack on battle finalized"
}
```

Verify it landed:

```bash
lf automation list
```

## Step 4 — Trigger and observe

Finalize a test battle (`lf battle finalize <slug>` or any path that closes a battle), then:

```bash
lf automation history <rule-id> --limit 5
```

Within ~60 seconds you should see a row with `status=dispatched`. The webhook outbox handles delivery, retries, and signing — failures show up here as `status=failed` with the error.

## Troubleshooting

**`status=queued` and never advances.** The dispatcher cron may be paused. Check `SELECT * FROM cron.job WHERE jobname='automation-dispatcher';` is `active=true` and run `SELECT automation.fn_run_dispatcher(100);` manually to flush the queue.

**`status=failed` with `webhook_signing_secret_unset`.** Strict signing is on but no secret is configured. Run `lf config webhook-secret generate` (or set strict mode off via `lf config webhook-secret strict off`).

**`status=failed` with HTTP 4xx from your endpoint.** Inspect the outbox row directly: `SELECT last_error, attempt_count FROM audit.webhook_outbox WHERE id = '<outbox_id>';` The outbox retries with exponential backoff and dead-letters after the configured max attempts.

## Related

- [Event bus architecture](/explanation/automation/event-bus-architecture)
- [Trigger rule schema](/reference/automation/trigger-rule-schema)
- [`lf automation` CLI](/reference/cli/automation-rules)
