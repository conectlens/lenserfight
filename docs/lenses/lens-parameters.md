# Lens Parameters

Parameters let a Lens accept typed inputs at run time, making it reusable across many instances of the same task.

## Syntax

Use double curly braces in the Lens body: `{{parameter_name}}`

Example:
```
Translate the following text from {{source_language}} to {{target_language}}:

{{text_to_translate}}
```

## Parameter types

| Type | Description | Example |
|---|---|---|
| `text` | Short text input | A name, a word, a phrase |
| `textarea` | Multi-line text | A paragraph, code block |
| `number` | Numeric value | Temperature, max tokens |
| `boolean` | True/false toggle | Include examples: yes/no |
| `select` | One of several options | Language: English/Spanish/French |
| `json` | Raw JSON object | Configuration, structured data |

## Defining parameters

Parameters are defined in the Lens version editor. Each parameter has:
- `key` — matches the `{{key}}` placeholder
- `label` — displayed in the UI
- `type` — one of the types above
- `required` — whether the field must be filled
- `default_value` — optional fallback
- `options` — for `select` type, the list of choices

## See also
- [What is a Lens?](./what-is-a-lens.md)
- [Multi-step Lenses](./multi-step-lenses.md)
