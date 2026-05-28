#!/usr/bin/env bash
# Shared CLI release-critical test pattern.
# Both release-cli.yml (gate before publish) and cli-package.yml (gate before
# cross-platform smoke) source this so the pattern never drifts.
set -euo pipefail

exec pnpm nx run cli:test \
  --testPathPattern='"run\.spec\.ts|auth\.spec\.ts|local-battle-engine\.spec\.ts|exec-context\.spec\.ts"' \
  --forceExit
