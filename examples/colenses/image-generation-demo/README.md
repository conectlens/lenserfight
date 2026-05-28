# Image Generation Demo (Phase AK)

Single-node colens that produces an image via `fal-ai/flux/dev` and lands a
`media.objects` row in the `generated-media` bucket.

## Prerequisites

- Local Supabase running (`pnpm supabase start`).
- Migrations applied through `20270520200000_phase_ak_storage_buckets_and_media_finalize.sql`.
- A FAL API key in your platform-api env: `FAL_KEY=…`.

## Files

- `COLENS.MD` — declarative colens definition (frontmatter + DAG).
- `seed.sql` — idempotent seed that inserts the colens as the seeded Alice
  profile (`b2000000-…-0001`). Reuses the same id so re-runs are no-ops.

## Run it

Validate and simulate the file-first object without calling FAL:

```bash
pnpm nx run cli:build
node dist/apps/cli/main.js colens run examples/colenses/image-generation-demo/COLENS.MD \
  --inputs '{"prompt":"a dragonfly resting on a fern, studio lighting"}'
```

Run the full Supabase-backed media flow:

```bash
# 1. Apply the seed
psql "$LOCAL_SUPABASE_DB_URL" -f examples/colenses/image-generation-demo/seed.sql

# 2. Trigger the colens through the platform colens runner
lf run --colens d10adea1-1eee-4eee-aeee-000000000ak1 \
  --inputs '{"prompt":"a dragonfly resting on a fern, studio lighting"}'

# 3. Inspect the resulting media object
lf media list --run <run-id-from-step-2>

# 4. Download via media-proxy
lf media download --id <media-object-id> --out /tmp/out.png
```

## What this exercises

- `execution.fn_run_lens` (or colens runner) → creates `execution.runs`.
- `FalAIProvider.execute` → produces an external URL.
- The platform-api worker downloads the URL, calls `uploadToGeneratedMedia`,
  then `execution.fn_media_finalize_sync_upload` to write `media.objects`.
- `lf media list` → reads via PostgREST under RLS.
- `lf media download` → hits `/v1/media/:objectId` for a 1-hour signed URL.

## Acceptance gates (AK)

- `media.objects` row exists with `bucket = 'generated-media'` and
  `lifecycle_state = 'active'`.
- `pnpm test:db` passes (incl. `09_rls_media.sql`).
- `pnpm nx test execution` passes (incl. `fal-ai.provider.spec.ts`).
