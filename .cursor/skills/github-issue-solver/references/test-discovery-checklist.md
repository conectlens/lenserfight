# Test Discovery Checklist

Use this checklist to find existing tests and determine what new tests to add.

## 1. Discover Test Commands

```bash
# Check package.json scripts
cat package.json | grep -E '"(test|spec|e2e|check|verify)'

# Check Nx project config
pnpm nx show project <project-name> --json | jq '.targets | keys'

# Check CI pipelines
grep -rE 'nx (test|run|affected)' .github/workflows/

# Check pnpm workspace for test scripts
grep -rE '"test"' apps/*/package.json libs/*/package.json
```

## 2. Locate Existing Tests for Affected Files

```bash
# Find test files near the changed file
find . -name "*.spec.ts" -o -name "*.test.ts" | grep -i <affected-module>

# Find pgTAP test files
find supabase/ -name "*.sql" | grep test

# Check test directory conventions
ls -la apps/<app>/src/**/__tests__/ 2>/dev/null
ls -la libs/<lib>/src/**/*.spec.ts 2>/dev/null
```

## 3. Determine Test Layer

| Layer | Test type | Command pattern |
|-------|-----------|-----------------|
| Domain logic | Unit | `pnpm nx test <lib> --testPathPattern=<spec>` |
| Repository/data | Unit + integration | `pnpm nx test <data-lib>` |
| Feature orchestration | Integration | `pnpm nx test <feature-lib>` |
| UI components | Unit + visual | `pnpm nx test <ui-lib>` |
| API routes | Integration | `pnpm nx test <api-lib>` |
| Supabase RLS/schema | pgTAP | `pnpm supabase test db` |
| E2E flows | E2E | `pnpm nx e2e <app>` |

## 4. Run Tests in Ascending Scope

Always run smallest scope first:

```bash
# 1. Single spec
pnpm nx test <project> --testPathPattern=<specific-spec-file>

# 2. Project-wide
pnpm nx test <project>

# 3. Typecheck
pnpm nx typecheck <project>

# 4. Lint
pnpm nx lint <project>

# 5. Affected (run after confirming the above pass)
pnpm nx affected --target=test --base=origin/development

# 6. Database tests (only if schema/RLS changed)
pnpm supabase test db
```

## 5. Assess Coverage Gaps

A test gap exists when:
- The root cause of the bug has no direct test
- The fixed behavior is not asserted anywhere
- Edge cases (null, empty, boundary) are not tested
- Error paths and rollbacks are not exercised

## 6. Add Missing Tests

When adding tests:
- Place unit tests next to the source file (`<file>.spec.ts`)
- Place integration tests in the feature or data lib's `__tests__/` directory
- Place pgTAP assertions in `supabase/tests/`
- Test the behavior described in the issue, not just the implementation detail
- Include at least one negative case (wrong input, missing permission, invalid state)

## 7. Test Must-Haves Before PR

- [ ] Root cause scenario is tested
- [ ] Fix does not break existing tests
- [ ] Typecheck passes on affected projects
- [ ] Lint passes on affected projects
- [ ] DB tests pass if schema or RLS changed
- [ ] No test is skipped with `.skip` or `xit` without explanation
