#!/usr/bin/env bash
# Emit Nx "release version" arguments for workflows (preview and composite actions).
set -euo pipefail

usage() {
  echo "Usage: $0 --project <name> [--specifier <auto|patch|...>] [--preid <id>] [--first-release true|false] [--dry-run true|false]" >&2
  exit 2
}

project=''
specifier='auto'
preid=''
first_release='false'
dry_run='false'

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) project="${2:-}"; shift 2 ;;
    --specifier) specifier="${2:-}"; shift 2 ;;
    --preid) preid="${2:-}"; shift 2 ;;
    --first-release) first_release="${2:-}"; shift 2 ;;
    --dry-run) dry_run="${2:-}"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$project" ]] || usage

args=(release version --projects="$project" --stage-changes)
if [[ "$dry_run" == 'true' ]]; then args+=(--dry-run); fi
if [[ -n "$specifier" && "$specifier" != 'auto' ]]; then args+=("$specifier"); fi
if [[ -n "$preid" ]]; then args+=(--preid "$preid"); fi
if [[ "$first_release" == 'true' ]]; then args+=(--first-release); fi

printf '%s\n' "${args[@]}"
