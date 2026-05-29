---
title: Push Notification
description: Sends a push notification to a device or topic.
---

# Push Notification

## Overview

The Push Notification node sends a push notification to a device token or a named topic using a configured provider (e.g. FCM, APNs). Use it to alert users or systems of battle results, workflow completions, or other time-sensitive events. The node requires a valid credential binding to the push provider and will route failures to the error output rather than halting the workflow. Notification delivery is fire-and-forget; the output carries the provider's message ID for downstream tracking.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `provider` | enum (fcm, apns, expo) | Yes | Push provider to use for delivery. Determines which credential set is resolved at runtime. |
| `credentialId` | string | Yes | ID of the stored credential that authenticates against the selected provider. |
| `target` | string | Yes | Device registration token or topic name (prefix with '/topics/' for topic-based fanout). |
| `title` | string | Yes | Notification title shown in the system tray. Supports template variables (e.g. &#123;&#123;battle.title&#125;&#125;). |
| `body` | string | Yes | Notification body text. Supports template variables. |
| `data` | object | No | Arbitrary key-value payload delivered silently alongside the visible notification. |
| `sound` | string | No | Sound file name to play on delivery. Use 'default' for the system default sound. Omit to send silently. |
| `ttl` | number | No | Time-to-live in seconds. Messages undelivered after this duration are dropped by the provider. Defaults to 2419200 (28 days). |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Trigger signal and optional context passed from the upstream node. Template variables in title/body/data are resolved against this value. |
| `target` | string | Optional override for the device token or topic at runtime, taking precedence over the static target configured on the node. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Passes through the input value merged with a messageId field returned by the provider on successful delivery. |
| `error` | object | Emitted when the provider rejects the request or a network failure occurs. Carries code, message, and the original input for retry logic. |

## Example

<div v-pre>

```json
{
  "nodeType": "push_notification",
  "config": {
    "provider": "fcm",
    "credentialId": "cred_fcm_prod_01",
    "target": "/topics/battle-results",
    "title": "Battle finished: {{battle.title}}",
    "body": "{{winner.handle}} won by a score of {{score.final}}. See the full breakdown.",
    "data": {
      "battleId": "{{battle.id}}",
      "type": "battle_result"
    },
    "ttl": 86400
  }
}
```

</div>

