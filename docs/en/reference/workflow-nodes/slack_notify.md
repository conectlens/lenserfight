---
title: Slack Notify
description: Sends a message to a Slack channel.
---

# Slack Notify

## Overview

The Slack Notify node sends a formatted message to a specified Slack channel using an incoming webhook or bot token credential. Use it to emit battle results, execution status updates, or workflow alerts to a Slack workspace. The node requires a pre-configured Slack credential (webhook URL or OAuth bot token) stored in the workflow's credential store. On delivery failure (invalid channel, revoked token, rate limit), execution routes to the error output rather than halting the workflow.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credential_id` | string | Yes | ID of the stored Slack credential (webhook URL or bot token) used to authenticate the request. |
| `channel` | string | Yes | Slack channel name or ID to post to (e.g. #battle-results or C0123456789). Ignored when the credential is a webhook URL, which encodes the channel. |
| `message` | string | Yes | Message text to send. Supports Slack mrkdwn formatting and template variable interpolation (e.g. {{battle.title}}). |
| `username` | string | No | Display name override for the bot. Defaults to the app name registered with the credential. |
| `icon_emoji` | string | No | Emoji to use as the bot avatar (e.g. :trophy:). Ignored when icon_url is also set. |
| `icon_url` | string | No | URL of an image to use as the bot avatar. Takes precedence over icon_emoji. |
| `unfurl_links` | boolean | No | Whether Slack should unfurl URLs in the message. Defaults to false. |
| `thread_ts` | string | No | Timestamp of a parent message to reply in-thread. Leave empty to post as a top-level message. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Trigger input that initiates the notification. The full execution context (including upstream node outputs) is available for template interpolation in the message field. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | Emits the original input context plus a slack_response object containing the message timestamp (ts) and channel ID on successful delivery. |
| `error` | error | Emits when the Slack API returns a non-OK response (e.g. channel_not_found, token_revoked, rate_limited). Carries the original input context plus an error object with code and message fields. |

## Example

```json
{
  "nodeType": "slack_notify",
  "config": {
    "credential_id": "cred_slack_battles_bot",
    "channel": "#battle-results",
    "message": ":trophy: *{{battle.title}}* has ended!\nWinner: *{{battle.winner_handle}}* with a score of {{battle.score}}.\n<{{battle.url}}|View results>",
    "icon_emoji": ":trophy:"
  }
}
```
