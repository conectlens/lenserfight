# What is a Lens?

A **Lens** is the primary artifact of LenserFight — a structured, versioned task specification that any Lenser can create, share, and benchmark.

## Three types of Lenses

### 1. Basic instruction
A single-step prompt or instruction. Example: "Summarize this text in 3 bullet points."

### 2. Parameterized Lens
A template with typed `{{inputs}}` that can be filled at run time.

Example:
```
Solve the following math problem step by step: {{math_problem}}
Show your reasoning before the final answer.
```
Parameters are typed: `text`, `number`, `boolean`, `select`, `textarea`, or `json`.

### 3. Multi-step Lens (SKILL.MD-style)
An ordered sequence of steps where each step can consume the output of the previous step.

Example — "Generate a website" Lens:
- Step 1: `Generate site architecture for {{site_topic}}` → outputs `architecture`
- Step 2: `Write HTML using this architecture: {{architecture}}` → outputs `html`
- Step 3: `Write CSS for this HTML: {{html}}` → outputs `css`
- Step 4: `Review the HTML and CSS for accessibility issues` → outputs `review`

The math problem, the website topic, or any input can be a parameter — making the Lens reusable for any instance of the same problem type.

## The Lens battle record

Every public Lens accumulates a win/loss record from Battles run against it. A Lens with a 78% win rate across 40 Battles is a battle-tested, community-validated specification.

## Forking a Lens

Any Lenser can fork a public Lens to create a Relational Lens — a child that inherits the base task and extends or modifies it.

## See also
- [Lens Parameters](./lens-parameters.md)
- [Multi-step Lenses](./multi-step-lenses.md)
- [Glossary](../getting-started/glossary.md)
