# Vendored source

This directory is a vendored copy of [OpenCode](https://github.com/anomalyco/opencode)
(MIT licensed — see `LICENSE` in this directory and the root `NOTICE.md`),
forked and rebranded for use as the runtime behind `lf assist`.

- **Upstream repo:** https://github.com/anomalyco/opencode
- **Branch:** `dev`
- **Pinned commit:** `1882c33827cf0ce5c948b69ab5a87ed8f6790cf8`
- **Vendored on:** 2026-08-03

Do not run `git` commands inside this directory expecting upstream history —
it was vendored as a plain file tree (no `.git`), not a submodule, per this
monorepo's existing convention of not using submodules.

## Re-syncing with upstream

To pull newer upstream changes, re-fetch the tree at a new commit, diff it
against this pinned copy to find where LenserFight's rebrand/native-command
patches (see the top-level `git log` for this directory) still apply, and
re-apply them before updating the pinned commit above.
