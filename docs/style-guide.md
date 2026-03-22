# Documentation Style Guide

This guide defines the conventions for writing and maintaining LenserFight documentation. Follow these rules to keep docs consistent, navigable, and useful.

## Framework: Diataxis

All documentation follows the [Diataxis](https://diataxis.fr/) framework. Every page belongs to exactly one category:

| Category | Purpose | Directory | Naming pattern |
|----------|---------|-----------|----------------|
| **Tutorial** | Learning-oriented walkthroughs | `docs/tutorials/` | `<verb>-<noun>.md` (e.g., `first-battle-cli.md`) |
| **How-to guide** | Problem-oriented instructions | `docs/how-to/`, `docs/guides/` | `<verb>-<noun>.md` (e.g., `connect-runner.md`) |
| **Explanation** | Understanding-oriented discussion | `docs/explanations/` | `<noun>.md` (e.g., `domain-model.md`) |
| **Reference** | Information-oriented lookup | `docs/reference/`, `docs/database/` | `<noun>.md` (e.g., `cli.md`, `rpc-reference.md`) |

Do not mix categories within a single page. If a page tries to teach and also serve as a reference, split it.

## File and directory conventions

- Use kebab-case for all file and directory names: `schema-battles.md`, not `SchemaBattles.md`.
- Place files in the directory that matches their Diataxis category.
- One topic per file. Prefer many short files over few long ones.
- Use `index.md` for section landing pages only (e.g., `docs/database/index.md`).

## Page structure

Every page starts with a level-1 heading that matches the page's purpose:

```markdown
# Connect a Runner               ← how-to (imperative verb)
# Domain Model                  ← explanation (noun phrase)
# RPC Function Reference        ← reference (noun phrase + "Reference")
# Run Your First Battle via CLI ← tutorial (action-oriented phrase)
```

### Required sections by category

**Tutorials:**
1. One-sentence goal statement
2. Prerequisites (tools, accounts, seed data)
3. Numbered steps with expected output
4. "What you learned" summary
5. "Next steps" links

**How-to guides:**
1. One-sentence problem statement
2. Steps (numbered, imperative)
3. "Related" links

**Explanations:**
1. Opening paragraph establishing context
2. Concept sections with headings
3. Diagrams or tables where they reduce ambiguity
4. "Related" links

**Reference:**
1. Overview paragraph
2. Structured tables (columns, types, flags, defaults)
3. Code examples (curl, CLI, SQL)
4. "Related" links

## Tone and voice

- Write in second person: "you", not "the user" or "one".
- Use active voice: "Create a battle" not "A battle is created".
- Be direct. Lead with the action or answer, not the context.
- Do not use filler phrases: "In order to", "It should be noted that", "As mentioned above".
- Do not hedge: "simply", "just", "easily". If something is simple, the brevity of the instruction will show it.
- Keep sentences short. If a sentence has more than one clause, consider splitting it.

## Formatting rules

- Use ATX-style headings (`#`, `##`, `###`). Do not skip levels.
- Use fenced code blocks with a language identifier: ` ```sql `, ` ```bash `, ` ```json `, ` ```typescript `.
- Use tables for structured data (columns, flags, types). Do not use tables for prose.
- Use `inline code` for: CLI commands, function names, column names, file paths, status values, config keys.
- Use **bold** for: UI labels, key terms on first use, table header emphasis.
- Use ordered lists for sequential steps. Use unordered lists for non-sequential items.
- Do not use emojis.

## Cross-linking

- Link to related docs at the bottom of every page in a `## Related` section.
- Use relative paths: `[CLI Reference](/reference/cli)`, not absolute URLs.
- When referencing a CLI command inline, link to its anchor: `[lenserfight battle create](/reference/cli#lenserfight-battle-create)`.
- When referencing a database table, link to its schema page: `[battles.templates](/database/schema-battles#templates)`.
- When referencing an RPC, link to the RPC reference: `[fn_battles_publish](/database/rpc-reference#fn_battles_publish)`.

## Code examples

- Every RPC reference entry must include a curl example.
- Every CLI command reference entry must include a usage example.
- Use realistic but obviously fake data in examples: `alice@example.com`, `battle-uuid-here`, `$ANON_KEY`.
- For SQL examples, include the schema prefix: `battles.templates`, not just `templates`.
- Keep examples minimal. Show the happy path. Add error cases only when they are non-obvious.

## Tables

Use this format for database column tables:

```markdown
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | `uuid` | `gen_random_uuid()` | Primary key |
```

Use this format for CLI flag tables:

```markdown
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | `false` | Output as JSON |
```

## Diagrams

- Use ASCII art for simple state machines and flows (renders in all contexts).
- Place diagrams immediately after the paragraph that introduces them.
- Label every state and transition.

```
draft → open → voting → scoring → closed → published
                                     ↓
                                  archived
```

## Naming conventions

| Concept | Convention | Example |
|---------|-----------|---------|
| Database table | Schema-qualified lowercase | `battles.templates` |
| RPC function | `fn_` prefix, snake_case | `fn_battles_publish` |
| CLI command | Lowercase with spaces | `lenserfight battle create` |
| Config key | camelCase | `defaultAdapterId` |
| Status value | Lowercase | `draft`, `open`, `voting` |
| Adapter type | Lowercase with hyphens | `openai-agents`, `crewai` |

## Maintenance rules

- When a migration adds or removes a table, column, RPC, or RLS policy, update the corresponding reference doc in the same PR.
- When a CLI command is added or changed, update `docs/reference/cli.md` in the same PR.
- When a placeholder doc is filled in, remove any `TODO:` markers.
- Review cross-links when renaming or moving files.

## Related

- [Documentation Index](/index)
- [CLI Reference](/reference/cli)
- [Schema Overview](/database/schema-overview)
- [RPC Reference](/database/rpc-reference)
