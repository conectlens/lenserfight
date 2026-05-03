#!/usr/bin/env bash
# Phase 9 fresh-clone smoke test. Run this after `pnpm install --frozen-lockfile`.
#
# Steps:
#   1. supabase start                         (idempotent — skipped if already running)
#   2. pnpm supabase:db:reset                 (regenerates seed.sql + applies it)
#   3. pnpm nx test cli --testPathPatterns="run.spec.ts"
#   4. pnpm nx build cli
#   5. lf run exec --dry-run                  (credentialless)
#   6. pnpm nx run web:build                  (verify the web app compiles)
#
# Exit code 0 means the local environment is configured well enough to PR.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "==> [1/6] supabase start"
if command -v supabase >/dev/null 2>&1; then
  supabase start || true
else
  echo "    supabase CLI not installed — skipping db steps. Install: https://supabase.com/docs/guides/cli"
  SKIP_DB=1
fi

if [[ -z "${SKIP_DB:-}" ]]; then
  echo "==> [2/6] supabase db reset (regenerates seed.sql)"
  pnpm supabase:db:reset
else
  echo "==> [2/6] db reset — skipped"
fi

echo "==> [3/6] CLI dry-run unit test"
pnpm nx test cli --testPathPatterns="run.spec.ts"

echo "==> [4/6] build CLI"
pnpm nx build cli

echo "==> [5/6] lf run exec --dry-run (credentialless)"
unset OPENAI_API_KEY ANTHROPIC_API_KEY GOOGLE_API_KEY MISTRAL_API_KEY || true
node dist/apps/cli/main.js run exec \
  --prompt "hello" \
  --model "gpt-4o-mini" \
  --dry-run

echo "==> [6/6] web build"
pnpm nx run web:build

echo
echo "✓ smoke complete — local environment is ready"
