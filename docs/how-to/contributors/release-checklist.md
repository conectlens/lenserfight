---
title: Release Checklist
description: Nine-step ordered checklist before tagging any LenserFight release.
---

# Release Checklist

Follow these steps in order before tagging any release.

1. **All tests pass**
   Run `pnpm nx run-many -t test` and confirm zero failures across affected projects.

2. **Supabase diff is clean**
   Run `supabase db diff` and verify no untracked migrations are present.

3. **Feature flags documented**
   All `VITE_FEATURE_*` flags used in this release are listed in `docs/reference/known-preview-surfaces.md` with their intended stable target.

4. **Docs RPCs verified**
   Every public function name referenced in docs matches an existing migration. Diff against `supabase/migrations/` to confirm.

5. **CHANGELOG.md updated**
   The unreleased section has been promoted to the new version heading with date and summary.

6. **TR_GATE**
   Any page with a Turkish (`/tr/`) equivalent is marked stable only if the English source is stable. Draft Turkish pages must carry the `draft: true` frontmatter flag.

7. **Core reviewer approval**
   At least one core maintainer has approved the release PR.

8. **Tag and push**
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

9. **Docker smoke test**
   ```bash
   docker compose up
   lf --version   # must exit 0
   ```

10. **Local install smoke**
    ```bash
    pnpm supabase start
    pnpm nx run web:serve
    # App resolves at localhost; login page loads without errors
    ```

11. **Scheduling smoke**
    ```bash
    lf schedule create --workflow <id> --cron "0 8 * * *" --timezone Europe/Istanbul
    lf schedule list       # row present with is_active=true
    lf schedule health     # 0 missed run windows
    ```

12. **Approval-gated run**
    ```bash
    lf schedule create --workflow <id> --cron "* * * * *" --require-approval
    # Wait one pg_cron tick (up to 60 s)
    lf approval list       # pending entry appears
    lf approval approve <request_id>
    lf execution inspect <run_id>  # status = completed
    ```

13. **Local battle smoke**
    ```bash
    lf battle local init --name battle-test --task "Summarize this document in one sentence."
    # Add contenders before running:
    lf battle local add-contender A --provider anthropic --model claude-haiku-4-5
    lf battle local add-contender B --provider openai    --model gpt-4o-mini
    lf battle local run --yes   # --yes skips the BYOK cost confirmation
    lf battle local vote --slot A
    # All commands exit 0; vote result written to local state
    ```

14. **Known-limitations page present**
    ```bash
    pnpm nx run docs:build
    ls dist/apps/docs/reference/known-limitations.html
    # File must exist in the build output
    ```
