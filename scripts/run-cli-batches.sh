#!/usr/bin/env bash
# Memory-bounded CLI test runner.
#
# `pnpm nx test cli` in one shot OOMs (~21 spec files, several large e2e). This
# script runs six narrow batches sequentially, each with a 2GB heap cap and an
# independent jest worker pool. Aggregated pass/fail at the end.
#
# Usage:
#   bash scripts/run-cli-batches.sh                # run every batch
#   bash scripts/run-cli-batches.sh A C            # run only batches A and C
#   BATCH_HEAP_MB=3072 bash scripts/run-cli-batches.sh
#
# Each batch is a jest --testPathPattern regex. Add new specs to the matching
# regex below — keep batches at ~10 specs to stay under the heap cap.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

HEAP_MB="${BATCH_HEAP_MB:-2048}"

declare -A BATCHES=(
  [A]="(execution|run|completion|evaluate|ai)\\.spec\\.ts"
  [B]="(battle|battle-moderation|approval|leaderboard)\\.spec\\.ts"
  [C]="(automation|schedule|connectors|gateway)\\.spec\\.ts"
  [D]="(byok|providers|models|security)\\.spec\\.ts"
  [E]="(admin|profile|team|communities|analytics)\\.spec\\.ts"
  [F]="(lenses|inspect|export|import|publish|template|tool)\\.spec\\.ts"
)

# Stable, alphabetic order for default invocation.
DEFAULT_ORDER=(A B C D E F)

if [[ $# -gt 0 ]]; then
  REQUESTED=("$@")
else
  REQUESTED=("${DEFAULT_ORDER[@]}")
fi

PASSED=()
FAILED=()
SKIPPED=()

echo "── CLI batches (heap=${HEAP_MB}MB) ──"
for key in "${REQUESTED[@]}"; do
  pattern="${BATCHES[$key]:-}"
  if [[ -z "$pattern" ]]; then
    echo "  ! unknown batch '$key' — skipped"
    SKIPPED+=("$key")
    continue
  fi

  echo
  echo "── Batch $key — $pattern ──"
  if NODE_OPTIONS="--max-old-space-size=${HEAP_MB}" \
     pnpm nx test cli --testPathPatterns="$pattern" --runInBand; then
    PASSED+=("$key")
  else
    FAILED+=("$key")
  fi
done

echo
echo "── Summary ──"
printf '  passed:  %s\n' "${PASSED[*]:-(none)}"
printf '  failed:  %s\n' "${FAILED[*]:-(none)}"
printf '  skipped: %s\n' "${SKIPPED[*]:-(none)}"

if [[ "${#FAILED[@]}" -gt 0 ]]; then
  exit 1
fi
