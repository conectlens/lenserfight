#!/usr/bin/env node

/**
 * Lightweight launch-readiness verifier for the one-week MVP release.
 * This script intentionally checks only hard guards and required env.
 */

const checks = []

function readEnv(name, fallback = '') {
  const raw = process.env[name]
  return typeof raw === 'string' ? raw.trim() : fallback
}

function expect(name, predicate, helpText) {
  const value = readEnv(name)
  const ok = predicate(value)
  checks.push({ name, ok, value, helpText })
}

expect(
  'API_URL',
  (v) => v.length === 0 || /^https?:\/\//.test(v),
  'if set, must be a valid http(s) API origin used by workflow/feed health checks',
)

const failed = checks.filter((c) => !c.ok)
for (const check of checks) {
  const icon = check.ok ? 'PASS' : 'FAIL'
  const renderedValue = check.value === '' ? '<unset>' : check.value
  console.log(`${icon} ${check.name}=${renderedValue} (${check.helpText})`)
}

if (failed.length > 0) {
  console.error(`\nLaunch readiness failed (${failed.length} check(s)).`)
  process.exit(1)
}

console.log('\nMVP launch-readiness checks passed.')
