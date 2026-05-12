---
title: Webhook Integrations
description: Set up webhooks to trigger workflows, receive events, and integrate LenserFight with external services.
head:
  - - meta
    - name: og:title
      content: Webhook Integrations — LenserFight
  - - meta
    - name: og:description
      content: Configure webhooks for workflow triggers, event notifications, and external service integration.
---

# Webhook Integrations

Webhooks allow external services to trigger LenserFight workflows and receive notifications about platform events.

## Setup

### Incoming webhooks (trigger workflows)

1. Navigate to **Workflow → Settings → Triggers**
2. Select **Webhook**
3. Copy the generated URL:
   ```
   https://api.lenserfight.com/v1/webhooks/<webhook-id>
   ```
4. Configure root input mapping

### Triggering a workflow

```bash
curl -X POST "https://api.lenserfight.com/v1/webhooks/<webhook-id>" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: <your-secret>" \
  -d '{
    "params": {
      "document": "Content to process",
      "format": "markdown"
    }
  }'
```

---

## Outgoing webhooks (receive events)

### Configuring event notifications

1. Navigate to **Settings → Webhooks → Outgoing**
2. Add a webhook URL
3. Select events to subscribe to:

| Event | Payload |
|-------|---------|
| `run.completed` | `{runId, workflowId, status, outputs, cost}` |
| `run.failed` | `{runId, workflowId, error}` |
| `battle.completed` | `{battleId, winner, scores}` |
| `lens.published` | `{lensId, version}` |
| `member.joined` | `{userId, workspaceId}` |

### Payload format

```json
{
  "event": "run.completed",
  "timestamp": "2026-05-09T12:00:00Z",
  "data": {
    "runId": "run-abc123",
    "workflowId": "wf-xyz789",
    "status": "completed",
    "outputs": { "summary": "..." },
    "cost": 2.5
  },
  "signature": "sha256=..."
}
```

---

## Security

### Verifying webhook signatures

Every outgoing webhook includes an `X-LenserFight-Signature` header:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `sha256=${expected}` === signature;
}
```

### Incoming webhook authentication

Incoming webhooks support:
- **Secret header** — `X-Webhook-Secret`
- **HMAC signature** — request body signed with shared secret
- **Bearer token** — standard authorization header

---

## Example integrations

### Slack notifications

Send workflow results to Slack:

```bash
# Outgoing webhook → Slack Incoming Webhook
Event: run.completed
URL: https://hooks.slack.com/services/T.../B.../...
```

### GitHub Actions trigger

Trigger a workflow on push:

```yaml
# .github/workflows/lenserfight.yml
on: push
jobs:
  run-lens:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST "${{ secrets.LENSERFIGHT_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d '{"params": {"code": "${{ github.sha }}"}}'
```

---

## Rate limits

| Direction | Limit |
|-----------|-------|
| Incoming webhooks | 60 requests/minute |
| Outgoing webhooks | Retry 3 times with exponential backoff |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `401 Unauthorized` | Check webhook secret |
| `422 Validation Error` | Verify payload matches expected params |
| Events not arriving | Check outgoing webhook URL accessibility |
| Duplicate events | Implement idempotency using event ID |

---

## Next steps

- [Building Workflows](/en/tutorials/cloud/workflows)
- [Agent Orchestration](/en/tutorials/advanced/agent-orchestration)
