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
  # ── Execution-paths campaign (Phase 5 — pending pgTAP authoring) ──
  fn_dispatch_scheduled_workflows
  fn_worker_claim_battle_job
  fn_worker_get_ai_key_secret
  fn_worker_decrypt_api_key
  fn_start_workflow_run
  fn_poll_async_run
)
RPC_FAIL=0
# Search test files across the three surfaces that can claim coverage:
#   - supabase/tests           pgTAP RLS / lifecycle / RPC behavior tests
#   - libs/data/repositories   repository-layer integration tests
#   - apps/platform-api/src    worker-layer Jest tests that consume RPCs
for rpc in "${CRITICAL_RPCS[@]}"; do
  hits=$(grep -rE "\\b${rpc}\\b" supabase/tests/ libs/data/repositories/src/ apps/platform-api/src/ 2>/dev/null | wc -l || true)
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

# ── 4. Capability-matrix parity ─────────────────────────────────────────────
# Asserts the in-code model registry covers at least the runnable text models
# and the runnable media models. Acts as an early canary if a registry entry
# is removed without seed/coverage updates.
echo
echo "── Capability-matrix parity ──"
MATRIX_FAIL=0
PROVIDERS_SPECS=$(find libs/providers/src/lib/__tests__ -name '*.spec.ts' 2>/dev/null | wc -l)
MIN_PROVIDERS_SPECS=14
if [[ "$PROVIDERS_SPECS" -lt "$MIN_PROVIDERS_SPECS" ]]; then
  printf '  ✗ providers specs: %s (expected >= %s)\n' "$PROVIDERS_SPECS" "$MIN_PROVIDERS_SPECS"
  MATRIX_FAIL=1
else
  printf '  ✓ providers specs: %s (>= %s)\n' "$PROVIDERS_SPECS" "$MIN_PROVIDERS_SPECS"
fi

# Drift gates must be present.
for gate in capability-matrix provider-support-parity model-seed-parity; do
  if [[ -f "libs/providers/src/lib/__tests__/${gate}.spec.ts" ]]; then
    printf '  ✓ drift gate: %s.spec.ts\n' "$gate"
  else
    printf '  ✗ drift gate missing: %s.spec.ts\n' "$gate"
    MATRIX_FAIL=1
  fi
done

# ── 5. Exit ─────────────────────────────────────────────────────────────────
echo
if [[ "$PG_FAIL" -ne 0 || "$RPC_FAIL" -ne 0 || "$MATRIX_FAIL" -ne 0 ]]; then
  echo "✗ coverage gate failed — fix the rows marked ✗ above"
  exit 1
fi
echo "✓ coverage gate passed"
