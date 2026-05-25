---
title: Lens Parameters
description: Typed inputs using [[parameter]] syntax — how to define and use parameters in Lenses.
---

# Lens Parameters

Parameters let a Lens accept typed inputs at run time, making it reusable across many instances of the same task.

## Syntax

Use **double square brackets** in the Lens body: `[[Parameter Label]]`

```text
Translate the following text from [[Source Language]] to [[Target Language]]:

[[Text to Translate]]
```

### Allowed label characters

| Feature | Syntax | Example |
|---------|--------|---------|
| Single word | `[[word]]` | `[[topic]]` |
| Multi-word (spaces allowed) | `[[word word]]` | `[[Visual Tone]]`, `[[Target Audience]]` |
| Underscores / hyphens | `[[word_word]]` or `[[word-word]]` | `[[word_count]]`, `[[source-language]]` |
| Optional parameter | `[[label!]]` | `[[Special Instructions!]]` |
| Inline type hint | `[[label:type]]` | `[[Input PDF:file]]`, `[[Word Count:number]]` |
| Type + optional | `[[label:type!]]` | `[[Notes:textarea!]]` |

The first character must be a letter or digit. Leading/trailing spaces inside the brackets are ignored. Labels must not contain `:` unless you intend a type hint (see below).

### Inline type hints

Append `:type` after the label (before optional `!`) to suggest a parameter type when the token is first detected. This is an **authoring hint** only — the canonical type is stored on the Lens version’s tool binding.

```text
Summarize this document: [[Source Document:file]]
Target length: [[Word Count:integer]]
Tone: [[Tone:text!]]
```

Supported `type` values match the table in [Parameter types](#parameter-types) (`text`, `file`, `number`, `boolean`, etc.). If the suffix is not a known type (for example `[[ratio:16]]`), the whole token is treated as the label `ratio:16`.

### Optional parameters

Append `!` immediately before the closing `]]` (after an optional `:type`) to mark a parameter as optional. Users may leave optional parameters blank; the Lens still runs.

```text
Write a [[Word Count]] word article about [[Topic]].
Tone: [[Tone!]]
Things to avoid: [[Things to Avoid!]]
```

In the example above, `[[Tone!]]` and `[[Things to Avoid!]]` are optional — the Lens works even when left blank.

### Why square brackets instead of double curly braces?

The `{{name}}` pattern is used by many popular template engines (Jinja2, Handlebars, Mustache, Go templates). When a Lens author pastes code or examples that contain `{{variable}}` syntax, those tokens would accidentally be detected as Lens parameters.

`[[name]]` is rarely used as a template delimiter in the wild, making it unambiguous: any `[[label]]` in a Lens body is always an intentional parameter placeholder.

## Parameter types

| Type | Description | Example |
|---|---|---|
| `text` | Short text input | A name, a word, a phrase |
| `textarea` | Multi-line text | A paragraph, code block |
| `number` | Numeric value | Temperature, max tokens |
| `integer` | Whole number only | Page count, retry limit |
| `float` / `decimal` | Fractional number | Temperature: 0.7 |
| `boolean` | True/false toggle | Include examples: yes/no |
| `select` | One of several options | Language: English/Spanish/French |
| `json` | Raw JSON object | Configuration, structured data |
| `url` | Validated URL string | Documentation link |
| `date` | Date value | Deadline, publish date |
| `datetime` | Date + time value | Scheduled run timestamp |
| `file` | Single file attachment | PDF, image, CSV |
| `files` | Multiple file attachments | Image gallery, several PDFs for multimodal models |

## Defining parameters

Parameters are defined in the Lens version editor. Each parameter has:
- `key` — matches the `[[label]]` placeholder in the body (lowercased, spaces preserved)
- `label` — displayed in the UI
- `type` — one of the types above
- `required` — whether the field must be filled (use `[[label!]]` syntax to mark optional at authoring time)
- `default_value` — optional fallback
- `help_text` — description shown in the tooltip when hovering the parameter chip
- `options` — for `select` type, the list of choices
- `validation_schema` — optional constraints: `min`/`max` (numeric), `urlScheme` (url), `allowedMimeTypes` (file/files), `maxCount` / `maxFileBytes` / `maxTotalBytes` (files)

### `files` type limits (platform defaults)

| Limit | Default |
|-------|---------|
| Files per `files` parameter | 10 |
| Files per lab run (all `files` params) | 20 |
| Max size per file | 50 MiB |
| Max total per `files` parameter | 100 MiB |
| Max total per run | 200 MiB |
| Max multimodal parts per message | 20 |

Per-tool `validation_schema` may lower these caps. Allowed MIME types default to `image/*`, `application/pdf`, `audio/*`, and `video/*` unless `allowedMimeTypes` is set on the tool.

Author with `[[Photos:files]]` or bind the **File Attachments** tool in the version editor.

## Parameter chips

In the Lens viewer, each `[[parameter]]` token is rendered as a colored badge. Hovering the badge shows a tooltip with the parameter's type, label, help text, required status, and default value. Each parameter gets a unique color (deterministic by name) so multiple parameters in the same Lens are visually distinct.

## Copying prompts with filled parameters

On the Lens lab panel, **Copy with Parameters** substitutes filled values into the template:

| Action | `file` parameter | `files` parameter | Use case |
|--------|------------------|-------------------|----------|
| **Copy with Parameters** (default) | One public `https://` URL or placeholder | JSON array of public URLs only, e.g. `["https://…","https://…"]` | Paste into external AI tools |
| **Internal IDs** | One `media_object_id` UUID | JSON array of UUIDs | LenserFight execution / snapshot |

Inside LenserFight, **local BYOK** runs send multiple attachments as separate multimodal parts (images may be inlined as base64 so providers never fetch `127.0.0.1`). Cloud/server runs emit one `attachment_binding` per file. Copy never includes `data:` URIs or localhost links for `files` params.

### Local development and unreachable URLs

Signed Supabase Storage URLs on localhost use `http://127.0.0.1:54321/...`. External AI services cannot open those links. LenserFight applies this order for **Copy with Parameters**:

1. **`SUPABASE_PUBLIC_URL`** — tunnel (ngrok, Cloudflare Tunnel) pointing at your local Supabase API; signed URLs are rewritten to the public host.
2. **`media-content` edge proxy** — when `MEDIA_CONTENT_PROXY_ENABLED` is on (default when `WEB_BASE_URL` is public), copy uses a short-lived token URL: `{SUPABASE_PUBLIC_URL or SUPABASE_URL}/functions/v1/media-content?object_id=...&token=...`.
3. **Placeholder text** — if neither applies, file params copy as a note to upload the file manually (no dead localhost link).

Example `.env.local` for tunneled copy:

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLIC_URL=https://your-tunnel.example.com
```

See also: [Storage adapters](/en/reference/platform-api/storage-adapters.md).

## Related

- [What is a Lens?](./what-is-a-lens)
- [Lenses in LenserFight](./lens-usage)
- [Connected Lens Workflows](./workflows)
- [Glossary](/en/tutorials/getting-started/glossary)
