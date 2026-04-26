---
title: SaaS Integration Quickstart
description: How to integrate LenserFight lenses, agents, and workflows into an external SaaS product — community account setup, connector registration, service token, and API usage.
---

# SaaS Integration Quickstart

This guide shows how a SaaS product (Chainabit is used as the running example) integrates LenserFight to fetch lenses, invoke agents, and run workflows from its own backend.

**Outcome:** Your backend makes authenticated API calls to LenserFight using a scoped service token, without depending on user sessions.

---

## Prerequisites

- A LenserFight account with at least the **Developer** plan
- The LenserFight CLI installed: `npm install -g @lenserfight/cli` (or build from the repo)
- A secrets manager or environment variable system for your backend

---

## Step 1: Create a community account

A community account gives your product a shared identity on LenserFight — its own lenses, agents, connectors, and member roster.

```bash
# Log in as the account that will own the community
lf auth login

# Create the community
lf communities create \
  --name "Chainabit" \
  --slug chainabit \
  --description "AI-powered productivity."

# Set it as the active context for subsequent commands
lf communities switch chainabit
```

> If you are on the Team plan, you can create up to 5 communities. If you need more, contact us about Enterprise.

---

## Step 2: Register a connector

A connector is a named service integration that holds the scoped service token your backend will use. Creating one also prints the service token once.

```bash
lf connectors add \
  --name "Chainabit Backend" \
  --slug chainabit-backend \
  --scopes "lenses:read,agents:read,workflows:read"
```

**Copy the printed service token now.** It cannot be retrieved again — only rotated.

Store it as a secret in your environment, for example:

```bash
# GitHub Actions / Doppler / AWS Secrets Manager / etc.
LENSERFIGHT_API_KEY=lf_svc_...
```

> **Start with the minimum scope.** `lenses:read,agents:read,workflows:read` covers most read-only integration scenarios. Add `lenses:write` or `workflows:write` only if your backend needs to create resources.

---

## Step 3: Verify the connector

```bash
lf connectors test chainabit-backend
```

A successful test prints the connector record and confirms the service token is valid.

---

## Step 4: Call the LenserFight REST API

Your backend uses the service token as a Bearer token. All LenserFight REST API calls follow this pattern:

```bash
curl https://api.lenserfight.com/v1/lenses \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY"
```

### Fetch public lenses

```bash
# List lenses sorted by popularity
curl "https://api.lenserfight.com/v1/lenses?sort=popularity&limit=20" \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY"

# Fetch a specific lens by slug
curl "https://api.lenserfight.com/v1/lenses/risk-scorer" \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY"

# Fetch lenses from your own community
curl "https://api.lenserfight.com/v1/lenses?community=chainabit" \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY"
```

### Fetch agents

```bash
curl "https://api.lenserfight.com/v1/agents?community=chainabit" \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY"
```

### Execute a lens

```bash
curl -X POST "https://api.lenserfight.com/v1/lenses/risk-scorer/run" \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": "Analyse this transaction for anomalies: 0xabc...123"}'
```

---

## Step 5: Use the CLI in your pipelines

If your CI or backend uses the CLI directly, set the environment variable and the CLI uses it automatically:

```bash
export LENSERFIGHT_API_KEY=lf_svc_...

# Browse community lenses
lf lenses --author @chainabit --sort popularity

# Execute a lens directly
lf lenses use risk-scorer --input "Analyse tx 0xabc..."

# List community agents
lf communities agents chainabit
```

---

## Step 6: Publish lenses from your product (optional)

If Chainabit wants to publish lenses under its own community identity:

```bash
# Create a lens
lf lens version create <lens-id> --content "Analyse [[transaction]] for fraud risk."

# Publish the version
lf lens version publish <lens-id> --version-id <version-uuid>
```

Lenses published under the `chainabit` community appear at:

```
https://lenserfight.com/@chainabit/<lens-slug>
```

---

## Step 7: Invite team members

Add your engineers to the community so they can manage lenses and connectors:

```bash
lf invite @alice --community chainabit --role admin
lf invite @bob --community chainabit --role member
```

Pending invitations appear in the invitee's LenserFight dashboard and can be accepted from the web or CLI.

---

## Token rotation schedule

Rotate service tokens on a regular schedule — 90 days is recommended:

```bash
lf connectors rotate chainabit-backend
# Update LENSERFIGHT_API_KEY in your secrets manager with the new token
```

Set a calendar reminder or a scheduled CI job to rotate before expiry. Expired tokens return `401 Unauthorized`.

---

## Environment separation

For multi-environment setups (dev / staging / production), register a separate connector per environment:

```bash
lf connectors add --name "Chainabit Dev" --slug chainabit-dev \
  --scopes "lenses:read,agents:read"

lf connectors add --name "Chainabit Staging" --slug chainabit-staging \
  --scopes "lenses:read,agents:read,workflows:read"

lf connectors add --name "Chainabit Production" --slug chainabit-prod \
  --scopes "lenses:read,agents:read,workflows:read"
```

Each connector has an independent service token and can be rotated or revoked independently.

---

## Error handling

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| `401 Unauthorized` | Token missing, invalid, or expired | Check `LENSERFIGHT_API_KEY`; rotate if expired |
| `403 Forbidden` | Token lacks required scope | Rotate token with additional scopes |
| `404 Not Found` | Lens, agent, or resource does not exist | Check slug/ID; verify community context |
| `429 Too Many Requests` | Rate limit reached | Back off and retry; consider upgrading plan |
| `503 Service Unavailable` | Platform maintenance | Retry with exponential backoff |

All error responses follow the [Common Contracts](/reference/community-api/common-contracts) envelope format.

---

## Checklist

- [ ] Community account created (`lf communities create`)
- [ ] Community context set (`lf communities switch`)
- [ ] Connector registered (`lf connectors add`)
- [ ] Service token stored securely (not in source control)
- [ ] Connector tested (`lf connectors test`)
- [ ] API call verified with `curl` or equivalent
- [ ] Token rotation schedule set (≤90 days)
- [ ] Separate connectors per environment (dev/staging/prod)

---

## Related

- [Connectors CLI Reference](/reference/cli/connectors)
- [Communities CLI Reference](/reference/cli/communities)
- [Token Reference](/reference/platform-api/tokens)
- [Manage Organisation Tokens](manage-org-tokens.md)
- [Community API Reference](/reference/community-api/index)
- [Pricing & Plans](/reference/platform-api/pricing)
