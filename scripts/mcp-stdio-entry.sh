#!/usr/bin/env bash
# mcp-stdio-entry.sh — entry point for .mcp.json's stdio transport.
#
# .mcp.json can't invoke `nx build` directly: Nx's own CLI output would land on
# stdout and corrupt the MCP JSON-RPC framing. This script builds mcp-server
# first (output redirected to stderr, only if the bundle is missing or stale)
# and then execs node so the MCP session gets a clean stdout from the start.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

pnpm nx build mcp-server >&2

exec node dist/apps/mcp-server/main.js
