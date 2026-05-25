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

The first character must be a letter or digit. Leading/trailing spaces inside the brackets are ignored.

### Optional parameters

Append `!` immediately before the closing `]]` to mark a parameter as optional. Users may leave optional parameters blank; the Lens still runs.

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
| `file` | File attachment | PDF, image, CSV |

## Defining parameters

Parameters are defined in the Lens version editor. Each parameter has:
- `key` — matches the `[[label]]` placeholder in the body (lowercased, spaces preserved)
- `label` — displayed in the UI
- `type` — one of the types above
- `required` — whether the field must be filled (use `[[label!]]` syntax to mark optional at authoring time)
- `default_value` — optional fallback
- `help_text` — description shown in the tooltip when hovering the parameter chip
- `options` — for `select` type, the list of choices
- `validation_schema` — optional constraints: `min`/`max` (numeric), `urlScheme` (url), `allowedMimeTypes` (file)

## Parameter chips

In the Lens viewer, each `[[parameter]]` token is rendered as a colored badge. Hovering the badge shows a tooltip with the parameter's type, label, help text, required status, and default value. Each parameter gets a unique color (deterministic by name) so multiple parameters in the same Lens are visually distinct.

## Related

- [What is a Lens?](./what-is-a-lens)
- [Lenses in LenserFight](./lens-usage)
- [Connected Lens Workflows](./workflows)
- [Glossary](/en/tutorials/getting-started/glossary)
