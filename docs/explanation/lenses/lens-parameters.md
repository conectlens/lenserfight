---
title: Lens Parameters
description: Typed inputs using [[parameter]] syntax — how to define and use parameters in Lenses.
---

# Lens Parameters

Parameters let a Lens accept typed inputs at run time, making it reusable across many instances of the same task.

## Syntax

Use **double square brackets** in the Lens body: `\[\[parameter_name\]\]`

Example:
```text
Translate the following text from [[source_language]] to [[target_language]]:

[[text_to_translate]]
```

### Why square brackets instead of double curly braces?

The `{{name}}` pattern is used by many popular template engines (Jinja2, Handlebars, Mustache, Go templates). When a Lens author pastes code or examples that contain `{{variable}}` syntax, those tokens would accidentally be detected as Lens parameters.

`[[name]]` is rarely used as a template delimiter in the wild, making it unambiguous: any `[[word]]` in a Lens body is always an intentional parameter placeholder.

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
- `key` — matches the `[[key]]` placeholder in the body
- `label` — displayed in the UI (defaults to `key` if omitted)
- `type` — one of the types above
- `required` — whether the field must be filled
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
- [Glossary](/tutorials/getting-started/glossary)
