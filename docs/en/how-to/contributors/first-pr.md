# Your First Pull Request

This guide walks from zero to a merged PR. End-to-end, including the review loop, takes 30–60 minutes for a small change.

## 1. Find an issue

Go to [GitHub Issues](https://github.com/conectlens/lenserfight/issues) and filter by **`good first issue`**. These issues have:

- A clear acceptance criterion in the description
- A scope note (which files to touch)
- No migration dependency on unmerged work

Comment "I'll take this" so maintainers can assign it and avoid duplicate work.

## 2. Fork, clone, and start dev

```bash
# Fork via GitHub UI first, then:
git clone https://github.com/<your-handle>/lenserfight && cd lenserfight
git remote add upstream https://github.com/conectlens/lenserfight

# Start Supabase local + Vite dev server
./scripts/dev-start.sh

# Confirm everything is green
pnpm smoke
```

Create your branch from `development`:

```bash
git checkout development && git pull upstream development
git checkout -b fix/my-change
```

## 3. Make your change and write a test

- **DB change?** Create a migration in `supabase/migrations/` and a pgTAP test in `supabase/tests/`.
- **TS change?** Add or update a `.spec.ts` next to the file.

Run only what you touched:

```bash
# Database changes
pnpm run-pgtap

# TypeScript changes (replace path with your file)
pnpm nx test <project> --testFile=libs/features/battles/src/lib/my-file.spec.ts
```

## 4. Push and open a PR

```bash
git push origin fix/my-change
```

Open a pull request targeting the `development` branch (not `main`). Fill in the PR template:

- **Summary** — what changed and why
- **Test plan** — pgTAP `plan()` total (if DB touched), vitest test count
- **Migration blast radius** — `none` if no migration, or brief note
- **Screenshots** — paste before/after for any UI change

## 5. What happens in review

1. **CI runs** — Nx affected build, pgTAP suite, vitest, TypeScript typecheck.
2. **Coverage gate** — overall coverage must not drop below threshold.
3. **Maintainer review** — typically within 2 business days for `good first issue` PRs.
4. **Requested changes** — push fixes to the same branch; the PR updates automatically.
5. **Merge** — maintainers squash-merge to `development`; you'll see the commit in the next release.
