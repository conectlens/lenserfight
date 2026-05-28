# Lens Commands

Manage lens versions and attach resources to them. In Community Edition, lenses are versioned task specifications used by workflows and direct execution flows.

```
lenserfight lens <subcommand>
lf lens <subcommand>
```

---

## `lens version`

Manage versions of a lens.

```
lf lens version <subcommand> <lens-id>
```

### `lens version list`

List all versions for a lens.

```bash
lf lens version list <lens-id>
lf lens version list <lens-id> --json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--json` | No | `false` | Output as JSON |

---

### `lens version create`

Create a new draft version of a lens. The prompt content must be at least 50 characters.

```bash
lf lens version create <lens-id> --content "Your detailed prompt goes here..."
```

| Flag | Required | Description |
|------|----------|-------------|
| `--content` | Yes | Prompt text (min 50 characters) |

---

### `lens version publish`

Publish a draft lens version to make it available for workflows and other version-aware flows.

```bash
lf lens version publish <lens-id> --version-id <version-uuid>
```

| Flag | Required | Description |
|------|----------|-------------|
| `--version-id` | Yes | UUID of the draft version to publish |

---

## `lens resource`

Attach resources (URLs or inline text) to a lens version slot.

```
lf lens resource <subcommand>
```

### `lens resource attach`

Attach a URL or inline text to a named slot on a lens version.

```bash
# Attach a URL resource
lf lens resource attach \
  --version-id <version-uuid> \
  --slot context \
  --url https://example.com/dataset.json

# Attach inline text
lf lens resource attach \
  --version-id <version-uuid> \
  --slot instructions \
  --text "Evaluate for correctness and code style."
```

| Flag | Required | Description |
|------|----------|-------------|
| `--version-id` | Yes | Lens version UUID |
| `--slot` | Yes | Named resource slot on the version |
| `--url` | One of | URL of the resource to attach |
| `--text` | One of | Inline text content to attach |

> **Note:** File upload is not yet supported. Use `--url` pointing to a publicly accessible file, or `--text` for inline content.

---

## Related

- [Run Commands](run.md) — execute a lens via `run exec`
- [Execution Modes](execution-modes.md) — Ollama, BYOK, and Cloud execution
- [Community API: Lenses](/en/reference/community-api/lenses)

<!-- AUTO-GEN-START -->

# `lf lens`

Manage lenses: create, versions, resources.

## `lf lens list`

List all versions for a lens.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<id>` | positional | yes | Lens UUID |
| `--json` | boolean | no | Output as JSON |

## `lf lens create`

Create a new draft version for a lens.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<id>` | positional | yes | Lens UUID |
| `--body` | string | yes | Template body (use {{variable}} for params) |
| `--changelog` | string | no | Optional changelog message for this version |
| `--parent-version` | string | no | Parent version UUID (for forked versions) |

## `lf lens publish`

Publish a draft lens version.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<id>` | positional | yes | Version UUID to publish |

<!-- AUTO-GEN-END -->
