# Contributing

Thanks for helping improve LenserFight.

This page is the friendly starting point for contributors. It explains how to help, where to start, and which detailed guides to read next.

## Ways to contribute

- Improve documentation in `docs/` by fixing broken links, clarifying steps, or adding examples.
- Report bugs with a minimal reproduction and clear expected versus actual behavior.
- Review pull requests, especially small fixes and doc improvements.
- Propose features or improvements through issues that explain the problem, constraints, and tradeoffs.

## Your first contribution

If this is your first time contributing, start with a maintainer-tagged starter issue:

- Browse [`good-first-issue` issues](https://github.com/conectlens/lenserfight-web/issues?q=is%3Aissue+is%3Aopen+label%3Agood-first-issue) — these are scoped, low-context, and have everything a new contributor needs to ship.
- If something looks doable, comment on the issue to claim it before opening a PR — avoids two people working on the same thing.

The full new-contributor walkthrough:

1. Run [Development Setup](/how-to/contributors/development-setup) and verify `pnpm smoke` exits 0 — that's the "ready to PR" gate.
2. Pick a `good-first-issue` and comment to claim it.
3. Fork → branch from `development` → commit using Conventional Commits → open a PR targeting `development`.
4. The PR template will ask what changed, why, and a quick validation checklist — fill it out.
5. A maintainer will respond within a few weekdays. Reviews focus on scope, clarity, and tests/validation, not nitpicks.

If you want help picking a starter task, open a discussion in the `Q&A` category — we'd rather help you choose than have you guess.

## Contribution flow

1. Fork the repository.
2. Create a branch from `development`.
3. Make focused changes and write clear Conventional Commit messages.
4. Run the smallest relevant checks for the area you changed.
5. Open a pull request targeting `development`.

## Read this next

- Local setup: [Development Setup](/how-to/contributors/development-setup)
- Coding expectations: [Coding Standards](/how-to/contributors/coding-standards)
- Branching and version impact: [Branching and Versioning](/how-to/contributors/branching)
- Release process for maintainers: [Release Process](/how-to/contributors/release-process)
- Code of conduct: [Code of Conduct](/how-to/contributors/code-of-conduct)
- Security reporting: [Security Policy](/how-to/contributors/security)
- Support channels: [Support](/how-to/contributors/support)

## Pull request expectations

- Keep one pull request focused on one outcome.
- Explain what changed and why it matters.
- Include screenshots for UI changes when they help reviewers.
- Include reproduction steps for bug fixes when they help reviewers validate the change.

## Community health files

GitHub also reads the repository root community health files, but the pages linked above are the canonical contributor-facing guides.
