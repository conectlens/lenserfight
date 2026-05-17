---
title: Communication Nodes | Workflow Node Reference
description: Reference for all Communication nodes in LenserFight Workflow Studio — email, Slack, Discord, Telegram, push, and SMS.
---

# Communication Nodes

Communication nodes deliver messages, alerts, and reports to users and channels. Use them as the terminal step of automation pipelines or as alert gates in error-handling branches.

| Node | Type | Output |
|------|------|--------|
| [Email Send](#email-send) | `email_send` | `json` |
| [Slack Notify](#slack-notify) | `slack_notify` | `json` |
| [Discord Notify](#discord-notify) | `discord_notify` | `json` |
| [Telegram Notify](#telegram-notify) | `telegram_notify` | `json` |
| [Push Notification](#push-notification) | `push_notification` | `json` |
| [SMS Send](#sms-send) | `sms_send` | `json` |

---

## Email Send {#email-send}

**Type:** `email_send` · **Category:** Communication

Send an email with mapped subject, body, recipients, and optional attachments.

### Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `message` | `text` | No | Body text from upstream. |
| `payload` | `json` | No | Structured data for template rendering. |
| `attachments` | `file` | No | File attachments. |

### Outputs

| Name | Type | Shape |
|------|------|-------|
| `delivery` | `json` | `{ status: text, messageId: text, provider: text }` |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `to` | `string` | Recipient email or mapping (e.g. <code v-pre>{{workspace.owner.email}}</code>). |
| `subject` | `template` | Subject template. |
| `body` | `template` | Body template (markdown supported by most providers). |

### Optional Config

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `fromProfile` | `string` | `default` | Sender profile configured in workspace settings. |
| `attachments` | `json` | — | Attachment mappings: `[{ name, filePath }]`. |
| `provider` | `select` | `resend` | `resend` · `smtp` |
| `retry` | `json` | — | Retry policy: `{ attempts, backoffMs }`. |

### Example

```json
{
  "fromProfile": "founder-updates",
  "to": "{{workspace.owner.email}}",
  "subject": "LenserFight weekly AI digest - {{formatDate $.firedAt}}",
  "body": "{{$.summary}}",
  "attachments": [{ "name": "leaderboard.csv", "filePath": "$.leaderboardFile.url" }],
  "provider": "resend",
  "retry": { "attempts": 3, "backoffMs": 2000 }
}
```

**Scenario:** Send the weekly AI digest to founders.

**Expected output:** `{ "status": "sent", "messageId": "resend_abc123", "provider": "resend" }`

**Downstream:** → `logger` with `{ "message": "$.messageId" }`

### Valid Connections

→ `logger` (delivery audit)

→ Any upstream node that produces `text`, `json`, or `file`.

### Execution Notes

- Runs in `worker` / `server` environments.
- `fromProfile` must be configured in Workspace Settings → Email Profiles.
- Use <code v-pre>{{secrets.keyName}}</code> to reference API keys from secret storage.

### Troubleshooting

- **"Delivery failed"** — check the provider configuration and `fromProfile`.
- **"Missing attachment"** — ensure `filePath` resolves to a valid URL; use Object Storage Upload first.
- **"Template not rendering"** — verify that <code v-pre>{{variable}}</code> paths exist in the upstream payload.

### Related Nodes

[File Writer](./storage#file-writer) · [Object Storage Upload](./storage#object-storage-upload) · [Schedule Trigger](./trigger#schedule-trigger) · [Logger](./utility#logger)

---

## Slack Notify {#slack-notify}

**Type:** `slack_notify` · **Category:** Communication

Send a Slack message to a channel using the configured workspace Slack integration.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `channel` | `string` | Channel name (e.g. `#arena-alerts`) or user id. |
| `text` | `template` | Message template. Supports <code v-pre>{{variable}}</code> interpolation. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `provider` | `string` | `slack` |
| `retry` | `json` | `{ attempts: 3, backoffMs: 2000 }` |

### Example

```json
{
  "channel": "#arena-alerts",
  "text": "Battle {{$.battleId}} winner: {{$.winner}}",
  "provider": "slack"
}
```

**Expected output:** `{ "status": "sent", "ts": "1715850000.000100" }`

**Downstream:** → `logger`

### Related Nodes

[Discord Notify](#discord-notify) · [Email Send](#email-send) · [Error Catch](./logic#error-catch)

---

## Discord Notify {#discord-notify}

**Type:** `discord_notify` · **Category:** Communication

Send a Discord message through a webhook URL.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `webhookUrl` | `string` | Discord webhook URL or secret reference. |
| `content` | `template` | Message content. |

### Example

```json
{
  "webhookUrl": "{{secrets.discordArenaWebhook}}",
  "content": "New battle result: {{$.winner}}"
}
```

**Expected output:** `{ "status": "sent", "messageId": "discord_123" }`

---

## Telegram Notify {#telegram-notify}

**Type:** `telegram_notify` · **Category:** Communication

Send a Telegram chat message through the configured bot.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `chatId` | `string` | Chat id or secret reference. |
| `text` | `template` | Message text. |

### Example

```json
{
  "chatId": "{{secrets.telegramOpsChat}}",
  "text": "Workflow failed: {{$.error.message}}"
}
```

---

## Push Notification {#push-notification}

**Type:** `push_notification` · **Category:** Communication

Send an in-app or device push notification to a workspace audience.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `audience` | `string` | Target audience (e.g. `workspace_admins`). |
| `title` | `template` | Notification title. |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `body` | `template` | Notification body. |

### Example

```json
{
  "audience": "workspace_admins",
  "title": "Digest ready",
  "body": "{{$.summaryTitle}}"
}
```

**Expected output:** `{ "status": "queued", "notificationId": "push_123" }`

---

## SMS Send {#sms-send}

**Type:** `sms_send` · **Category:** Communication

Send an SMS alert through the configured provider (default: Twilio).

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `to` | `string` | Recipient phone number or mapping. |
| `body` | `template` | SMS body. |

### Example

```json
{
  "to": "{{workspace.owner.phone}}",
  "body": "Critical workflow failed: {{$.workflowName}}"
}
```

**Expected output:** `{ "status": "sent", "messageId": "sms_123" }`

---

**See also:** [Node Catalog Index](./) · [Integration Nodes](./integration) · [Storage Nodes](./storage) · [Workflow Studio](/en/how-to/agents/workspace/workflows)
