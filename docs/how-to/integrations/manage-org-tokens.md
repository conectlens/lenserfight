---
title: Manage Organisation Tokens
description: Create, scope, rotate, and revoke organisation and service tokens in LenserFight.
---

# Manage Organisation Tokens

This guide covers the full lifecycle of organisation tokens and service tokens — the two token types designed for team and machine-to-machine use.

For personal developer tokens, see [Auth Commands](/reference/cli/auth#developer-tokens).

---

## When to use which token

| Token | Use when |
|-------|----------|
| **Organisation token** | A team member or CI pipeline needs to act on behalf of the community with a scoped, shared credential |
| **Service token** | An external system (Chainabit backend, Google Cloud Function) needs to call LenserFight APIs with no human session |

Both token types accept the same `Authorization: Bearer` header and `LENSERFIGHT_API_KEY` environment variable. The difference is in how they are issued and who they represent.

---

## Prerequisite: set the community context

All organisation token commands require the active community context to be set:

```bash
lf communities switch chainabit
```

Verify:

```bash
lf communities current
# → Active community: chainabit
```

---

## Organisation tokens

### Create a token

```bash
lf token org create \
  --label "GitHub Actions deploy pipeline" \
  --scopes "lenses:read,workflows:read" \
  --ttl-days 90
```

The token value is printed once. Copy it to your secrets manager immediately.

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--label` | Yes | — | Human-readable name (appears in token list) |
| `--scopes` | No | `lenses:read` | Comma-separated scope list |
| `--ttl-days` | No | `90` | Expiry in days (max 365) |
| `--json` | No | `false` | Output full token record as JSON |

### List tokens

```bash
lf token org list
lf token org list --json
```

Output columns: `ID`, `Label`, `Scopes`, `Created At`, `Expires At`, `Last Used`

Use `Last Used` to identify stale tokens that can be revoked.

### Revoke a token

```bash
lf token org revoke <token-id>
```

Revocation is immediate. Any in-flight request using the revoked token fails with `401`.

### Inspect a token's scopes

There is no "show secret" command by design. To check what scopes a token has:

```bash
lf token org list --json | jq '.[] | select(.id == "<token-id>") | .scopes'
```

---

## Service tokens (connector tokens)

Service tokens are issued when you create or rotate a connector. They are scoped to the connector's registered scope set.

### Create a new service token (via connector)

```bash
lf connectors add \
  --name "Chainabit Prod" \
  --slug chainabit-prod \
  --scopes "lenses:read,agents:read,workflows:read"
# Service token printed on success
```

### Rotate a service token

```bash
lf connectors rotate chainabit-prod
```

The old token is immediately invalidated. The new token is printed once.

**Rotation playbook:**

1. Run `lf connectors rotate chainabit-prod` and copy the new token.
2. Update `LENSERFIGHT_API_KEY` in your secrets manager.
3. Trigger a deployment to pick up the new value (if your environment requires it).
4. Verify with `lf connectors test chainabit-prod`.

### Revoke a connector (and its token)

```bash
lf connectors remove chainabit-prod
```

Removing a connector revokes all tokens associated with it. Use this during incident response or when decommissioning a service.

---

## Scoping correctly

Always apply the minimum scope set needed:

```bash
# Read-only data consumer (most common for SaaS backends)
--scopes "lenses:read,agents:read,workflows:read"

# Integration that also creates lenses
--scopes "lenses:read,lenses:write,agents:read"

# Full community management (use sparingly — admin automation only)
--scopes "lenses:read,lenses:write,agents:read,agents:write,workflows:read,workflows:write,community:read,community:write,connectors:read,connectors:write,tokens:read,tokens:write"
```

Scope escalation requires creating or rotating a token with additional scopes. You cannot add scopes to an existing token without rotating it.

---

## Token expiry and rotation schedule

| Token type | Recommended rotation cadence |
|------------|------------------------------|
| Organisation token | Every 90 days |
| Service token | Every 90 days |
| Developer token | Every 30 days for CI; annually for personal use |

Set a calendar reminder or a scheduled job at day 80 to rotate before expiry:

```bash
# Example: cron job to rotate before expiry
0 9 1 */3 * lf --community chainabit connectors rotate chainabit-prod && \
  doppler secrets set LENSERFIGHT_API_KEY=$(cat /tmp/new-token)
```

---

## Auditing token usage

Use the token list to spot stale or suspicious tokens:

```bash
lf token org list --json | jq '[.[] | {label, last_used, expires_at, scopes}]'
```

Revoke any token with `last_used` more than 30 days ago that you did not expect to be idle.

---

## Incident response checklist

If you suspect a token has been compromised:

1. Identify which token: `lf token org list` or `lf connectors list`
2. Revoke immediately:
   - Organisation token: `lf token org revoke <token-id>`
   - Service token: `lf connectors rotate <slug>` (rotates and invalidates the old token)
3. Audit recent API calls in your own logs for unusual activity.
4. Update the secret in your environment with the new token.
5. Notify your team.

If the exposure is serious, rotate all connectors and organisation tokens at once:

```bash
for slug in $(lf connectors list --json | jq -r '.[].slug'); do
  lf connectors rotate "$slug"
done
```

---

## Related

- [Token Reference](/reference/platform-api/tokens) — all token types, scopes, and lifetime rules
- [Connectors CLI Reference](/reference/cli/connectors) — full connector command reference
- [SaaS Integration Quickstart](saas-quickstart.md) — end-to-end setup
- [Security](/reference/platform-api/security) — platform security posture
