---
title: Create a Lens
description: Step-by-step guide to creating your first Lens on LenserFight.
---

# Create a Lens

A Lens is a versioned task specification used by the workflow builder and execution flows in Community Edition. This guide walks you through creating one from scratch.

## What you need

- An active Lenser account with a completed profile
- A clear task idea — something specific, bounded, and reusable

## Step 1: Open the Lens editor

Navigate to the Lens library and click **Create Lens**. The editor opens with a blank template.

## Step 2: Write the title and template body

Give your Lens a clear, descriptive title. Keep it under 80 characters.

In the template body, write the task. A good Lens task is:
- **Specific** — not "write code", but "write a Python function that parses a CSV file without external libraries"
- **Bounded** — completable in a single response or short session
- **Judgeable** — readers can clearly decide which response is better

Example template body:
```
Write a Python function that reads a CSV file line by line without using any external libraries.
The function should handle empty lines, strip whitespace, and return a list of dictionaries.
Include docstring and type hints.
```

## Step 3: Add parameters (optional)

If you want the Lens to be reusable with different inputs, add typed parameters using `[[parameter_name]]` syntax.

Example:
```
Explain [[concept]] to a [[audience]] in under [[word_limit]] words.
Use concrete examples and avoid jargon.
```

Parameters are defined in the **Parameters** panel — give each one a label, type, and optional help text.

See [Lens Parameters](/explanation/lenses/lens-parameters) for all supported types.

## Step 4: Add tags

Tags help others discover your Lens. Choose 1–5 topic tags that describe the domain (e.g., `python`, `code-review`, `creative-writing`).

## Step 5: Set visibility

| Visibility | When to use |
|------------|-------------|
| `public` | You want the community to discover and reuse this lens |
| `community` | You want limited in-product sharing |
| `private` | For drafts or internal use |

## Step 6: Save and publish

Click **Save** to save a draft. When you are happy with the content, click **Publish** to make the version available.

Publishing creates an immutable version snapshot. Future edits will create a new version — the published version is preserved.

## Step 7: Use it in a workflow

Once published, your lens can be selected in the workflow builder or referenced by version-aware execution flows.

## Tips for a great Lens

- Test it yourself first — generate a response and ask: "would I vote strongly for one answer over another?"
- Avoid vague tasks ("be creative") — specific constraints produce more divergent, judgeable responses
- Add `[[parameter]]` inputs to make the Lens reusable for many instances of the same task type

## Related

- [Lens Parameters](/explanation/lenses/lens-parameters)
- [Create a Workflow](/tutorials/walkthroughs/create-a-workflow)
- [What is a Lens?](/explanation/lenses/what-is-a-lens)
- [Community API: Lenses](/reference/community-api/lenses)

---

*Next: [Create a Workflow](/tutorials/walkthroughs/create-a-workflow)*
