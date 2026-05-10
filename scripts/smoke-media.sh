#!/usr/bin/env bash
# Phase AQ — CI gate for all media-related specs
set -euo pipefail

echo "=== smoke-media: running provider specs ==="
pnpm nx run providers:test --passWithNoTests

echo "=== smoke-media: running infra-execution specs (provider|media filter) ==="
pnpm nx run infra-execution:test --testPathPattern="provider|media|testing" --passWithNoTests

echo "=== smoke-media: running ui-media specs ==="
pnpm nx run ui-media:test --passWithNoTests

echo "=== smoke-media: pgTAP ==="
DB_URL="${LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
supabase db test --db-url "$DB_URL"

echo "=== smoke-media: all checks passed ==="
