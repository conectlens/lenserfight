---
title: Writing Tests for a Feature
description: A complete guide to testing in the LenserFight monorepo — unit tests with Vitest, database tests with pgTAP, RLS policy tests, and the smoke gate.
head:
  - - meta
    - name: og:title
      content: Writing Tests for a Feature — LenserFight Advanced
  - - meta
    - name: og:description
      content: Learn how to write unit tests, pgTAP database tests, and RLS policy tests for LenserFight features.
---

# Writing Tests for a Feature

## Goal

Write and run tests for a new LenserFight feature at each applicable layer: TypeScript unit tests (Vitest), PostgreSQL logic tests (pgTAP), and RLS policy tests — then confirm the full smoke gate passes.

---

## Prerequisites

- [Local Installation](/en/tutorials/local/installation) completed with Supabase mode
- [Local Development Workflow](/en/tutorials/local/development-workflow) read
- Docker running and `pnpm supabase start` healthy
- The feature you want to test already exists in source

---

## Expected Result

- Your feature has a `*.spec.ts` test file with passing tests
- If your feature touches the database, it has a pgTAP test file in `supabase/tests/`
- `pnpm smoke` exits 0

---

## Test Layers

LenserFight tests are organized into four independent layers. Use the smallest layer that covers the risk:

| Layer | Command | What it covers |
|-------|---------|----------------|
| **Unit** (Vitest) | `pnpm nx test <project>` | TypeScript functions, classes, runner logic |
| **Build** | `pnpm nx run <project>:build` | Type errors, import resolution |
| **Database** (pgTAP) | `pnpm test:db` | SQL functions, triggers, constraints |
| **RLS** | `pnpm test:rls` | Row-level security policies |
| **Smoke** | `pnpm smoke` | Full stack: DB reset + CLI build + key commands |

---

## Step 1: Write a Unit Test

Unit tests live alongside the source file they test, using the `*.spec.ts` naming convention.

### Example: Testing a Workflow Node Runner

If you added `libs/infra/execution/src/lib/runners/my-node.runner.ts`, create:

```
libs/infra/execution/src/lib/runners/my-node.runner.spec.ts
```

Vitest is the test runner. Structure your tests as:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { MyNodeRunner } from './my-node.runner'
import type { NodeRunnerContext } from './node-runner.interface'

function makeCtx(overrides: Partial<NodeRunnerContext> = {}): NodeRunnerContext {
  return {
    nodeId: 'test-node',
    upstreamOutputs: new Map(),
    resolvedParams: {},
    nodeConfig: {},
    signal: undefined,
    ...overrides,
  }
}

describe('MyNodeRunner', () => {
  const runner = new MyNodeRunner()

  it('declares the correct node type', () => {
    expect(runner.nodeType).toBe('my_node_type')
  })

  it('returns expected output for valid config', async () => {
    const ctx = makeCtx({
      nodeConfig: { greeting: 'Hello' },
    })
    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('Hello, World!')
    expect(result.output.mediaType).toBe('text')
  })

  it('returns error output when required config is missing', async () => {
    const ctx = makeCtx({ nodeConfig: {} })
    const result = await runner.execute(ctx)
    expect(result.output.data?.error).toBeDefined()
  })

  it('reads upstream output from a connected node', async () => {
    const upstreamOutputs = new Map([
      ['upstream-node', { mediaType: 'text' as const, text: 'upstream value', durationMs: 0 }],
    ])
    const ctx = makeCtx({ upstreamOutputs })
    const result = await runner.execute(ctx)
    // assert that the upstream value was used
    expect(result.output.text).toContain('upstream value')
  })

  it('respects the AbortSignal', async () => {
    const controller = new AbortController()
    controller.abort()
    const ctx = makeCtx({ signal: controller.signal })
    // your runner should check signal.aborted and reject or return early
    await expect(runner.execute(ctx)).rejects.toThrow()
  })
})
```

### Run the tests

```bash
# Run a single spec file (fastest)
pnpm nx test infra-execution --testPathPattern="my-node.runner.spec" --no-coverage

# Run all tests in a project
pnpm nx test infra-execution --no-coverage

# Watch mode during development
pnpm nx test infra-execution --watch --testPathPattern="my-node.runner.spec"
```

### Unit test checklist

Before marking tests done, cover:

- [ ] Happy path: valid inputs produce expected output
- [ ] Missing required config: returns a graceful error, does not throw
- [ ] Empty upstream outputs map: does not crash
- [ ] Invalid input types: handled without unhandled exceptions
- [ ] AbortSignal (if the runner is async): respected
- [ ] Output shape: `mediaType`, `text` or `data`, `durationMs` are all present

---

## Step 2: Write a Database Test (pgTAP)

If your feature adds or modifies SQL — a table, function, trigger, or constraint — add a pgTAP test.

### File location

pgTAP tests live in:

```
supabase/tests/
```

Naming convention: `NN_descriptive_name.sql` (use the next available two-digit prefix).

### Example: Testing a new SQL function

```sql
-- supabase/tests/99_my_feature.sql
BEGIN;

SELECT plan(4);

-- 1. Function exists
SELECT has_function('public', 'fn_my_feature', ARRAY['uuid'], 'fn_my_feature exists');

-- 2. Returns the expected type
SELECT function_returns('public', 'fn_my_feature', ARRAY['uuid'], 'text', 'fn_my_feature returns text');

-- 3. Returns correct value for known input
SELECT is(
  fn_my_feature('a0000000-0000-0000-0000-000000000001'::uuid),
  'expected result',
  'fn_my_feature returns expected result for known UUID'
);

-- 4. Returns NULL for unknown input
SELECT is(
  fn_my_feature('00000000-0000-0000-0000-000000000000'::uuid),
  NULL,
  'fn_my_feature returns NULL for unknown UUID'
);

SELECT * FROM finish();
ROLLBACK;
```

Key pgTAP conventions:

- Always wrap in `BEGIN; ... ROLLBACK;` — tests must not change database state.
- Call `SELECT plan(N);` with the exact number of assertions.
- Use `SELECT * FROM finish();` at the end.

### Run the database tests

```bash
# All pgTAP tests
pnpm test:db

# Only RLS tests
pnpm test:rls

# Verbose output to see individual assertions
pnpm test:db 2>&1 | head -100
```

The scripts call `supabase/tests/` through the running local Supabase instance. Supabase must be running (`pnpm supabase start`) before executing `pnpm test:db`.

---

## Step 3: Write an RLS Policy Test

RLS tests verify that each role (anon, authenticated owner, authenticated non-owner, service role) can only access the rows they are permitted to see.

### Structure

RLS test files conventionally test four scenarios per operation:

```sql
-- supabase/tests/rls/NN_my_table_rls.sql
BEGIN;

SELECT plan(8);

-- Establish test users
SELECT set_config('request.jwt.claims', '{"sub": "user-a-uuid", "role": "authenticated"}', true);

-- 1. Owner can SELECT their own row
SELECT ok(
  EXISTS(SELECT 1 FROM public.my_table WHERE owner_id = 'user-a-uuid'::uuid),
  'owner can select own row'
);

-- 2. Owner can INSERT
INSERT INTO public.my_table (owner_id, content) VALUES ('user-a-uuid'::uuid, 'test');
SELECT ok(FOUND, 'owner can insert');

-- Switch to a different user (non-owner)
SELECT set_config('request.jwt.claims', '{"sub": "user-b-uuid", "role": "authenticated"}', true);

-- 3. Non-owner cannot SELECT owner's private row
SELECT is(
  (SELECT COUNT(*) FROM public.my_table WHERE owner_id = 'user-a-uuid'::uuid AND visibility = 'private'),
  0::bigint,
  'non-owner cannot see private rows'
);

-- 4. Non-owner can SELECT public rows
SELECT ok(
  EXISTS(SELECT 1 FROM public.my_table WHERE visibility = 'public'),
  'non-owner can see public rows'
);

-- ... etc for UPDATE, DELETE, anon, service_role ...

SELECT * FROM finish();
ROLLBACK;
```

Run only RLS tests:

```bash
pnpm test:rls
```

---

## Step 4: Test the CLI (if applicable)

If your feature added or changed a CLI command, verify it builds and runs without crashing:

```bash
# Build the CLI
pnpm nx run cli:build

# Run the command in dry-run mode (no API keys needed)
node dist/apps/cli/main.js <your-command> --help
```

The smoke script builds the CLI and runs `lf run exec --dry-run` as a baseline check. Passing smoke confirms the CLI is importable and the basic command dispatch works.

---

## Step 5: Run the Smoke Gate

The smoke gate is the required pre-PR validation:

```bash
pnpm smoke
```

This script:

1. Resets the local Supabase database (`supabase db reset`)
2. Runs CLI unit tests
3. Builds the CLI binary
4. Runs `lf run exec --dry-run` (validates command dispatch without AI keys)
5. Builds the web app

If any step fails, `pnpm smoke` exits non-zero and prints the failing step. Fix the failing step before opening a PR — the same check runs in CI (`.github/workflows/cli-smoke.yml`).

---

## Verify It Works

All of the following should pass:

```bash
# Project unit tests
pnpm nx test infra-execution --no-coverage
# → All test suites passed

# Database tests (requires Supabase running)
pnpm test:db
# → All N tests passed

# Full smoke gate
pnpm smoke
# → exit 0
```

---

## Common Issues

### Issue: `Cannot find module '@lenserfight/...'`

**Cause**: The Nx path alias for the library is not registered in the test config.

**Fix**: Check `tsconfig.spec.json` for the project and verify it extends `tsconfig.base.json`. If the library was recently created, run `pnpm nx reset` to clear the module resolution cache.

---

### Issue: pgTAP test count mismatch

**Symptom**: `Looks like you planned 4 tests but ran 5.`

**Cause**: The `plan(N)` count does not match the number of assertions.

**Fix**: Count every `ok()`, `is()`, `has_function()`, `function_returns()`, etc. and update `plan(N)`.

---

### Issue: `pnpm test:db` exits with "Cannot connect"

**Cause**: Supabase is not running.

**Fix**:
```bash
pnpm supabase start
pnpm test:db
```

---

### Issue: `pnpm smoke` fails at the DB reset step

**Cause**: A migration has a syntax error or a dependency conflict.

**Fix**: Run `pnpm supabase:db:reset` directly to see the full migration error, fix the SQL, then retry smoke.

---

### Issue: RLS test rows are visible to non-owner

**Cause**: The `USING` clause on the RLS policy has a logic error, or `ENABLE ROW LEVEL SECURITY` was not called on the table.

**Fix**:
1. Verify `ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;` is in the migration.
2. In Supabase Studio, run `SELECT * FROM pg_policies WHERE tablename = 'my_table';` to list active policies.
3. Test the `USING` expression manually: `SELECT <your-using-clause> FROM my_table;`

---

## Related Docs

- [Contributing a Workflow Node](/en/how-to/contributors/workflow-node-contribution-guide)
- [Local Database & Storage](/en/tutorials/local/database)
- [RLS Reference](/en/reference/database/rls-reference)
- [Development Setup](/en/how-to/contributors/development-setup)

## Next Steps

- [Debugging the CLI](/en/tutorials/advanced/debugging-the-cli) — diagnose CLI errors before filing a bug report
- [Opening Your First PR](/en/how-to/contributors/first-pr) — submit your tested feature
