# Coding Standards

This guide defines baseline expectations for contributions (code and docs).

## Repository boundaries (Nx)

- Keep app code in `apps/` and shared code in `libs/`.
- Avoid cross-layer shortcuts that bypass module boundaries.

## Formatting, linting, and types

- Prefer the repo’s existing tooling and targets (run via Nx).
- If you’re unsure which target to run, start with what CI runs for your project and keep changes minimal.

Common checks:

```bash
npm exec nx test web
npm exec nx run web:eslint:lint
npm exec nx run web:typecheck
```

## Commit messages (Conventional Commits)

- Use Conventional Commits for consistent history and automated releases.
- Commit type → version impact is documented in [Branching and Versioning](/community/branching).

## Pull requests

- Keep PRs focused: one intent per PR.
- Explain **what** changed and **why** (and tradeoffs if relevant).
- For UI changes: include screenshots.
- For bugs: include minimal reproduction steps.

See also:
- [Branching and Versioning](/community/branching)
- [Release Process](/contributing/release-process)
