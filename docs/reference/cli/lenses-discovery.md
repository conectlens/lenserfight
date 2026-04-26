# Lens Discovery Commands

Browse and discover public lenses on the LenserFight platform. This command group covers **public discovery** — searching, filtering, sorting, and connecting to lenses created by other users or communities.

For version and resource management of lenses you own, see [Lens Commands](lens.md).

```bash
lenserfight lenses <subcommand>
lf lenses <subcommand>
```

---

## `lenserfight lenses`

List public lenses with optional filters and sorting.

```bash
lenserfight lenses
lenserfight lenses --sort popularity
lenserfight lenses --sort date
lenserfight lenses --tag typescript
lenserfight lenses --author @chainabit
lenserfight lenses --limit 50 --json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--sort` | No | `date` | Sort order: `date`, `popularity`, `trending` |
| `--tag` | No | — | Filter by tag slug |
| `--author` | No | — | Filter by lenser handle (e.g. `@alice`) |
| `--community` | No | — | Filter by community slug |
| `--limit` | No | `20` | Number of results (max 100) |
| `--offset` | No | `0` | Pagination offset |
| `--json` | No | `false` | Output as JSON |

Output columns: `ID`, `Slug`, `Title`, `Author`, `Tags`, `Score`, `Updated At`

### Sort values

| Value | Behaviour |
|-------|-----------|
| `date` | Most recently updated first |
| `popularity` | Sorted by combined usage score (uses + forks) |
| `trending` | Hot score weighted over the past 7 days |

---

## `lenserfight lenses search`

Full-text search across public lens titles and descriptions.

```bash
lenserfight lenses search "code review"
lenserfight lenses search "sql optimizer" --tag databases --json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--tag` | No | — | Narrow to a specific tag slug |
| `--limit` | No | `10` | Number of results |
| `--json` | No | `false` | Output as JSON |

---

## `lenserfight lenses view <lens-slug-or-id>`

Show detailed metadata for a single public lens.

```bash
lenserfight lenses view code-reviewer
lenserfight lenses view abc123-uuid --json
```

Output includes: lens ID, slug, title, description, author handle, tags, latest version ID, resource slots, usage count, created and updated timestamps.

---

## `lenserfight lenses fork <lens-slug-or-id>`

Clone a public lens into your own library. Forked lenses start as private drafts.

```bash
lenserfight lenses fork code-reviewer
lenserfight lenses fork abc123-uuid --name "My Code Reviewer"
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--name` | No | Original title | Display name for the forked lens |

> Forking preserves the latest published version as your initial draft. Attribution to the original lens is recorded automatically.

---

## `lenserfight lenses use <lens-slug-or-id>`

Execute a public lens directly without forking it. Runs against the current published version.

```bash
lenserfight lenses use code-reviewer --input "Review this function for security issues."
lenserfight lenses use abc123-uuid --ollama --model llama3.2
lenserfight lenses use code-reviewer --byok --provider openai --model gpt-4o
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--input` | Yes | — | Input text to pass to the lens |
| `--ollama` | No | `false` | Execute using local Ollama |
| `--model` | No | provider default | Model to use |
| `--byok` | No | `false` | Use your own API key |
| `--provider` | No | — | Provider name when using `--byok` |
| `--json` | No | `false` | Output result as JSON |

---

## `lenserfight lenses trending`

Shortcut for `lenserfight lenses --sort trending`. Shows the top lenses by hot score in the last 7 days.

```bash
lenserfight lenses trending
lenserfight lenses trending --tag ai --limit 10 --json
```

---

## `lenserfight lenses starred`

List lenses you have starred. Requires authentication.

```bash
lenserfight lenses starred
lenserfight lenses starred --json
```

## `lenserfight lenses star <lens-slug-or-id>`

Star or unstar a public lens.

```bash
lenserfight lenses star code-reviewer
lenserfight lenses star code-reviewer --remove
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--remove` | No | `false` | Unstar the lens |

---

## URL pattern

Public lenses are accessible on the web at:

```
https://lenserfight.com/:lens-slug
```

For example, a lens with slug `code-reviewer` is available at:

```
https://lenserfight.com/code-reviewer
```

When referencing a lens in any LenserFight surface (CLI, API, or web), you can use either the slug or the UUID. The slug is stable across versions; the UUID is canonical.

---

## Related

- [Lens Commands](lens.md) — manage versions and resources for your own lenses
- [Connect Commands](connectors.md) — subscribe to a lens for ongoing updates
- [Community API: Lenses](/reference/community-api/lenses) — REST contract reference
- [URL Conventions](/reference/platform-api/url-conventions) — full URL pattern reference
