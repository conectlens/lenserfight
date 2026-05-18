---
title: LenserFight file-based CLI system
description: How .lenserfight directories, markdown items, config files, discovery, overrides, validation, and private templates work.
---

# LenserFight file-based CLI system

`.lenserfight` is the file-based home for reusable LenserFight automation objects: lensers, lenses, colenses, battles, and rays. It lets a team keep public project templates in a repository while each user keeps private defaults and personal templates in `~/.lenserfight`.

## Directory scopes

LenserFight reads templates from three places:

| Scope | Path | Use |
| --- | --- | --- |
| User-global | `~/.lenserfight/*` | Private personal lensers, preferred defaults, local experiments |
| Project-root | `./.lenserfight/*` | Team-shared templates committed with the repo |
| Nested project | `**/.lenserfight/*` | App, package, or monorepo-specific overrides |

Tests and automation can set `LENSERFIGHT_HOME` to avoid touching the real `~/.lenserfight`.

## Supported structure

```text
.lenserfight/
  config.json
  README.md
  lensers/*/LENSER.MD
  lenses/*/LENS.MD
  colenses/*/COLENS.MD
  battles/*/BATTLE.MD
  rays/*/RAY.MD
  templates/        # convention for reusable snippets or exported packs
  examples/         # convention for runnable examples
  snippets/         # convention for reusable prompt fragments
  partials/         # convention for shared markdown pieces
  policies/         # convention for safety/team policy notes
  evals/            # supported as progressive-disclosure references
  fixtures/         # convention for test inputs
  scripts/          # supported as non-interactive referenced scripts
  outputs/          # generated local output; do not commit
  cache/            # generated local cache; do not commit
```

Only the item folders and referenced `scripts/`, `references/`, `assets/`, and `evals/` paths are validated as functional behavior today. Other folders are documented conventions.

## Discovery

`lf validate` with no path resolves a workspace:

1. Load `~/.lenserfight` unless `--no-global` is used.
2. Walk upward from the current working directory and load each ancestor `.lenserfight`.
3. Recursively discover nested `.lenserfight` directories under the outer project root unless `--no-recursive` is used.
4. Sort paths deterministically.
5. Resolve duplicate item slugs by precedence.

For one-off validation, pass a file or directory: `lf validate .lenserfight/lenses/code-reviewer/LENS.MD`.

## Override precedence

Highest wins:

1. Runtime CLI flags and explicit command arguments.
2. Item-level metadata in `LENSER.MD`, `LENS.MD`, `COLENS.MD`, `BATTLE.MD`, or `RAY.MD`.
3. Nearest local `.lenserfight` directory.
4. Project-root `.lenserfight` directory.
5. User-global `~/.lenserfight` directory.
6. Built-in CLI defaults.

When two discovered items share the same `kind:slug`, the higher-precedence item wins. Ties are resolved by deterministic path order.

## Config files

`.lenserfight/lenserfight.json`, `.lenserfight/config.yaml`, and `.lenserfight/config.yml` may define safe, commit-friendly defaults:

```json
{
  "defaults": {
    "author": "@team",
    "provider": "openai",
    "model": "openai:gpt-5",
    "outputDirectory": ".lenserfight/outputs",
    "cacheDirectory": ".lenserfight/cache",
    "templateDirectories": ["lensers", "lenses", "colenses", "battles", "rays"],
    "rays": ["developer", "productivity"],
    "locale": "en",
    "license": "Apache-2.0",
    "visibility": "public",
    "forkable": true,
    "legalDisclaimerRequired": true,
    "financeDisclaimerRequired": true,
    "workflowExecutionMode": "manual",
    "battleJudge": "ai-judge",
    "evaluationCriteria": ["accuracy", "usefulness", "specificity"],
    "maxSteps": 8,
    "timeoutMs": 120000,
    "retryCount": 1,
    "concurrencyLimit": 2
  }
}
```

Do not store secrets in these files. Use environment variables, OS-aware device config, or the existing auth/profile commands for credentials.

## Item types

Lensers are reusable AI roles. Recommended fields: `name`, `title`, `description`, `author`, `rays`, `version`, `role`, `capabilities`, model/tool policy, safety constraints, examples, input expectations, and output expectations.

Lenses are reusable prompt perspectives or transformations. Recommended fields: `name`, `title`, `description`, `author`, `rays`, inputs, output kind, prompt body, use cases, dependencies, examples, and version.

Colenses compose lensers and lenses. Use `nodes` or `steps` with intentional references such as `lens: code-reviewer` or `lenser: developer-reviewer`. Document input contract, output contract, execution order, failure behavior, and examples.

Battles compare lenses, lensers, colenses, models, prompts, or outputs. Define participants, contenders, evaluation criteria, judge lenser or scoring logic, expected input, expected output, forkability, and examples.

Rays are tags/categories. Define `name`, `slug` or inferred folder slug, `description`, route behavior, aliases, related item types, expected URL mapping, and examples.

## Validation

Use:

```bash
lf validate
lf validate --json
lf validate --no-global
lf validate --no-recursive
lf validate .lenserfight/colenses/pr-review/COLENS.MD
```

Validation checks markdown frontmatter, inferred item type, required metadata, known file names, lens parameter declarations, referenced disclosure files, colens references, battle participants, duplicate slugs, deterministic conflict winners, ray/tag references, and legal/finance disclaimer markers.

## Compatibility and migration

Canonical discovery precedence is deterministic:

1. `lensers/*/LENSER.MD`
2. `colenses/*/COLENS.MD`
3. `agents/*/AGENT.MD` as a compatibility alias
4. `workflows/*/WORKFLOW.MD` as a compatibility alias

If a canonical and legacy item share the same slug, the canonical path wins and the legacy path is reported as an overridden duplicate. New generators and docs must use only `lensers/`, `colenses/`, `LENSER.MD`, and `COLENS.MD`.

Use `lf migrate-terminology` to preview the rename plan, or `lf migrate-terminology --apply` to rename folders and filenames. The bash helper `scripts/migrate-lenserfight-terminology.sh` provides the same dry-run-first migration path for project, nested, and user-global `.lenserfight` directories.

Legal-adjacent templates must say the output is not legal advice and must be reviewed by a qualified lawyer. Finance templates must say the output is not financial advice or not certified financial advice.

## Security and privacy

Commit project templates, project defaults, public examples, and non-secret evaluation fixtures.

Do not commit personal prompts, provider keys, auth tokens, customer documents, generated outputs, local caches, or battle result artifacts. Keep private templates in `~/.lenserfight`. Keep generated project output under `.lenserfight/outputs` or `.lenserfight/cache`; the project template pack ignores those paths.

Project exports must not include `~/.lenserfight` unless a command explicitly supports and requests global export.

## Troubleshooting

If a template is missing, run `lf validate --json` and check discovered roots. If a local item does not override a global item, confirm both files infer the same canonical kind and slug. If a colens fails validation, check every `lens` and `lenser` reference exists after duplicate resolution. If a legal or finance template fails, add the required disclaimer to frontmatter or body.
