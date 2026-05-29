---
title: Email Send
description: Sends an email to one or more recipients.
---

# Email Send

## Overview

The Email Send node sends an email to one or more recipients using a configured SMTP credential or provider integration. It accepts dynamic input data to populate recipient addresses, subject, and body via template interpolation. A successful send emits on the `output` port; delivery failures or authentication errors route to the `error` port so the workflow can handle retries or fallbacks. Credentials must be pre-configured in the workspace's integrations settings before this node can be used.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialId` | string | Yes | ID of the SMTP or email provider credential configured in workspace integrations (e.g. SendGrid, Postmark, or custom SMTP). |
| `to` | string | Yes | Recipient address(es). Supports a single address, a comma-separated list, or a template expression resolving to either (e.g. `&#123;&#123;input.user_email&#125;&#125;`). |
| `subject` | string | Yes | Email subject line. Supports template interpolation from upstream node output. |
| `body` | string | Yes | Email body content. Supports plain text or HTML. Supports template interpolation from upstream node output. |
| `bodyFormat` | enum | No | Content type of the body field. Accepted values: `text` (default) or `html`. |
| `cc` | string | No | Carbon-copy recipient address(es). Comma-separated or a template expression. |
| `replyTo` | string | No | Reply-To address to set on the outgoing message. Defaults to the sender address of the credential. |
| `fromName` | string | No | Display name for the sender. Overrides the default display name set on the credential. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Trigger input carrying workflow context and any dynamic values (e.g. user email, battle result, model output) available for template interpolation in subject, body, and recipient fields. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on successful delivery acceptance by the mail provider. Passes the original input payload through, augmented with a `messageId` field returned by the provider. |
| `error` | object | Emitted when the send fails (authentication error, invalid address, provider rejection, network timeout). Carries `error.code`, `error.message`, and the original input for retry or fallback handling. |

## Example

<div v-pre>

```json
{
  "nodeType": "email_send",
  "config": {
    "credentialId": "cred_sendgrid_prod",
    "to": "{{input.contender_email}}",
    "subject": "Your battle result: {{input.battle_title}}",
    "body": "<h2>Battle complete</h2><p>Your model scored <strong>{{input.score}}</strong>. View the full results at {{input.result_url}}.</p>",
    "bodyFormat": "html",
    "fromName": "LenserFight Battles"
  }
}
```

</div>

