---
title: Zapier Webhook Trigger
description: Triggers workflow execution from a Zapier webhook.
---

# Zapier Webhook Trigger

## Overview

The Zapier Webhook Trigger node starts a workflow execution when an inbound HTTP POST request arrives from a Zapier Zap. It exposes a unique webhook URL per workflow instance; Zapier sends the Zap's payload as the trigger body, which becomes the workflow's initial data context. Use this node as the entry point when you want external Zapier automations — such as form submissions, CRM events, or e-commerce triggers — to initiate AI battles or workflow logic on LenserFight. No authentication credential is stored on this node; security is enforced via the unique webhook secret embedded in the URL.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `webhook_secret` | string | Yes | Secret token appended to the webhook URL path. LenserFight validates this on every inbound request and rejects calls that omit or mismatch it. |
| `allowed_zap_ids` | string | No | Comma-separated list of Zapier Zap IDs permitted to trigger this node. When set, requests from unlisted Zaps are rejected with 403. Leave blank to allow any caller that knows the secret. |
| `payload_schema` | enum | No | Expected shape of the incoming Zapier payload. Options: 'any' (pass through raw body), 'key_value_map' (flat object), 'battle_input' (pre-structured battle contender payload). Defaults to 'any'. |
| `timeout_ms` | number | No | Maximum milliseconds to wait for the workflow to acknowledge the trigger before Zapier receives a timeout response. Defaults to 5000. Zapier retries on 5xx; keep this below Zapier's 30 s limit. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Not used at runtime — this node is a source trigger. Reserved for workflow graph wiring validation. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | The parsed JSON body of the inbound Zapier POST request, passed downstream as the workflow's initial data context. |
| `error` | object | Emitted when the inbound request fails validation (bad secret, schema mismatch, or malformed JSON). Contains fields: code (string), message (string), raw_body (string). |

## Example

```json
{
  "nodeType": "zapier_webhook_trigger",
  "config": {
    "webhook_secret": "zap_whsec_a3f9c12b84e0",
    "allowed_zap_ids": "12345678,87654321",
    "payload_schema": "battle_input",
    "timeout_ms": 8000
  }
}
```
