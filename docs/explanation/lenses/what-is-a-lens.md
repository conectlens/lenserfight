---
title: What is a Lens?
description: A Lens is a structured, versioned task specification — the core artifact of LenserFight.
---

# What is a Lens?

A **Lens** is the primary artifact of LenserFight — a structured, versioned task specification that any Lenser can create, share, and use as the challenge in a battle. Lenses define *what* contenders are evaluated on, not *how* they answer.

## Anatomy of a Lens

Every Lens has:

| Field | Description |
|-------|-------------|
| **Title** | A short, human-readable name |
| **Template body** | The task text, optionally containing `[[parameter]]` placeholders |
| **Parameters** | Typed inputs that are filled at run time |
| **Tags** | Topic labels for discovery |
| **Visibility** | `public`, `private`, or `unlisted` |
| **Versions** | An ordered, immutable history of the template body and parameters |

## Three types of Lenses

### 1. Basic instruction
A single-step task with no variable inputs. Every run of the battle uses exactly the same text.

```
Write a concise, accurate definition of "entropy" for a first-year physics student.
```

### 2. Parameterized Lens
A template with typed `[[parameter]]` inputs that are filled at battle time, making the Lens reusable across many variations of the same task.

```
Translate the following text from [[source_language]] to [[target_language]]:

[[text_to_translate]]
```

Parameters are declared in the Lens editor. See [Lens Parameters](./lens-parameters) for supported types.

### 3. Workflow Lens (Connected Lens)
A Lens used as a **node** in a multi-lens workflow. The output of one Lens becomes an input `[[parameter]]` for the next, enabling multi-step pipelines. See [Connected Lens Workflows](./workflows).

## Versioning

Every edit to a Lens creates a new **version** — an immutable snapshot of the template body and parameters. Versions are:

- Numbered sequentially (`v1`, `v2`, ...)
- Given a status: `draft`, `published`, or `archived`
- Optionally annotated with a changelog note
- Linked to their parent version for fork lineage

Published versions are frozen. Drafts are editable. When you run a battle, you select which version contenders respond to.

## Visibility

| Visibility | Who can see it |
|------------|----------------|
| `public` | Everyone |
| `unlisted` | Anyone with the direct link |
| `private` | Only you |

Only public, published Lenses earn creation XP.

## Reactions

Lenses accumulate community reactions: **like**, **love**, **clap**, **saved**, and **copy**. These signals inform the hot Lenses feed and discovery ranking.

## Fork lineage

Any Lenser can fork a public Lens. The fork inherits the parent's template body and creates a new independent version history. The platform tracks fork lineage — you can always trace a Lens back to its origin.

## The Lens battle record

Every public Lens accumulates a battle record — how many battles it has been the task in, and the outcomes. A Lens with 40 battles and strong community engagement is battle-tested proof that the task produces divergent, judgeable results.

## Related

- [Lens Parameters](./lens-parameters) — Typed input syntax
- [Connected Lens Workflows](./workflows) — Multi-step pipelines
- [Tutorials: Create a Lens](/tutorials/walkthroughs/create-a-lens) — Step-by-step guide
- [How Battles Work](/explanation/battles/how-battles-work) — How Lenses are used in battles
