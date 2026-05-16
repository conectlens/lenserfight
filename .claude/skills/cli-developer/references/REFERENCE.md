# CLI Developer — Reference

## Command file pattern (citty)

Each command group uses `defineCommand` from **citty** with nested `subCommands`:

```typescript
import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson } from '../utils/output';

const list = defineCommand({
  meta: { name: 'list', description: 'List examples.' },
  args: {
    json: { type: 'boolean', default: false, description: 'Output as JSON' },
  },
  async run({ args }) {
    try {
      const rows = await callRpc('fn_list_examples', {});
      if (args.json) printJson(rows);
      else printTable(['ID', 'Name'], rows.map((r) => [r.id, r.name]));
    } catch (err) {
      handleError(err);
    }
  },
});

export default defineCommand({
  meta: { name: 'example', description: 'Example commands.' },
  subCommands: { list },
});
```

## Registration in main.ts

Lazy-import each command group so startup time stays low:

```typescript
const main = defineCommand({
  meta: { name: 'lenserfight', version: readCliVersion() },
  subCommands: {
    example: () => import('./commands/example').then((m) => m.default),
  },
});

runMain(main);
```

## API client usage

```typescript
import { callRpc, handleError } from '../utils/api';

// Call a Supabase RPC function
const data = await callRpc('fn_get_battle', { battle_id: id });

// Always wrap in try/catch and delegate to handleError
try {
  const result = await callRpc('fn_create_battle', { title });
} catch (err) {
  handleError(err);
}
```

## Output formatting

```typescript
import { printTable, printJson, truncate } from '../utils/output';
import consola from 'consola';

// Tabular output
printTable(['ID', 'Title', 'Status'], rows.map((r) => [r.id, r.title, r.status]));

// JSON output (for --json flag)
printJson(data);

// Logging
consola.success('Battle created.');
consola.warn('No battles found.');
consola.error('Unexpected error.');
```

## ANSI / styling

```typescript
import { A, sym } from '../utils/ansi';

consola.log(`${sym.ok} ${A.green('Done')}`);
consola.log(`${sym.warn} ${A.yellow('Warning')}`);
```

## Auth and Supabase client

```typescript
import { requireAuth } from '../utils/auth';
import { getSupabaseClient } from '../utils/supabase-client';

// In a command's run():
const session = await requireAuth();
const supabase = getSupabaseClient();
```

## Local / debug mode

```typescript
import { getExecContext } from '../lib/exec-context';

const ctx = getExecContext();
if (ctx.local) { /* use local gateway */ }
if (ctx.debug) { /* extra logging */ }
```

## Build and test

- Build: `pnpm nx build cli`
- Test (targeted): `pnpm nx test cli --testFile=src/commands/battle.spec.ts`
- Lint: `pnpm nx lint cli`
- Type-check: `pnpm nx typecheck cli`

> **Never** run `pnpm nx test cli` without a `--testFile` filter — the full suite is too large for a single shot.
