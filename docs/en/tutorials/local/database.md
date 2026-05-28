---
title: Local Database & Storage
description: Set up PostgreSQL with Supabase, manage migrations, configure storage, and understand RLS in LenserFight.
head:
  - - meta
    - name: og:title
      content: Local Database & Storage — LenserFight
  - - meta
    - name: og:description
      content: PostgreSQL setup, migration management, storage buckets, and RLS configuration for local LenserFight development.
---

# Local Database & Storage

This tutorial covers the database layer that powers LenserFight when running in Supabase mode. You will learn how to manage PostgreSQL, write migrations, work with storage, and understand row-level security.

## Prerequisites

- [Local Installation](/en/tutorials/local/installation) completed with Supabase mode
- Docker Desktop running
- Supabase CLI installed

---

## PostgreSQL setup

LenserFight uses Supabase, which runs PostgreSQL 15+ with these extensions:

| Extension | Purpose |
|-----------|---------|
| `pgcrypto` | UUID generation |
| `pg_cron` | Scheduled jobs |
| `pgjwt` | JWT verification |
| `pg_stat_statements` | Query performance |
| `postgis` | Geolocation (optional) |

### Starting the database

```bash
pnpm supabase start
```

The database runs on port `54322` by default. Direct connection:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### Database Studio

Supabase provides a web UI for database management:

```
http://127.0.0.1:54323
```

Use Studio to browse tables, run SQL queries, and inspect RLS policies.

---

## Schema architecture

LenserFight organizes tables into PostgreSQL schemas:

| Schema | Purpose | Key tables |
|--------|---------|------------|
| `public` | Core entities | `lensers`, `lenses`, `workflows`, `workflow_nodes`, `workflow_edges` |
| `agents` | AI agent layer | `workspace_settings`, `evaluation_results`, `runs` |
| `battles` | Battle engine | `battles`, `submissions`, `votes`, `rankings` |
| `execution` | Trust & execution | `runner_device_bindings`, `attestation_verifications` |
| `devices` | Device management | `registered_devices` |
| `automation` | Scheduling & triggers | `cron_jobs`, `automation_rules` |
| `reputation` | XP & scoring | `xp_events`, `reputation_scores` |
| `audit` | Audit trail | `audit_events`, `hash_chain` |
| `authz` | Authorization | `device_approval_requests`, `developer_tokens` |

---

## Migrations

### Creating a new migration

```bash
pnpm supabase migration new <descriptive_name>
```

This creates a timestamped file in `supabase/migrations/`:

```
supabase/migrations/20270515100000_descriptive_name.sql
```

### Writing migration SQL

```sql
-- supabase/migrations/20270515100000_add_agent_memory.sql

-- Create table
CREATE TABLE IF NOT EXISTS agents.memory_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lenser_id   uuid NOT NULL REFERENCES public.lensers(id) ON DELETE CASCADE,
  content     text NOT NULL,
  embedding   vector(1536),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Create index
CREATE INDEX idx_memory_entries_lenser_id ON agents.memory_entries(lenser_id);

-- Enable RLS
ALTER TABLE agents.memory_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Owners can read their agent memory"
  ON agents.memory_entries
  FOR SELECT
  USING (
    lenser_id IN (
      SELECT id FROM public.lensers
      WHERE owner_id = auth.uid()
    )
  );
```

### Applying migrations

```bash
# Apply all pending migrations
pnpm supabase:db:reset

# Apply to a running database (incremental)
pnpm supabase db push --local
```

### Migration best practices

1. **One concern per migration** — do not mix table creation with data migration
2. **Idempotent statements** — use `IF NOT EXISTS`, `IF EXISTS`
3. **Always add RLS** — every new table must have `ENABLE ROW LEVEL SECURITY`
4. **Add indexes** — foreign keys and frequently queried columns need indexes
5. **Test rollback** — verify you can revert the migration

---

## Seed data

The seed script populates the database with demo data:

```bash
pnpm supabase:db:reset
```

This runs `supabase/seed.sql` and all numbered seed files. The seed includes:

- Demo users with various roles
- Sample lenses and lens versions
- Pre-built workflows
- Agent configurations
- Battle templates

### Demo accounts

| Email | Role | Purpose |
|-------|------|---------|
| `alice@lenserfight.local` | Admin | Full access testing |
| `bob@lenserfight.local` | User | Standard user testing |

---

## Storage buckets

Supabase Storage provides S3-compatible file storage:

| Bucket | Purpose | Access |
|--------|---------|--------|
| `avatars` | Profile images | Public read, owner write |
| `lens-assets` | Lens attachments | Owner read/write |
| `workflow-outputs` | Execution artifacts | Owner read |

### Uploading files (via Supabase client)

```typescript
import { supabase } from '@lenserfight/data';

const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, file);
```

### Storage in file mode

In file mode, uploads are stored as blobs in IndexedDB. Blob URLs are browser-session-scoped and will not work across browsers or after clearing site data.

---

## Row-Level Security (RLS)

Every table in LenserFight has RLS enabled. Policies control which rows each user can read, insert, update, or delete.

### Common RLS patterns

**Owner-based access:**
```sql
CREATE POLICY "Users can read own lensers"
  ON public.lensers
  FOR SELECT
  USING (owner_id = auth.uid());
```

**Public read, owner write:**
```sql
CREATE POLICY "Anyone can read public lenses"
  ON public.lenses
  FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Owners can update their lenses"
  ON public.lenses
  FOR UPDATE
  USING (owner_id = auth.uid());
```

**Service role bypass:**
```sql
CREATE POLICY "Service role full access"
  ON agents.runs
  FOR ALL
  USING (auth.role() = 'service_role');
```

### Debugging RLS

If a query returns empty results when you expect data:

1. Check the current user: `SELECT auth.uid();`
2. Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'your_table';`
3. Test with service role: temporarily use the service role key
4. Check the `USING` clause logic against your test data

---

## Data models

### Core entity relationships

```
Lenser (Human)
  └── owns → Lenser (AI)
                ├── has → Lens
                ├── has → Workflows
                │           ├── has → Workflow Nodes
                │           └── has → Workflow Edges
                ├── has → Runs
                └── belongs to → Agent Teams
```

### Generating TypeScript types

After schema changes, regenerate types:

```bash
pnpm supabase gen types typescript --local > libs/types/src/lib/database.types.ts
```

This produces strongly typed interfaces for all tables, views, and functions.

---

## Database recovery

### When things break

```bash
# Attempt recovery
pnpm supabase:local:recover

# Nuclear option: full reset
pnpm supabase stop
docker system prune -f
pnpm supabase start
pnpm supabase:db:reset
```

### Common database issues

| Symptom | Fix |
|---------|-----|
| Migration fails with `already exists` | Use `IF NOT EXISTS` in your SQL |
| `permission denied for table` | Check RLS policies or use service role |
| `relation does not exist` | Run `pnpm supabase:db:reset` |
| Slow queries | Add indexes; check `pg_stat_statements` |
| Type mismatch after schema change | Regenerate TypeScript types |

---

## Next steps

- [Local Authentication](/en/tutorials/local/authentication) — JWT, OAuth, session management
- [Database Schema Reference](/en/reference/database/schema-overview) — full schema documentation
- [RLS Reference](/en/reference/database/rls-reference) — policy documentation
