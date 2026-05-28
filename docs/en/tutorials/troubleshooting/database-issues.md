---
title: Database Issues
description: Diagnose and fix database connection failures, migration errors, and query performance issues.
head:
  - - meta
    - name: og:title
      content: Database Issues — LenserFight Troubleshooting
  - - meta
    - name: og:description
      content: Fix database connection failures, migration errors, and performance issues.
---

# Database Issues

Diagnosis and resolution guide for PostgreSQL and Supabase database problems.

---

## Connection failures

### Symptoms
- `ECONNREFUSED` when connecting to database
- Web app shows "Unable to connect to backend"
- `pnpm supabase status` shows services as stopped

### Root cause
Supabase containers are not running or Docker is stopped.

### Diagnosis
```bash
# Check Supabase status
pnpm supabase status

# Check Docker containers
docker ps | grep supabase
```

### Fixes
1. **Start Supabase:**
   ```bash
   pnpm supabase start
   ```

2. **Restart if stuck:**
   ```bash
   pnpm supabase stop
   pnpm supabase start
   ```

3. **Nuclear recovery:**
   ```bash
   pnpm supabase stop
   docker system prune -f
   pnpm supabase start
   pnpm supabase:db:reset
   ```

### Prevention
- Keep Docker Desktop running during development
- Allocate at least 4 GB RAM to Docker

---

## Migration failures

### Symptoms
- `pnpm supabase:db:reset` fails with SQL errors
- `already exists` errors during migration application
- `relation does not exist` errors

### Root cause
Migrations contain non-idempotent statements or depend on objects not yet created.

### Diagnosis
```bash
# Check which migrations are applied
pnpm supabase migration list --local

# View specific migration
cat supabase/migrations/<timestamp>_<name>.sql
```

### Fixes

| Error | Fix |
|-------|-----|
| `relation already exists` | Add `IF NOT EXISTS` to `CREATE TABLE` |
| `column already exists` | Wrap in `DO $$ BEGIN ... EXCEPTION ... END $$` |
| `function already exists` | Use `CREATE OR REPLACE FUNCTION` |
| `permission denied` | Check the migration runs as the correct role |
| `deadlock detected` | Retry; simplify concurrent operations |

**Full recovery:**
```bash
pnpm supabase:local:recover
```

### Prevention
- Always use idempotent SQL (`IF NOT EXISTS`, `CREATE OR REPLACE`)
- Test migrations locally before committing
- One concern per migration file

---

## Slow queries

### Symptoms
- API calls take >2 seconds
- Web app feels sluggish
- Database CPU spikes

### Diagnosis
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
EXPLAIN ANALYZE SELECT * FROM lenses WHERE owner_id = '<uuid>';
```

### Fixes
1. **Add indexes:**
   ```sql
   CREATE INDEX idx_lenses_owner_id ON public.lenses(owner_id);
   ```

2. **Optimize queries** — use `.select('id, name')` instead of `.select('*')`

3. **Check RLS policy performance** — complex `USING` clauses in RLS can cause sequential scans

### Prevention
- Index all foreign key columns
- Monitor `pg_stat_statements` regularly
- Profile queries during development with `EXPLAIN ANALYZE`

---

## Type generation failures

### Symptoms
- `pnpm supabase gen types typescript` produces errors
- Generated types are empty or incomplete
- TypeScript errors after schema changes

### Fixes
1. Ensure Supabase is running: `pnpm supabase status`
2. Reset and retry:
   ```bash
   pnpm supabase:db:reset
   pnpm supabase gen types typescript --local > libs/types/src/lib/database.types.ts
   ```
3. Check for syntax errors in recent migrations

---

## Data integrity issues

### Symptoms
- Orphaned records after deletions
- Foreign key constraint violations
- Duplicate entries

### Fixes
1. **Check foreign keys:**
   ```sql
   SELECT * FROM lenses WHERE owner_id NOT IN (SELECT id FROM lensers);
   ```

2. **Fix orphans:**
   ```sql
   DELETE FROM lenses WHERE owner_id NOT IN (SELECT id FROM lensers);
   ```

3. **Add cascading deletes** to foreign keys:
   ```sql
   ALTER TABLE lenses DROP CONSTRAINT lenses_owner_id_fkey;
   ALTER TABLE lenses ADD CONSTRAINT lenses_owner_id_fkey
     FOREIGN KEY (owner_id) REFERENCES lensers(id) ON DELETE CASCADE;
   ```

### Prevention
- Use `ON DELETE CASCADE` for parent-child relationships
- Add check constraints for business rules
- Test deletion scenarios

---

## Next steps

- [Auth Issues](/en/tutorials/troubleshooting/auth-issues)
- [Workflow Issues](/en/tutorials/troubleshooting/workflow-issues)
- [Local Database](/en/tutorials/local/database)
