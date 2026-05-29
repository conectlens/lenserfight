---
title: Calendar Create
description: Creates a calendar event.
---

# Calendar Create

## Overview

The Calendar Create node creates a calendar event using a configured calendar integration credential. It accepts event details — title, time range, attendees, and optional metadata — and emits the created event record on success or routes to an error port on failure. Use this node when a workflow needs to schedule meetings, reminders, or battle review sessions in response to upstream triggers. A valid calendar credential (e.g. Google Calendar OAuth) must be configured before the node can execute.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialId` | string | Yes | ID of the calendar OAuth credential to use for authentication. |
| `calendarId` | string | Yes | Target calendar identifier (e.g. 'primary' or a specific calendar ID). |
| `title` | string | Yes | Event title. Supports template expressions (e.g. '{{battle.title}} Review'). |
| `startTime` | string | Yes | ISO 8601 datetime string for the event start time. |
| `endTime` | string | Yes | ISO 8601 datetime string for the event end time. |
| `description` | string | No | Optional event body or notes. Supports template expressions. |
| `attendees` | string | No | Comma-separated list of attendee email addresses to invite. |
| `location` | string | No | Physical or virtual location string (e.g. a meeting URL). |
| `sendNotifications` | boolean | No | Whether to send email invitations to attendees. Defaults to true. |
| `timezone` | string | No | IANA timezone for the event (e.g. 'America/New_York'). Defaults to UTC. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Trigger signal and optional context data. Fields such as startTime, endTime, title, and attendees can be sourced from upstream node output via template expressions in config. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on successful event creation. Contains the created event record including the provider-assigned event ID, HTML link, and echoed event details. |
| `error` | object | Emitted when event creation fails (e.g. invalid credential, scheduling conflict, or malformed datetime). Contains an error code and message. |

## Example

```json
{
  "nodeType": "calendar_create",
  "config": {
    "credentialId": "cred_gcal_ofcskn",
    "calendarId": "primary",
    "title": "Battle Review: {{battle.title}}",
    "startTime": "{{battle.endsAt}}",
    "endTime": "{{battle.reviewDeadline}}",
    "attendees": "judge@lenserfight.org,host@lenserfight.org",
    "sendNotifications": true,
    "timezone": "UTC"
  }
}
```
