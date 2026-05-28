#!/usr/bin/env bash
# Phase BT — Announcement-day operator dashboard.
#
# Polls a fixed set of health signals on a 30-second cadence and prints a
# compact, colored status table. Used during the 2026-06-12 announcement
# window per docs/how-to/operations/announcement-day-runbook.md.
#
# Flags:
#   --once          Print once and exit. Exit code non-zero if any row is RED.
#   --interval N    Override poll interval (default 30s).
#   --db-url URL    Override the Postgres URL used for SQL probes.
#
# Required env (overridable):
#   PLATFORM_API_URL   default: http://localhost:3001
#   DB_URL             default: postgresql://postgres:postgres@127.0.0.1:54322/postgres
#
# Exit codes:
#   0   all rows green (or yellow) in `--once` mode
#   1   at least one row red in `--once` mode

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

ONCE=0
INTERVAL=30
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PLATFORM_API_URL="${PLATFORM_API_URL:-http://localhost:3001}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --once) ONCE=1; shift ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    --db-url) DB_URL="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

if command -v tput >/dev/null 2>&1 && [[ -t 1 ]]; then
  C_GREEN=$(tput setaf 2); C_YELLOW=$(tput setaf 3); C_RED=$(tput setaf 1)
  C_BOLD=$(tput bold); C_RESET=$(tput sgr0)
else
  C_GREEN=""; C_YELLOW=""; C_RED=""; C_BOLD=""; C_RESET=""
fi

ANY_RED=0

mark_green()  { printf '%s● ok    %s' "$C_GREEN"  "$C_RESET"; }
mark_yellow() { printf '%s● warn  %s' "$C_YELLOW" "$C_RESET"; }
mark_red()    { ANY_RED=1; printf '%s● fail  %s' "$C_RED" "$C_RESET"; }

# Run psql with -At for unquoted, atom-only output. Empty stdout on error.
psql_quiet() {
  PGCONNECT_TIMEOUT=3 psql "$DB_URL" -At -c "$1" 2>/dev/null || true
}

probe_health_endpoint() {
  local body
  body="$(curl -s --max-time 3 "$PLATFORM_API_URL/health" 2>/dev/null || true)"
  if [[ "$body" == *'"status":"ok"'* ]]; then
    mark_green; printf '%-28s %s\n' 'GET /health' "$body"
  else
    mark_red;   printf '%-28s %s\n' 'GET /health' "${body:-<no response>}"
  fi
}

probe_cron_health() {
  if pnpm health:cron >/dev/null 2>&1; then
    mark_green; printf '%-28s %s\n' 'pnpm health:cron' 'exit 0'
  else
    mark_red;   printf '%-28s %s\n' 'pnpm health:cron' 'non-zero exit'
  fi
}

probe_fn_health() {
  local body
  body="$(psql_quiet "SELECT public.fn_health()::text")"
  if [[ "$body" == *'"status" : "ok"'* || "$body" == *'"status":"ok"'* ]]; then
    mark_green; printf '%-28s %s\n' 'fn_health()' "ok"
  else
    mark_red;   printf '%-28s %s\n' 'fn_health()' "${body:-<no response>}"
  fi
}

probe_active_users() {
  local n
  n="$(psql_quiet "
    SELECT count(*)::text FROM analytics.events
    WHERE occurred_at > now() - interval '5 minutes'
  ")"
  n="${n:-0}"
  if [[ "$n" =~ ^[0-9]+$ ]]; then
    mark_green; printf '%-28s %s events (5m)\n' 'analytics.events' "$n"
  else
    mark_yellow; printf '%-28s %s\n' 'analytics.events' "table missing or query failed"
  fi
}

probe_open_battles() {
  local n
  n="$(psql_quiet "SELECT count(*)::text FROM battles.battles WHERE status='open'")"
  n="${n:-0}"
  if [[ "$n" =~ ^[0-9]+$ ]]; then
    mark_green; printf '%-28s %s open\n' 'battles.battles' "$n"
  else
    mark_red; printf '%-28s %s\n' 'battles.battles' 'query failed'
  fi
}

probe_outbox_errors() {
  local n
  n="$(psql_quiet "
    SELECT count(*)::text FROM audit.webhook_outbox
    WHERE status='failed' AND created_at > now() - interval '5 minutes'
  ")"
  n="${n:-0}"
  if [[ ! "$n" =~ ^[0-9]+$ ]]; then
    mark_yellow; printf '%-28s %s\n' 'audit.webhook_outbox' 'table missing or query failed'
  elif (( n == 0 )); then
    mark_green; printf '%-28s %s failures (5m)\n' 'audit.webhook_outbox' "$n"
  elif (( n <= 5 )); then
    mark_yellow; printf '%-28s %s failures (5m)\n' 'audit.webhook_outbox' "$n"
  else
    mark_red; printf '%-28s %s failures (5m)\n' 'audit.webhook_outbox' "$n"
  fi
}

probe_platform_flags() {
  local body
  body="$(psql_quiet "
    SELECT string_agg(key || '=' || (value::text), ', ')
    FROM platform.system_flags
    WHERE key IN ('autonomy_dispatch_enabled','public_battles_enabled','webhook_outbox_enabled')
  ")"
  if [[ -n "$body" && "$body" != *'=false'* ]]; then
    mark_green; printf '%-28s %s\n' 'platform.system_flags' "$body"
  elif [[ -n "$body" ]]; then
    mark_yellow; printf '%-28s %s\n' 'platform.system_flags' "$body"
  else
    mark_red;   printf '%-28s %s\n' 'platform.system_flags' '<no rows>'
  fi
}

render_table() {
  ANY_RED=0
  echo
  printf '%s── LenserFight Announcement Dashboard  %s%s\n' \
    "$C_BOLD" "$(date -u '+%Y-%m-%d %H:%M:%S UTC')" "$C_RESET"
  echo

  probe_health_endpoint
  probe_cron_health
  probe_fn_health
  probe_platform_flags
  probe_active_users
  probe_open_battles
  probe_outbox_errors

  echo
}

if (( ONCE == 1 )); then
  render_table
  exit "$ANY_RED"
fi

trap 'echo; echo "(announcement dashboard stopped)"; exit 0' INT TERM

while true; do
  clear || true
  render_table
  echo "next refresh in ${INTERVAL}s — Ctrl-C to exit"
  sleep "$INTERVAL"
done
