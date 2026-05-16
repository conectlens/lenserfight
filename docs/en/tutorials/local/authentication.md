---
title: Local Authentication
description: Understand authentication in LenserFight — JWT flow, OAuth providers, Supabase Auth, session handling, and workspace security.
head:
  - - meta
    - name: og:title
      content: Local Authentication — LenserFight
  - - meta
    - name: og:description
      content: JWT, OAuth, Supabase Auth, session management, and workspace security for local LenserFight development.
---

# Local Authentication

This tutorial covers the authentication layer in LenserFight. You will understand how users authenticate, how sessions are managed, and how workspace security works.

## Prerequisites

- [Local Installation](/en/tutorials/local/installation) completed with Supabase mode
- Auth app running (`pnpm nx run auth:serve`)

---

## Authentication modes

| Mode | Data source | Auth method | Use case |
|------|------------|-------------|----------|
| File mode | `DATA_SOURCE=file` | Auto-login as Local Dev | Solo development, no auth needed |
| Supabase mode | `DATA_SOURCE=supabase` | Supabase Auth (GoTrue) | Full multi-user authentication |

---

## File mode authentication

In file mode, authentication is bypassed entirely. The app creates a synthetic `Local Dev` user on startup. No login screen appears.

This is controlled by the `DATA_SOURCE=file` environment variable.

---

## Supabase Auth (GoTrue)

In Supabase mode, LenserFight uses [GoTrue](https://github.com/supabase/gotrue) for authentication. GoTrue is a JWT-based auth server that supports:

- Email/password authentication
- Magic link (passwordless email)
- OAuth providers (Google, GitHub, Discord)
- Phone/SMS authentication

### JWT flow

```
1. User submits credentials → Auth app (port 3004)
2. Auth app calls GoTrue    → POST /auth/v1/token
3. GoTrue validates          → returns JWT (access_token + refresh_token)
4. Browser stores tokens     → localStorage / cookies
5. API requests include      → Authorization: Bearer <access_token>
6. Supabase validates JWT    → PostgREST checks auth.uid() in RLS policies
7. Token refresh             → automatic via refresh_token before expiry
```

### Token structure

The JWT payload contains:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "aud": "authenticated",
  "exp": 1700000000,
  "app_metadata": {
    "provider": "email"
  },
  "user_metadata": {
    "handle": "alice",
    "display_name": "Alice"
  }
}
```

### Session handling

The Supabase client manages sessions automatically:

```typescript
import { supabase } from '@lenserfight/data';

// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') { /* handle login */ }
  if (event === 'SIGNED_OUT') { /* handle logout */ }
  if (event === 'TOKEN_REFRESHED') { /* token auto-refreshed */ }
});
```

---

## OAuth providers

### Configuring OAuth locally

OAuth providers are configured in `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "your-google-client-id"
secret = "your-google-client-secret"
redirect_uri = "http://localhost:54321/auth/v1/callback"

[auth.external.github]
enabled = true
client_id = "your-github-client-id"
secret = "your-github-client-secret"
redirect_uri = "http://localhost:54321/auth/v1/callback"
```

### Triggering OAuth login

```typescript
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'http://localhost:3000/auth/callback',
  },
});
```

### Supported OAuth providers

| Provider | Config key | Notes |
|----------|-----------|-------|
| Google | `auth.external.google` | Requires Google Cloud Console project |
| GitHub | `auth.external.github` | Requires GitHub OAuth app |
| Discord | `auth.external.discord` | Requires Discord developer app |

---

## Auth app architecture

The auth app (`apps/auth/`) handles authentication UI flows:

```
apps/auth/ (port 3004)
  ├── Login page         → email/password, magic link, OAuth
  ├── Signup page        → registration with handle selection
  ├── Callback page      → OAuth redirect handler
  ├── Reset password     → password reset flow
  └── Verify email       → email verification
```

The web app redirects to the auth app for login/signup, and the auth app redirects back after successful authentication.

### Auth URL configuration

```bash
# .env.local
AUTH_BASE_URL=http://localhost:3004
```

---

## Role and permission model

LenserFight uses a layered permission model:

### Platform roles

| Role | Description | RLS context |
|------|-------------|-------------|
| `anon` | Unauthenticated visitor | Read-only public data |
| `authenticated` | Logged-in user | Own data + public data |
| `service_role` | Backend services | Full access (bypasses RLS) |

### Workspace roles

| Role | Permissions |
|------|------------|
| **Owner** | Full CRUD, settings, billing, member management |
| **Admin** | CRUD, member management, no billing |
| **Member** | Create/edit own content, read shared content |
| **Viewer** | Read-only access |

### Checking permissions

```typescript
import { useAuth } from '@lenserfight/shared';

function ProtectedComponent() {
  const { user, isOwner, isAdmin } = useAuth();

  if (!user) return <LoginPrompt />;
  if (!isOwner) return <AccessDenied />;

  return <OwnerDashboard />;
}
```

---

## Workspace security

### Data isolation

Each workspace has isolated data enforced by RLS:

```sql
-- Users can only read their workspace's data
CREATE POLICY "workspace_isolation"
  ON public.lenses
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );
```

### Developer tokens

For CI/CD and API access, users can create developer tokens:

```bash
lf auth token create --name "CI Pipeline" --expires 30d
```

Tokens are stored in `authz.developer_tokens` with configurable expiration and revocation.

---

## Local development tips

### Using seed accounts

After `pnpm supabase:db:reset`, log in with seed accounts:

| Email | Password | Notes |
|-------|----------|-------|
| `alice@lenserfight.local` | Check seed script | Admin user with sample data |
| `bob@lenserfight.local` | Check seed script | Regular user |

### Bypassing auth in development

Set local auth testing setup in `.env.local` to skip real auth calls in development.

### Inspecting tokens

Use [jwt.io](https://jwt.io) to decode and inspect JWT tokens from browser DevTools:

1. Open DevTools → Application → Local Storage
2. Find the `sb-<project>-auth-token` key
3. Copy the `access_token` value
4. Paste into jwt.io

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Redirect loop on login | Auth URL mismatch | Verify `AUTH_BASE_URL` matches the auth app port |
| `JWT expired` | Token not refreshing | Clear browser storage and re-login |
| OAuth callback fails | Redirect URI mismatch | Update OAuth app redirect URI to match local Supabase |
| `permission denied` on queries | RLS policy issue | Check `auth.uid()` and policy conditions |
| `Invalid API key` | Wrong anon key | Copy from `pnpm supabase start` output |

---

## Next steps

- [Local Database](/en/tutorials/local/database) — schema, migrations, and RLS policies
- [Development Workflow](/en/tutorials/local/development-workflow) — daily development patterns
- [Cloud Getting Started](/en/tutorials/cloud/getting-started) — cloud authentication setup
