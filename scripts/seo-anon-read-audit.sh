#!/usr/bin/env bash
# =============================================================================
# SEO anon read audit
# -----------------------------------------------------------------------------
# Verifies, as the anonymous role, that:
#   (A) the sitemap LIST functions exist and return public rows, and
#   (B) each per-entity DETAIL read path used by the bot-render Worker is
#       anon-callable (Phase 2 dependency).
#
# Runs in the USER ENV (the build sandbox cannot reach the DB).
#
# Usage:
#   bash scripts/seo-anon-read-audit.sh
#   DB_URL=postgres://postgres:postgres@127.0.0.1:54322/postgres bash scripts/seo-anon-read-audit.sh
#
# Default DB_URL targets the local Supabase stack (supabase start).
# =============================================================================
set -euo pipefail

DB_URL="${DB_URL:-postgres://postgres:postgres@127.0.0.1:54322/postgres}"

if ! command -v psql >/dev/null 2>&1; then
  echo "[audit] psql not found on PATH" >&2
  exit 1
fi

run_as_anon() {
  # Executes SQL with the anon role + a claimless JWT context (no authenticated
  # viewer), mirroring how the edge Worker calls Supabase with the anon key.
  local sql="$1"
  psql "$DB_URL" -X -A -t -v ON_ERROR_STOP=1 <<SQL
SET ROLE anon;
SELECT set_config('request.jwt.claims', NULL, false);
${sql}
RESET ROLE;
SQL
}

section() { printf '\n=== %s ===\n' "$1"; }

section "A. Sitemap LIST functions (must return public counts as anon)"
for fn in \
  "fn_list_public_lenses()" \
  "fn_list_public_battles()" \
  "fn_list_public_lensers()" \
  "fn_list_public_workflows()" \
  "fn_list_public_threads()" \
  "fn_list_public_rays()"
do
  count="$(run_as_anon "SELECT count(*) FROM public.${fn};" 2>&1 || true)"
  printf '  %-32s public rows: %s\n' "$fn" "$count"
done

recent="$(run_as_anon "SELECT count(*) FROM public.fn_list_recent_public(now() - interval '48 hours');" 2>&1 || true)"
printf '  %-32s rows: %s\n' "fn_list_recent_public(48h)" "$recent"

section "B. Per-entity DETAIL read paths (anon must read a public row — Phase 2)"
# Pull one representative key from each list fn, then attempt the detail read.
probe_detail() {
  local label="$1" list_fn="$2" detail_sql_template="$3"
  local key
  key="$(run_as_anon "SELECT entity_key FROM public.${list_fn} LIMIT 1;" 2>/dev/null || true)"
  if [[ -z "$key" ]]; then
    printf '  %-10s no public row to probe (empty list)\n' "$label"
    return
  fi
  local sql="${detail_sql_template//__KEY__/$key}"
  local ok
  ok="$(run_as_anon "SELECT CASE WHEN EXISTS (${sql}) THEN 'YES' ELSE 'NO' END;" 2>&1 || echo 'ERROR')"
  printf '  %-10s key=%-38s anon-readable: %s\n' "$label" "$key" "$ok"
}

probe_detail "lens"     "fn_list_public_lenses()"   "SELECT 1 FROM public.fn_get_lens_detail_bootstrap('__KEY__'::uuid)"
probe_detail "battle"   "fn_list_public_battles()"  "SELECT 1 FROM public.fn_get_battle_by_slug('__KEY__')"
probe_detail "lenser"   "fn_list_public_lensers()"  "SELECT 1 FROM public.fn_get_lenser_profile_full('__KEY__')"
probe_detail "workflow" "fn_list_public_workflows()" "SELECT 1 FROM public.fn_get_workflow_detail('__KEY__'::uuid)"
probe_detail "thread"   "fn_list_public_threads()"  "SELECT 1 FROM public.fn_get_thread_replies_page('__KEY__'::uuid, 1, 0)"
probe_detail "ray"      "fn_list_public_rays()"     "SELECT 1 FROM public.fn_content_tags_get_by_slug('__KEY__')"

cat <<'NOTE'

Interpretation:
  - Section A counts of 0 usually mean the local DB has no seeded public rows of
    that type (seed it, or run against the linked staging DB) — not necessarily a
    permission gap. A permission gap surfaces as an ERROR/permission-denied line.
  - Section B "NO"/"ERROR" for threads or workflows is the expected gap the plan
    Phase 0 Task 0.2 closes with fn_get_thread_public / fn_get_workflow_public.
    Record those results in docs/superpowers/plans/seo-anon-audit-results.md.
NOTE
