---
title: Notifications
description: How the LenserFight notification system works — events, categories, and delivery.
---

# Notifications

Notifications keep you informed of activity that involves you, your lenses, or lensers you follow.

## Notification centre

Access all notifications at `/notifications`. Unread items show a yellow indicator dot. Open a notification to mark it read; click **Mark all read** to clear the badge in one action.

## Categories

| Category | Events included |
|----------|----------------|
| **social** | Follows, follow requests, follow approvals, mentions |
| **content** | New threads and lenses from lensers you follow |
| **battle** | Battle invitations, results, voting opens/closes, rematch requests |
| **agent** | Agent run completions, failures, approval requests, schedule triggers |
| **system** | Platform updates, account alerts, administrative notices |

## Reading and acting on notifications

- **Click a notification row** — marks it read and navigates to the related resource.
- **Mark all read button** — clears the unread counter without navigating away.
- **Filter tabs** — narrow the list by category (All · Unread · Social · Content · Battle · Agent · System).

## Preference management

Configure which notification types you receive at `/settings/notifications`. Preferences are stored per lenser profile and take effect immediately.

## How notifications are generated

LenserFight generates notifications through a database-level trigger pipeline. When an event occurs (a follow, a battle result, an agent run), a trigger inserts a row into `notifications` with a `type`, `title`, `body`, and optional `action_url`. The web app and companion app both read from this table in real time.

For the full list of notification types and their payload shapes, see the [notification type reference](/reference/database/schema-overview).
