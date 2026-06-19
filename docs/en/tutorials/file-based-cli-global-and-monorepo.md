---
title: Global and monorepo .lenserfight usage
description: Use user-global templates, project overrides, rays, nested configs, and discovery debugging.
---

# Global and monorepo .lenserfight usage

## Use `~/.lenserfight` for personal templates

Goal: keep private prompts outside the repository.

Structure:

```text
~/.lenserfight/lenserfight.json
~/.lenserfight/lenses/private-brief/SKILL.md
```

Relationship: project templates can use the same item types; project slugs override global slugs.

Validation: use `LENSERFIGHT_HOME=/tmp/lf-home lf validate` in tests.

Common mistakes: committing personal prompts, storing secrets in markdown.

Expected outcome: private templates are available locally but not exported with the project.

## Override a global template inside a project

Goal: replace `~/.lenserfight/lenses/pr-summary` for one repo.

Structure:

```text
~/.lenserfight/lenses/pr-summary/SKILL.md
./.lenserfight/lenses/pr-summary/SKILL.md
```

Relationship: both infer `lens:pr-summary`; the project item wins.

Validation: `lf validate --json` shows duplicate conflicts and the winning path.

Common mistakes: changing the folder slug but expecting an override.

Expected outcome: project teams get shared behavior without deleting personal defaults.

## Use rays to organize templates

Goal: group templates under `developer`, `finance`, `legal`, or custom rays.

Structure:

```text
.lenserfight/rays/developer/SKILL.md
.lenserfight/lenses/code-reviewer/SKILL.md
```

Relationship: templates use `rays: [developer]`.

Validation: missing rays produce warnings.

Common mistakes: adding too many rays to every item.

Expected outcome: predictable category browsing and URL mapping.

## Use `.lenserfight` inside a monorepo

Goal: let an app override root templates.

Structure:

```text
.lenserfight/
apps/web/.lenserfight/
packages/api/.lenserfight/
```

Relationship: nested templates can override root templates by slug.

Validation: run from the package directory, or use `lf validate --no-recursive` to isolate ancestor roots.

Common mistakes: relying on filesystem traversal order; discovery now sorts deterministically.

Expected outcome: package-specific workflows without breaking root defaults.

## Debug discovery and slug conflicts

Goal: explain why a template did or did not load.

Validation: run `lf validate --json`.

Common mistakes: filename is not one of `SKILL.md`, `SKILL.md`, `SKILL.md`, `SKILL.md`, or `SKILL.md`; frontmatter lacks a stable `name` or `slug`.

Expected outcome: the JSON output lists roots, objects, winners, and conflicts.
