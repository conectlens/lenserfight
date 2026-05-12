---
title: Supabase Integration
description: Use Supabase as the backend for LenserFight — database, auth, storage, and real-time subscriptions.
head:
  - - meta
    - name: og:title
      content: Supabase Integration — LenserFight
  - - meta
    - name: og:description
      content: Complete Supabase integration guide for LenserFight developers.
---

# Supabase Integration

Supabase provides the backend infrastructure for LenserFight: PostgreSQL database, authentication, file storage, and real-time subscriptions.

## Setup

### Local Supabase

```bash
pnpm supabase start
pnpm supabase:db:reset
```

### Configuration

```bash
DATA_SOURCE=supabase
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<your-anon-key>
```

---

## Services

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 54322 | Database |
| GoTrue | 54321/auth | Authentication |
| PostgREST | 54321/rest | REST API |
| Realtime | 54321/realtime | WebSocket subscriptions |
| Storage | 54321/storage | File storage |
| Studio | 54323 | Web admin UI |

---

## Authentication

```typescript
import { supabase } from '@lenserfight/data';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Get user
const { data: { user } } = await supabase.auth.getUser();
```

---

## Database queries

```typescript
// Select
const { data } = await supabase
  .from('lenses')
  .select('*')
  .eq('visibility', 'public')
  .order('created_at', { ascending: false })
  .limit(20);

// Insert
const { data, error } = await supabase
  .from('lenses')
  .insert({ name: 'My Lens', content: '...' })
  .select()
  .single();

// RPC call
const { data } = await supabase
  .rpc('get_agent_analytics_summary', { p_lenser_id: id });
```

---

## Real-time subscriptions

```typescript
const channel = supabase
  .channel('workflow-runs')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'workflow_runs' },
    (payload) => {
      console.log('Run updated:', payload.new);
    }
  )
  .subscribe();
```

---

## Storage

```typescript
// Upload
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, file);

// Download
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.png`);
```

---

## Security

- **RLS enabled** on all tables
- **Service role** key is server-only (never expose to browser)
- **Anon key** is safe for browser use (RLS restricts access)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `PGRST116` (no rows) | Check RLS policies |
| `42501` (permission denied) | Check grants and RLS |
| Realtime not connecting | Check `SUPABASE_URL` |
| Storage upload fails | Check bucket policies |

---

## Next steps

- [Local Database](/en/tutorials/local/database) — migrations and schema management
- [Local Authentication](/en/tutorials/local/authentication) — auth deep dive
