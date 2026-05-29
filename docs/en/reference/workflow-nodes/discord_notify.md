---
title: Discord Notify
description: Sends a message to a Discord channel via webhook.
---

# Discord Notify

## Overview

The Discord Notify node sends a message to a Discord channel using an incoming webhook URL. Use it to broadcast battle results, execution status updates, or workflow alerts to a Discord server. The node requires a valid webhook URL configured in the node or referenced from a credential; if the webhook call fails, execution is routed to the error output so downstream error-handling nodes can respond. Message content supports static text or dynamic interpolation from upstream node outputs.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `webhookUrl` | string | Yes | The Discord incoming webhook URL (e.g. https://discord.com/api/webhooks/{id}/{token}). Obtain from Discord Server Settings → Integrations → Webhooks. |
| `content` | string | Yes | The message text to send. Supports template variables from upstream outputs (e.g. 'Battle {{battleId}} finished — winner: {{winner}}'). |
| `username` | string | No | Override the display name of the webhook bot for this message. Defaults to the name set on the webhook in Discord. |
| `avatarUrl` | string | No | URL of an image to use as the bot avatar for this message. Overrides the webhook's default avatar. |
| `embedTitle` | string | No | If set, wraps the message in a Discord embed with this string as the embed title. |
| `embedColor` | number | No | Integer color value for the embed sidebar (e.g. 5814783 for #58B9FF). Only applied when embedTitle is set. |
| `failOnError` | boolean | No | When true, routes execution to the error output if Discord returns a non-2xx status. Defaults to true. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Triggers the node and provides the execution context. Template variables in content and embedTitle are resolved from this payload. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | Passes the incoming payload through unchanged after a successful Discord delivery. Use to chain downstream nodes. |
| `error` | object | Receives execution when the webhook call fails. Contains statusCode, message, and the original payload for retry or fallback handling. |

## Example

```json
{
  "nodeType": "discord_notify",
  "config": {
    "webhookUrl": "https://discord.com/api/webhooks/123456789012345678/abc-xyz-token",
    "content": "Battle **{{battleId}}** has ended. Winner: **{{winner}}** with score {{score}}.",
    "username": "LenserFight Bot",
    "embedColor": 5814783
  }
}
```
