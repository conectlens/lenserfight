# Adding OAuth Providers

This guide explains how to extend the shared OAuth connector system with a new provider (e.g. GitHub, Slack, Notion) or a new capability for an existing provider.

## What are OAuth connectors?

OAuth connectors allow users to connect external accounts **once** and reference those connections anywhere across Workflows, Agents, Battles, and Lenses using the stable expression syntax:

```
[[:connector:google.gmail.primary]]
```

This is distinct from **platform API connectors** (`connectors.connectors`), which are external systems calling LenserFight via SHA-256 tokens. OAuth connectors are the inverse: LenserFight calling external services on behalf of users.

---

## Architecture overview

| Layer | File | Role |
|---|---|---|
| DB schema | `supabase/migrations/20280101000000_user_oauth_connections.sql` | `public.user_oauth_connections` table |
| DB RPCs | `supabase/migrations/20280101000001_user_oauth_connections_rpcs.sql` | List, upsert, revoke, resolve, refresh RPCs |
| Domain types | `libs/domain/oauth-connections` | Provider/capability contracts, ref parser |
| Resolver | `libs/infra/execution/src/lib/oauth-connection-resolver.ts` | Server-side token resolution |
| Composite | `libs/infra/execution/src/lib/composite-connector-resolver.ts` | Routes OAuth refs vs. platform slugs |
| Edge Function | `supabase/functions/oauth-google-callback/` | Exchanges authorization code for tokens |
| Settings UI | `libs/features/settings/src/lib/components/OAuthConnectionsSection.tsx` | Connect/revoke UI |

---

## Adding a new capability to an existing provider

**Example: adding `gmail.compose` as a narrower alternative to `gmail`.**

### 1. Update `google.provider.ts`

In `libs/domain/oauth-connections/src/lib/providers/google.provider.ts`, add to `GOOGLE_CAPABILITIES`:

```typescript
{
  capability: 'gmail_compose',   // new capability key
  provider: 'google',
  requiredScopes: ['https://www.googleapis.com/auth/gmail.compose'],
  displayName: 'Gmail Compose',
  description: 'Compose and send Gmail messages (without read access)',
  supportedOperations: ['send'],
},
```

### 2. Extend the `OAuthCapability` type

In `libs/domain/oauth-connections/src/lib/oauth-connection.types.ts`:

```typescript
export type GoogleCapability = 'gmail' | 'drive' | 'sheets' | 'docs' | 'calendar' | 'gmail_compose'
```

### 3. Update the parser allowlist

In `libs/domain/oauth-connections/src/lib/connector-ref.parser.ts`, add to `VALID_CAPABILITIES`:

```typescript
const VALID_CAPABILITIES = new Set<OAuthCapability>([
  'gmail', 'drive', 'sheets', 'docs', 'calendar', 'gmail_compose',
])
```

### 4. Update the DB CHECK constraint

Add a migration that extends the `uoc_capability_check` constraint:

```sql
ALTER TABLE public.user_oauth_connections
  DROP CONSTRAINT uoc_capability_check,
  ADD CONSTRAINT uoc_capability_check CHECK (
    capability IN ('gmail', 'drive', 'sheets', 'docs', 'calendar', 'gmail_compose')
  );
```

---

## Adding a new provider

**Example: adding Slack.**

### 1. Create a provider definition

Create `libs/domain/oauth-connections/src/lib/providers/slack.provider.ts`:

```typescript
import type { OAuthProviderDefinition } from '../oauth-connection.types'

export const SLACK_CAPABILITIES = [
  {
    capability: 'slack_send' as const,
    provider: 'slack' as const,
    requiredScopes: ['chat:write'],
    displayName: 'Slack Send',
    description: 'Post messages to Slack channels',
    supportedOperations: ['send'],
  },
]

export const slackProvider: OAuthProviderDefinition = {
  provider: 'slack',
  displayName: 'Slack',
  capabilities: SLACK_CAPABILITIES,
  buildAuthUrl(capability, redirectUri, state) {
    // Build Slack OAuth 2.0 URL
    const params = new URLSearchParams({
      client_id: process.env['SLACK_CLIENT_ID'] ?? '',
      scope: 'chat:write',
      redirect_uri: redirectUri,
      state,
    })
    return `https://slack.com/oauth/v2/authorize?${params}`
  },
}
```

### 2. Register the provider

In `libs/domain/oauth-connections/src/lib/provider.registry.ts`:

```typescript
import { slackProvider } from './providers/slack.provider'
registerOAuthProvider(slackProvider)
```

### 3. Extend domain types

```typescript
// oauth-connection.types.ts
export type OAuthProvider = 'google' | 'slack'
export type SlackCapability = 'slack_send'
export type OAuthCapability = GoogleCapability | SlackCapability
```

### 4. Update the parser allowlists

```typescript
const VALID_PROVIDERS = new Set<OAuthProvider>(['google', 'slack'])
const VALID_CAPABILITIES = new Set<OAuthCapability>([..., 'slack_send'])
```

### 5. Update DB constraints

Add a migration extending `uoc_provider_check` and `uoc_capability_check`.

### 6. Add a callback Edge Function

Copy `supabase/functions/oauth-google-callback/` as a template, adapting the token exchange URL, required env vars, and callback redirect.

Register the Edge Function in Supabase settings.

### 7. Add a connector ref field to relevant workflow nodes

In the relevant runner's descriptor file (e.g. `cq-integration.descriptors.ts`), add:

```typescript
{
  key: 'connectorRef',
  label: 'Slack Account',
  type: 'connector_ref',
  required: true,
  connectorProvider: 'slack',
  connectorCapability: 'slack_send',
}
```

### 8. Wire the runner

Follow the pattern in `integration.runner.ts` — read `connectorRef` from `nodeConfig`, call `ctx.resolveConnector(connectorRef, requiredScopes)`, and include the token in the worker request envelope.

---

## pgTAP checklist for new providers

When adding a new provider, add assertions to `supabase/tests/96_user_oauth_connections.sql`:

- Provider name accepted by `uoc_provider_check`
- Capability name accepted by `uoc_capability_check`
- New callback Edge Function exists (manual check — pgTAP doesn't cover Edge Functions)

---

## Token security requirements

- Access and refresh tokens are stored **exclusively in Supabase Vault** (`vault.secrets`). Never store them in table columns.
- `fn_oauth_upsert_connection` is `service_role`-only — only callable from Edge Functions.
- `fn_oauth_resolve_connection` is `service_role`-only — only callable from execution workers.
- `nullOAuthConnectionResolver` must be used in browser/dry-run context (always returns null).
- Tokens must never appear in execution `output_data`, logs, or frontend state.
