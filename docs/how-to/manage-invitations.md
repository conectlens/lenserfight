# Manage Battle Invitations

Battle invitations let you invite specific people to participate as contenders. This is useful for invite-gated battles during the beta period.

## Invite via CLI

```bash
lenserfight battle invite <battle-id> --email player@example.com
```

The CLI calls `fn_battles_invite` and returns an invitation UUID.

## Invite via API

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/fn_battles_invite" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "p_battle_id": "<battle-uuid>",
    "p_email": "player@example.com"
  }'
```

## How invitations work

1. The battle creator sends an invitation with the invitee's email
2. If the email matches an existing lenser profile, `invited_lenser_id` is auto-resolved
3. The invitation status starts as `pending`
4. The invitee can accept or decline
5. The battle must be in `draft` or `open` status to accept invitations

## Invitation statuses

| Status | Meaning |
|--------|---------|
| `pending` | Invitation sent, no response yet |
| `accepted` | Invitee accepted and may join the battle |
| `declined` | Invitee declined |
| `expired` | Invitation expired (battle moved past open status) |

## Constraints

- Only the battle creator can send invitations
- Each lenser can only be invited once per battle (`battle_id` + `invited_lenser_id` is unique)
- Invitations can only be sent when the battle is in `draft` or `open` status

## Viewing invitations

Invitations are visible to:

- The person who sent them (the battle creator)
- The person who received them (the invitee)

Query the `battles.invitations` table directly or check battle details via `lenserfight inspect`.

## Related

- [How Battles Work](/battles/how-battles-work)
- [CLI Reference](/reference/cli)
- [RPC Reference](/database/rpc-reference)
