#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=1
RECURSIVE=1
INCLUDE_GLOBAL=1
ROOTS=()

usage() {
  cat <<'USAGE'
Usage: scripts/migrate-lenserfight-terminology.sh [--apply] [--no-recursive] [--no-global] [root ...]

Renames legacy file-mode terminology without overwriting existing targets:
  agents/      -> lensers/
  workflows/   -> colenses/
  AGENT.MD     -> LENSER.MD
  AGENT.md     -> LENSER.MD
  WORKFLOW.MD  -> COLENS.MD

Default mode is dry-run. Pass --apply to rename files.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) DRY_RUN=0 ;;
    --dry-run) DRY_RUN=1 ;;
    --no-recursive) RECURSIVE=0 ;;
    --no-global) INCLUDE_GLOBAL=0 ;;
    -h|--help) usage; exit 0 ;;
    *) ROOTS+=("$1") ;;
  esac
  shift
done

if [[ ${#ROOTS[@]} -eq 0 ]]; then
  ROOTS+=(".lenserfight")
  if [[ $RECURSIVE -eq 1 ]]; then
    while IFS= read -r dir; do
      [[ "$dir" == ".lenserfight" ]] && continue
      ROOTS+=("$dir")
    done < <(find . -type d -name .lenserfight -not -path '*/node_modules/*' -not -path '*/.git/*' | sort)
  fi
  if [[ $INCLUDE_GLOBAL -eq 1 && -d "${LENSERFIGHT_HOME:-$HOME/.lenserfight}" ]]; then
    ROOTS+=("${LENSERFIGHT_HOME:-$HOME/.lenserfight}")
  fi
fi

declare -a OPS_FROM=()
declare -a OPS_TO=()
CONFLICTS=0

plan_rename() {
  local from="$1"
  local to="$2"
  [[ -e "$from" ]] || return 0
  if [[ -e "$to" ]]; then
    printf 'conflict\t%s\t%s\t%s\n' "$from" "$to" "target exists"
    CONFLICTS=$((CONFLICTS + 1))
    return 0
  fi
  printf 'planned\t%s\t%s\t-\n' "$from" "$to"
  OPS_FROM+=("$from")
  OPS_TO+=("$to")
}

for root in "${ROOTS[@]}"; do
  [[ -d "$root" ]] || continue
  while IFS= read -r file; do
    dir="$(dirname "$file")"
    base="$(basename "$file")"
    case "${base,,}" in
      agent.md) plan_rename "$file" "$dir/LENSER.MD" ;;
      workflow.md) plan_rename "$file" "$dir/COLENS.MD" ;;
    esac
  done < <(find "$root" -type f \( -iname 'AGENT.md' -o -iname 'WORKFLOW.md' \) | sort -r)

  plan_rename "$root/agents" "$root/lensers"
  plan_rename "$root/workflows" "$root/colenses"
done

if [[ $CONFLICTS -gt 0 ]]; then
  printf 'Found %d conflict(s). Resolve targets before applying.\n' "$CONFLICTS" >&2
  exit 1
fi

if [[ $DRY_RUN -eq 1 ]]; then
  printf 'Dry-run only. Re-run with --apply to rename files.\n'
  exit 0
fi

for i in "${!OPS_FROM[@]}"; do
  mv "${OPS_FROM[$i]}" "${OPS_TO[$i]}"
done

printf 'Applied %d terminology migration operation(s).\n' "${#OPS_FROM[@]}"
