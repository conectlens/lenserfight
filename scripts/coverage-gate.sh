#!/usr/bin/env bash
# Phase BO — pre-launch test coverage gate.
#
# Crawls supabase/tests/*.sql and counts plan(N) totals to verify each pgTAP
# suite declares an expected plan. Crawls libs/data/repositories/src for spec
# files and reports per-surface coverage. Exits non-zero if either of:
#   - a *.sql test file has no plan() declaration
#   - a critical RPC (listed in CRITICAL_RPCS) has zero references in tests
#
# Output is a fixed-width table — no `jq` dependency, no `node`.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# ── 1. pgTAP plan counts ────────────────────────────────────────────────────
echo "── pgTAP plans ──"
PG_FAIL=0
TOTAL_PG_TESTS=0
shopt -s nullglob
for f in supabase/tests/*.sql; do
  plan=$(grep -oE 'plan\([0-9]+\)' "$f" | head -1 | tr -d 'plan()')
  if [[ -z "$plan" ]]; then
    printf '  ✗ %-50s  no plan() declared\n' "$(basename "$f")"
    PG_FAIL=1
  else
    printf '  ✓ %-50s  plan(%s)\n' "$(basename "$f")" "$plan"
    TOTAL_PG_TESTS=$((TOTAL_PG_TESTS + plan))
  fi
done
echo "  → ${TOTAL_PG_TESTS} pgTAP assertions across $(ls supabase/tests/*.sql | wc -l) files"

# ── 2. Critical-RPC coverage ────────────────────────────────────────────────
echo
echo "── Critical RPC coverage ──"
CRITICAL_RPCS=(
  fn_submit_vote
  fn_battles_create_from_template
  fn_battles_finalize
  fn_battles_change_vote
  fn_battles_get_my_vote
  fn_check_media_quality
  fn_log_model_test_run
  fn_battles_render_prompt
  fn_browse_battles
  fn_battles_create
  fn_decide_moderation_override
  fn_dispatch_webhook_outbox
  fn_compute_elo_after_battle
  fn_battles_next_recommendation
)
RPC_FAIL=0
for rpc in "${CRITICAL_RPCS[@]}"; do
  hits=$(grep -rE "\\b${rpc}\\b" supabase/tests/ libs/data/repositories/src/ 2>/dev/null | wc -l || true)
  if [[ "$hits" -eq 0 ]]; then
    printf '  ✗ %-40s  no test references\n' "$rpc"
    RPC_FAIL=1
  else
    printf '  ✓ %-40s  %s refs\n' "$rpc" "$hits"
  fi
done

# ── 3. Repository spec line totals ──────────────────────────────────────────
echo
echo "── Repository specs ──"
spec_count=$(find libs/data/repositories/src -name '*.spec.ts' | wc -l)
spec_lines=$(find libs/data/repositories/src -name '*.spec.ts' -exec wc -l {} + | tail -1 | awk '{print $1}')
echo "  ${spec_count} spec files, ${spec_lines} total lines"

# ── 4. Exit ─────────────────────────────────────────────────────────────────
echo
if [[ "$PG_FAIL" -ne 0 || "$RPC_FAIL" -ne 0 ]]; then
  echo "✗ coverage gate failed — fix the rows marked ✗ above"
  exit 1
fi
echo "✓ coverage gate passed"
