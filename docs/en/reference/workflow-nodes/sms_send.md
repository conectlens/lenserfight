---
title: SMS Send
description: Sends an SMS message to a phone number.
---

# SMS Send

## Overview

The `sms_send` node sends an SMS message to a specified phone number using a configured messaging provider (e.g. Twilio). It accepts a recipient number and message body at runtime, making it suitable for battle result notifications, judge alerts, or workflow status updates. The node requires a provider credential to be configured; if delivery fails, execution routes to the `error` output with a structured error payload. Message body supports template interpolation from upstream node outputs.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `to` | string | Yes | Recipient phone number in E.164 format (e.g. +14155552671). Supports template expressions such as {{trigger.phone}}. |
| `body` | string | Yes | Text content of the SMS message. Supports template interpolation from upstream node outputs. Max 1600 characters (multi-segment SMS). |
| `from` | string | No | Sender phone number or alphanumeric sender ID in E.164 format. Overrides the default number configured on the credential. Must be a number owned by the connected provider account. |
| `credentialId` | string | Yes | ID of the stored SMS provider credential (e.g. a Twilio Account SID / Auth Token pair) used to authenticate the send request. |
| `provider` | enum | Yes | SMS provider to route through. Accepted values: twilio, vonage, sinch. |
| `stopOnError` | boolean | No | When true, a delivery failure halts the workflow. When false (default), failures route to the error output port and execution continues. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Trigger input that activates the node. May carry template variables (e.g. phone number, battle result data) referenced in the to or body config fields. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on successful delivery. Carries the provider message ID and delivery status (e.g. { messageId: 'SM...', status: 'queued' }). |
| `error` | object | Emitted when the send request fails (invalid number, provider error, credential failure). Carries { code, message, providerError }. |

## Example

```json
{
  "nodeType": "sms_send",
  "config": {
    "provider": "twilio",
    "credentialId": "cred_twilio_prod_01",
    "to": "{{trigger.phone}}",
    "body": "Your battle '{{battle.title}}' has ended. Final score: {{battle.score}}. View results at {{battle.url}}",
    "stopOnError": false
  }
}
```
