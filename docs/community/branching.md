# Branching and Versioning

This is the canonical branching guide for LenserFight contributors.

## Branch workflow

- Create working branches from `development`.
- Open community pull requests against `development`.
- Treat `main` as the release branch only.
- Maintainers merge `development` into `main` when a release is ready.

## Branch names

Use a short, descriptive branch name:

- `feature/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`
- `refactor/<short-description>`

Examples:

```txt
feature/oauth-login
fix/tenant-query-bug
docs/update-community-guides
refactor/profile-cache-cleanup
```

## Pull requests

- Do not push directly to `main`.
- Keep each pull request focused on one intent.
- Explain what changed, why it changed, and any tradeoffs reviewers should know.
- Include screenshots for UI changes and reproduction steps for bug fixes when relevant.

## Commit types and version impact

LenserFight uses Conventional Commits and automated releases.

| Type     | Purpose                             | Version Impact |
| -------- | ----------------------------------- | -------------- |
| feat     | New feature                         | minor          |
| fix      | Bug fix                             | patch          |
| perf     | Performance improvement             | patch          |
| refactor | Code change without behavior change | none           |
| docs     | Documentation change                | none           |
| test     | Add or update tests                 | none           |
| build    | Build system or dependency change   | none           |
| ci       | CI/CD pipeline change               | none           |
| chore    | Maintenance task                    | none           |
| style    | Formatting or lint-only changes     | none           |
| security | Security fix                        | patch          |
| revert   | Revert a previous commit            | depends        |

Examples:

```txt
feat(auth): add OAuth login
fix(api): correct tenant lookup
perf(cache): reduce session lookup latency
docs(readme): clarify quickstart steps
ci(actions): improve release workflow
security(auth): validate JWT issuer
```

## Release relationship

- Commits merged into `main` drive release automation.
- Version bumps are determined by commit type.
- Maintainers own the release flow documented in [Release Process](/contributing/release-process).

If you are unsure which commit type to use, choose the smallest accurate type and add context in the pull request description.
