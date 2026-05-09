#!/usr/bin/env bash
# Phase 9 fresh-clone smoke test. Run this after `pnpm install --frozen-lockfile`.
#
# Steps:
#   1. supabase start                         (idempotent — skipped if already running)
#   2. pnpm supabase:db:reset                 (regenerates seed.sql + applies it)
#   3. pnpm nx test cli --testPathPatterns="run.spec.ts"
#   4. pnpm nx run-many -t test -p gateway,infra-gateway,util-signing,util-keychain
#   5. pnpm nx build cli
#   6. pnpm nx run gateway:build && pnpm nx run gateway:build-init
#   7. lf run exec --dry-run                  (credentialless)
#   8. lf gateway doctor --check daemon,transport --json
#   9. pnpm nx run web:build                  (verify the web app compiles)
#
# Exit code 0 means the local environment is configured well enough to PR.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "==> [1/9] supabase start"
if command -v supabase >/dev/null 2>&1; then
  supabase start || true
else
  echo "    supabase CLI not installed — skipping db steps. Install: https://supabase.com/docs/guides/cli"
  SKIP_DB=1
fi

if [[ -z "${SKIP_DB:-}" ]]; then
  echo "==> [2/9] supabase db reset (regenerates seed.sql)"
  pnpm supabase:db:reset
  echo "==> [2b/9] supabase db test"
  supabase db test --db-url "${LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
else
  echo "==> [2/9] db reset — skipped"
fi

echo "==> [3/9] CLI dry-run unit test"
pnpm nx test cli --testPathPatterns="run.spec.ts"

echo "==> [4/9] gateway unit tests"
pnpm nx run-many -t test -p gateway,infra-gateway,util-signing,util-keychain

echo "==> [5/9] build CLI"
pnpm nx build cli

echo "==> [6/9] build gateway daemon + init"
pnpm nx run gateway:build
pnpm nx run gateway:build-init

echo "==> [7/9] lf run exec --dry-run (credentialless)"
unset OPENAI_API_KEY ANTHROPIC_API_KEY GOOGLE_API_KEY MISTRAL_API_KEY || true
node dist/apps/cli/main.js run exec \
  --prompt "hello" \
  --model "gpt-4o-mini" \
  --dry-run

echo "==> [8/9] lf gateway doctor --check daemon,transport"
SUPABASE_SERVICE_ROLE_KEY="" \
SUPABASE_URL="${SUPABASE_URL:-https://example.supabase.co}" \
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-ci-anon-key-placeholder}" \
LF_GATEWAY_KEY_FILE_FALLBACK=1 \
node dist/apps/cli/main.js gateway doctor --check daemon,transport --json

echo "==> [9/9] web build"
pnpm nx run web:build

echo
echo "✓ smoke complete — local environment is ready"
