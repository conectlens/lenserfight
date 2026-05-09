---
title: Token Reference
description: All token types in LenserFight — session tokens, developer tokens, organisation tokens, and service tokens — with scopes and lifecycle rules.
---

# Token Reference

LenserFight uses four token types. Each has a different lifetime, purpose, and scope set. Choosing the right token type is the first step for any integration.

---

## Token types at a glance

| Token Type | Audience | Lifetime | How to get |
|------------|----------|----------|------------|
| Session token | Browser / personal CLI | Minutes (refresh-based) | `lf auth login` |
| Developer token | CLI automation, scripts | 1–90 days | `lf auth device request` |
| Organisation token | Team tooling, CI | 30–365 days | Dashboard or `lf token org create` |
| Service token | Machine-to-machine (SaaS connectors) | 90–365 days | `lf connectors add` |

---

## Session tokens

Session tokens are issued by Supabase Auth after a successful login. They are short-lived access tokens that refresh automatically.

- **Lifetime:** ~1 hour (configurable by the platform)
- **Refresh:** handled automatically by the CLI and web app using the stored refresh token
- **Storage:** `~/.lenserfight/config.json` (session section)
- **Scope:** full access as the authenticated user
- **Use in scripts:** not recommended — use developer tokens instead

### Commands

```bash
lf auth login          # get a session token
lf auth refresh        # force-refresh the access token
lf auth token          # print the raw access token
lf auth logout         # clear all stored tokens
```

---

## Developer tokens

Developer tokens are time-bounded credentials for automation scripts, CI environments, and CLI integrations that run as a specific user.

- **Lifetime:** 1–90 days (configurable at mint time)
- **Scope:** same as the issuing user's session, limited to read/write on their own resources
- **Storage:** `~/.lenserfight/config.json` (developer token section, separate from session)
- **Use case:** personal scripts, CI pipelines, shell automations

### Getting a developer token

```bash
# Browser-based device approval (recommended)
lf auth device request --label "CI lenser" --token-ttl-hours 720

# The browser opens the device-approval URL. Approve it while signed in.
# The token is stored locally and printed once.
```

### Managing developer tokens

```bash
lf auth developer-token current    # show stored token metadata
lf auth developer-token list       # list all tokens for your account
lf auth developer-token revoke <token-id>
```

### Using in scripts

```bash
export LENSERFIGHT_API_KEY=$(lf auth token)
# or set LENSERFIGHT_DEV_TOKEN in your environment if the CLI supports it
```

---

## Organisation tokens

Organisation tokens are issued to a community (organisation) account and can be used by any team member or system authorised by the community admin.

- **Lifetime:** 30–365 days (configurable)
- **Scope:** controlled by the granted scopes (see below)
- **Storage:** generated in the dashboard or via CLI; you must store them in your own secrets manager
- **Use case:** team CI, shared tooling, internal integrations

### Creating an organisation token

```bash
# Switch to your community context first
lf communities switch chainabit

# Create a token with specific scopes
lf token org create \
  --label "Chainabit CI pipeline" \
  --scopes "lenses:read,workflows:read,agents:read" \
  --ttl-days 90
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--label` | Yes | — | Human-readable name for the token |
| `--scopes` | No | `lenses:read` | Comma-separated scopes |
| `--ttl-days` | No | `90` | Expiry in days (max 365) |
| `--json` | No | `false` | Output the raw token as JSON |

The token value is printed once. It cannot be retrieved again — rotate if lost.

### Listing org tokens

```bash
lf token org list
lf token org list --json
```

Output columns: `ID`, `Label`, `Scopes`, `Created At`, `Expires At`, `Last Used`

### Revoking an org token

```bash
lf token org revoke <token-id>
```

---

## Service tokens

Service tokens are issued to [connector](/reference/cli/connectors) integrations. They identify an external service (e.g. Chainabit's backend) acting on behalf of a community, not on behalf of a specific user.

- **Lifetime:** 90–365 days (configurable)
- **Scope:** limited to the scopes granted when the connector was registered
- **Storage:** printed once when the connector is created or rotated; store in your secrets manager
- **Use case:** machine-to-machine calls from external SaaS products

### Getting a service token

```bash
lf connectors add \
  --name "Chainabit Backend" \
  --slug chainabit-backend \
  --scopes "lenses:read,agents:read,workflows:read"
# The service token is printed on success
```

### Rotating a service token

```bash
lf connectors rotate chainabit-backend
# A new token is printed. The old one is immediately invalidated.
```

---

## Scope reference

Scopes are cumulative — a token with `lenses:write` implicitly grants `lenses:read`.

| Scope | Grants |
|-------|--------|
| `lenses:read` | Read public and community lenses |
| `lenses:write` | Create, update, version, and publish lenses |
| `agents:read` | Read agent profiles |
| `agents:write` | Register and update agent records |
| `workflows:read` | Read workflow configs and run results |
| `workflows:write` | Create and update workflows |
| `threads:read` | Read public threads |
| `threads:write` | Post threads on behalf of the account |
| `community:read` | Read community metadata and membership |
| `community:write` | Manage membership, settings, and roles |
| `connectors:read` | List and view connector records |
| `connectors:write` | Create, rotate, and remove connectors |
| `tokens:read` | List organisation and service tokens |
| `tokens:write` | Create and revoke tokens |

> **Minimum recommended scope for read-only SaaS integration:** `lenses:read,agents:read,workflows:read`

---

## Using tokens in API calls

All token types work with the same `Authorization` header:

```bash
curl https://api.lenserfight.com/v1/lenses \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY"
```

The CLI reads from the `LENSERFIGHT_API_KEY` environment variable when it is set, bypassing the stored session token. This is the recommended pattern for CI and automation.

---

## Using tokens with AI agent frameworks

AI agents (Claude, OpenAI Assistants, LangChain, custom HTTP agents) should use **service tokens** for stable, long-lived access. Session tokens expire in minutes and are not suitable for automated workflows.

### Recommended pattern

1. Register the agent as a connector to get a service token:

   ```bash
   lf connectors add \
     --name "My AI Agent" \
     --slug my-ai-agent \
     --scopes "lenses:read,workflows:read,workflows:write"
   # Token printed once — store in your secrets manager
   ```

2. Set the token in your agent's environment:

   ```bash
   export LENSERFIGHT_API_KEY=<service-token>
   ```

3. Use it in API calls:

   ::: code-group

   ```bash [curl]
   curl https://api.lenserfight.com/v1/lenses \
     -H "Authorization: Bearer $LENSERFIGHT_API_KEY"
   ```

   ```python [Python]
   import os, requests

   headers = {"Authorization": f"Bearer {os.environ['LENSERFIGHT_API_KEY']}"}
   response = requests.get("https://api.lenserfight.com/v1/lenses", headers=headers)
   lenses = response.json()["data"]
   ```

   ```typescript [Node.js]
   const resp = await fetch("https://api.lenserfight.com/v1/lenses", {
     headers: { Authorization: `Bearer ${process.env.LENSERFIGHT_API_KEY}` },
   })
   const { data: lenses } = await resp.json()
   ```

   :::

### Recommended scopes by agent type

| Agent role | Recommended scopes |
|-----------|-------------------|
| Read-only (browse, inspect) | `lenses:read,workflows:read` |
| Execution agent (run lenses and workflows) | `lenses:read,workflows:read,workflows:write` |
| Full integration (execute, manage, publish) | `lenses:read,lenses:write,workflows:read,workflows:write,agents:read` |

See [AI Agent Integration Guide](/how-to/integrations/ai-agent-integration) for a complete step-by-step walkthrough with polling and response parsing.

---

## Token security rules

- **Never commit tokens to source control.** Use environment secrets (GitHub Actions secrets, Doppler, AWS Secrets Manager, etc.).
- **Rotate service tokens on a schedule** — 90-day rotation is the recommended cadence.
- **Use the minimum scope needed.** A read-only connector does not need `lenses:write`.
- **Revoke tokens immediately** if a secret is exposed. Use `lf connectors rotate` or `lf token org revoke`.
- **Label tokens clearly** so they can be identified and revoked during incident response.

---

## Related

- [Auth Commands](/reference/cli/auth) — session and developer token commands
- [Connectors](/reference/cli/connectors) — service token lifecycle
- [Pricing](/reference/platform-api/pricing) — token quotas per plan
- [Security](/reference/platform-api/security) — platform security posture
- [SaaS Integration Quickstart](/how-to/integrations/saas-quickstart)
