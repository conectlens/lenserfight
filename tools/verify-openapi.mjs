#!/usr/bin/env node
/**
 * verify-openapi.mjs — RETIRED
 *
 * This tool verified drift between the platform-api HTTP router
 * (apps/platform-api/src/http/main.ts) and its OpenAPI document.
 *
 * The HTTP router was removed in commit efab81a6 (2026-05-13).
 * apps/platform-api was renamed to apps/worker (2026-05-18).
 * apps/worker is a pure background worker with no HTTP surface.
 *
 * There is no OpenAPI spec to drift-check. This script is a no-op.
 */

console.log('verify-openapi: no HTTP router to check (worker-only app). Skipping.')
process.exit(0)
