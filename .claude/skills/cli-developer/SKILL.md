---
name: cli-developer
description: Review, modify, and improve the LenserFight CLI at apps/cli/. Covers citty commands, API client integration, output formatting, TUI, and configuration.
---

Work on the LenserFight CLI (`lf`).

## Scope

- Source: `apps/cli/src/**`
- Commands: `apps/cli/src/commands/*.ts`
- Utilities: `apps/cli/src/utils/` (api, output, auth, auth-recovery, ansi, error-reporter, profiles, supabase-client, automation-objects, battle-stream-broadcaster, local-battle-engine, local-battle-paths, local-battle-storage)
- Libraries: `apps/cli/src/lib/` (exec-context, safety, telemetry, redact, onboarding, combine-seeds)
- TUI: `apps/cli/src/tui/` (dashboard, labyrinth, rooms, runtime-telemetry)
- Adapters: `apps/cli/src/adapters/`

## CLI Structure

- `src/main.ts` — entry point, uses `defineCommand` + `runMain` from **citty**; binary name is `lenserfight` / `lf`
- Each command file exports a `defineCommand(...)` default and is lazy-imported in `main.ts`
- `src/utils/api.ts` — `callRpc` + `handleError`; all Supabase RPC calls go through here
- `src/utils/output.ts` — `printTable`, `printJson`, `truncate`; uses **consola** for logging
- `src/utils/auth.ts` + `src/utils/supabase-client.ts` — auth and Supabase client
- `src/utils/ansi.ts` — ANSI helper `A` and symbols `sym`
- `src/lib/exec-context.ts` — `setExecContext` / `getExecContext` for `--local` / `--debug` flags
- `src/lib/safety/` — `assertSafe` for input validation
- `src/lib/telemetry.ts` — telemetry adapter

## Command pattern

```typescript
import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson } from '../utils/output';

const subCommand = defineCommand({
  meta: { name: 'list', description: 'List items.' },
  args: {
    json: { type: 'boolean', default: false, description: 'Output as JSON' },
  },
  async run({ args }) {
    try {
      const data = await callRpc('fn_example', {});
      if (args.json) printJson(data);
      else printTable(['ID', 'Name'], data.map((r) => [r.id, r.name]));
    } catch (err) {
      handleError(err);
    }
  },
});

export default defineCommand({
  meta: { name: 'example', description: 'Example group.' },
  subCommands: { list: subCommand },
});
```

## Registration in main.ts

```typescript
const main = defineCommand({
  subCommands: {
    example: () => import('./commands/example').then((m) => m.default),
  },
});
```

## Global flags

- `--local` → sets `LF_LOCAL=1` (parsed early via `parseGlobalFlagsEarly` before citty)
- `--debug` → sets `LF_DEBUG=1`
- Default (`lf` with no subcommand) → opens interactive TUI dashboard

## Constraints

- Never use fetch/axios directly — use `callRpc` / `handleError` from `utils/api.ts`
- Never add NestJS, Prisma, or backend dependencies
- Keep dependency footprint minimal (citty, consola, dotenv)
- Output via `printTable` / `printJson` / `consola.*` — never raw `console.log`
- Build: `pnpm nx build cli` | Test: `pnpm nx test cli`

## References

- citty patterns and integration details: [REFERENCE.md](references/REFERENCE.md)
