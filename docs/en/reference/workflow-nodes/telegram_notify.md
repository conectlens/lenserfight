---
title: Telegram Notify
description: Sends a message to a Telegram chat or channel.
---

# Telegram Notify

## Overview

The Telegram Notify node sends a message to a specified Telegram chat, group, or channel using the Telegram Bot API. It requires a bot token and a target chat ID, both of which must be configured before use. The node emits an `error` output port when delivery fails (e.g. invalid token, bot not in chat, rate limit exceeded), allowing downstream error handling without halting the workflow. Message text supports plain text or Markdown/HTML parse modes for rich formatting.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `botToken` | string | Yes | Telegram Bot API token obtained from @BotFather. Treat as a secret — store in workflow credentials, not inline. |
| `chatId` | string | Yes | Target chat, group, or channel ID. Negative IDs indicate groups/supergroups; channel IDs use the @username or numeric format. |
| `parseMode` | enum | No | Message formatting mode. One of: MarkdownV2, HTML, or plain (default). Determines how the message text is rendered in the Telegram client. |
| `disableNotification` | boolean | No | When true, the message is delivered silently — recipients receive no sound or banner alert. Defaults to false. |
| `messageTemplate` | string | Yes | Message body to send. Supports template variables (e.g. &#123;&#123;battle.title&#125;&#125;, &#123;&#123;winner.handle&#125;&#125;) interpolated from the incoming execution context. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | ExecutionContext | Trigger signal carrying the current workflow execution context, including battle state and variable bindings used for message template interpolation. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | ExecutionContext | Passes the execution context downstream when the message is delivered successfully. |
| `error` | ErrorContext | Emitted when delivery fails. Carries an error code and message (e.g. 403 Forbidden, 429 Too Many Requests) for downstream error-handling nodes. |

## Example

<div v-pre>

```json
{
  "nodeType": "telegram_notify",
  "config": {
    "botToken": "{{secrets.TELEGRAM_BOT_TOKEN}}",
    "chatId": "-1001234567890",
    "parseMode": "MarkdownV2",
    "messageTemplate": "*Battle ended:* {{battle.title}}\nWinner: {{winner.handle}} with score {{winner.score}}"
  }
}
```

</div>

