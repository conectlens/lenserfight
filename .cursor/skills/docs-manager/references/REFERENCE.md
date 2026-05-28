# Page templates

Optional starter templates for each Diátaxis type. Use them when there is no neighboring page to model after — otherwise match the shape of nearby pages. Sections can be added, removed, or reordered to fit the topic.

## how-to

```markdown
---
title: <Action Verb> <Object>
description: <One sentence: what the reader can accomplish after this guide.>
---

# <Action Verb> <Object>

<One paragraph: what this guide covers and who it's for.>

## Prerequisites

- …

## Steps

### 1. <First action>

…

### 2. <Second action>

…

## Next steps

- [Related guide](../related.md)
```

## reference

```markdown
---
title: <Subject> Reference
description: <One sentence: what this reference covers.>
---

# <Subject> Reference

## Overview

<One paragraph.>

## <Entity or command>

<Concise factual description. Tables for parameters/fields.>

| Field | Type | Description |
|---|---|---|
| … | … | … |
```

## tutorial

```markdown
---
title: <Goal the learner achieves>
description: <One sentence: what the learner builds or learns.>
---

# <Goal>

<Context: what problem this tutorial solves, for whom.>

## What you'll build

<Short description + list of outcomes.>

## Before you start

- …

## Part 1 — <First milestone>

…

## Part 2 — <Second milestone>

…

## What you learned

- …
```

## explanation

```markdown
---
title: <Concept> — How It Works
description: <One sentence: the key idea explained here.>
---

# <Concept>

## The problem

…

## How LenserFight approaches this

…

## Trade-offs

…

## Related concepts

- …
```
