#!/usr/bin/env bash
# Memory-bounded CLI test runner.
#
# `pnpm nx test cli` in one shot OOMs (~21 spec files, several large e2e). This
# script runs six narrow batches sequentially, each with a 2GB heap cap.
#
# Calls the local jest binary directly. Going through `pnpm nx test cli` was
# tempting (caching, dependency graph) but nx forwards the pattern argument
# through `sh -c "..."` without quoting, so a regex containing `(`, `|`, or
# `\.` blows up with "Syntax error: '(' unexpected". Direct jest invocation
# sidesteps that. We pass the cli project's jest config explicitly.
#
# Usage:
#   bash scripts/run-cli-batches.sh                # run every batch
#   bash scripts/run-cli-batches.sh A C            # run only batches A and C
#   BATCH_HEAP_MB=3072 bash scripts/run-cli-batches.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

HEAP_MB="${BATCH_HEAP_MB:-2048}"
JEST="$REPO_ROOT/node_modules/.bin/jest"
CONFIG="apps/cli/jest.config.cts"

if [[ ! -x "$JEST" ]]; then
  echo "✗ local jest binary not found at $JEST — run \`pnpm install\` first" >&2
  exit 2
fi

declare -A BATCHES=(
  [A]='(execution|run|completion|evaluate|ai)\.spec\.ts'
  [B]='(battle|battle-moderation|approval|leaderboard)\.spec\.ts'
  [C]='(automation|schedule|connectors|gateway)\.spec\.ts'
  [D]='(byok|providers|models|security)\.spec\.ts'
  [E]='(admin|profile|team|communities|analytics)\.spec\.ts'
  [F]='(lenses|inspect|export|import|publish|template|tool)\.spec\.ts'
)

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
  # jest receives the pattern via argv, untouched by the shell — no
  # eval / no nx forwarding. --passWithNoTests means an empty batch
  # is a pass, not a failure.
  # `--forceExit` is needed because some CLI specs leave async handles open
  # (timers, network mocks, child-process stubs). Without it Jest hangs after
  # all tests pass and exits with code 1. The trade-off: any genuinely-stuck
  # test won't be detected here — that's what targeted spec runs are for.
  if NODE_OPTIONS="--max-old-space-size=${HEAP_MB}" \
     "$JEST" \
       --config="$CONFIG" \
       --testPathPatterns="$pattern" \
       --runInBand \
       --passWithNoTests \
       --forceExit; then
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
