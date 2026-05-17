#!/bin/bash
# Script to commit all phase changes to GitHub
# Order: migrations first, then files, then docs
# One file per commit

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

COMMIT_COUNT=0

commit_file() {
  local file="$1"
  local category="$2"

  if [ -z "$file" ] || [ ! -f "$file" ]; then
    return
  fi

  git add "$file"

  # Derive commit message based on category and filename
  local msg=""
  case "$category" in
    migration)
      local filename=$(basename "$file")
      msg="migration: ${filename%.sql}"
      ;;
    file)
      local dir=$(dirname "$file")
      local basename=$(basename "$file")
      if [[ "$dir" == *"apps/worker"* ]]; then
        msg="feat(worker): add ${basename%.ts}"
      elif [[ "$dir" == *"infra/execution"* ]]; then
        msg="feat(execution): add ${basename%.ts}"
      elif [[ "$dir" == *"cli"* ]]; then
        msg="feat(cli): add media command"
      elif [[ "$dir" == *"features/workflows"* ]]; then
        msg="feat(workflows): add MediaOutputCard component"
      elif [[ "$dir" == *"examples"* ]]; then
        msg="docs(examples): add ${basename}"
      elif [[ "$dir" == *"scripts"* ]]; then
        msg="scripts: add ${basename}"
      else
        msg="chore: update ${basename}"
      fi
      ;;
    doc)
      local filename=$(basename "$file")
      msg="docs: add ${filename}"
      ;;
  esac

  git commit -m "$msg"

  COMMIT_COUNT=$((COMMIT_COUNT + 1))
  echo -e "${GREEN}✓${NC} Committed: $file"
}

echo -e "${BLUE}=== Phase 0/AK/AL/AM Commit Script ===${NC}\n"

# Stage 1: Migrations (alphabetically)
echo -e "${YELLOW}Stage 1: Committing migrations...${NC}"
for migration in $(find supabase/migrations -name "202705*.sql" -o -name "20270520*.sql" -o -name "20270524*.sql" -o -name "20270526*.sql" | sort); do
  commit_file "$migration" "migration"
done

echo ""

# Stage 2: Files (code, components, tests, scripts)
echo -e "${YELLOW}Stage 2: Committing code files...${NC}"

# Worker files
for file in apps/worker/src/lib/storage.ts \
            apps/worker/src/worker/async-media-poll-worker.ts \
            apps/worker/src/worker/async-media-poll-worker.spec.ts \
            apps/worker/src/worker/team-run-worker.ts \
            apps/worker/src/lib/provider-status.ts; do
  commit_file "$file" "file"
done

# Infra/Execution files
for file in libs/infra/execution/src/lib/delegation-handler.ts \
            libs/infra/execution/src/lib/delegation-handler.spec.ts \
            libs/infra/execution/src/lib/fal-ai.provider.spec.ts \
            libs/infra/execution/src/lib/workflow-execution.service.ts \
            libs/infra/execution/src/index.ts; do
  commit_file "$file" "file"
done

# CLI files
for file in apps/cli/src/commands/media.ts \
            apps/cli/src/main.ts; do
  commit_file "$file" "file"
done

# Frontend files
for file in libs/features/workflows/src/lib/components/MediaOutputCard.tsx \
            libs/features/workflows/src/index.ts; do
  commit_file "$file" "file"
done

# Scripts
for file in scripts/run-pgtap.sh \
            package.json \
            tools/health-cron.mjs; do
  commit_file "$file" "file"
done

# pgTAP test files
for file in supabase/tests/09_rls_media.sql \
            supabase/tests/10_delegation_policies.sql \
            supabase/tests/11_fn_poll_async_run.sql; do
  commit_file "$file" "file"
done

echo ""

# Stage 3: Documentation
echo -e "${YELLOW}Stage 3: Committing documentation...${NC}"

for file in examples/workflows/image-generation-demo/README.md \
            examples/workflows/image-generation-demo/WORKFLOW.md \
            examples/workflows/image-generation-demo/seed.sql; do
  commit_file "$file" "doc"
done

echo ""
echo -e "${GREEN}=== Complete ===${NC}"
echo -e "Total commits created: ${BLUE}${COMMIT_COUNT}${NC}"
echo ""
echo "Next: Review commits with 'git log --oneline -${COMMIT_COUNT}' and push with 'git push'"
