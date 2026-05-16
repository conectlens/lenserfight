---
title: Coding Workflows
description: Three complete developer Workflow examples — feature delivery, bug investigation, and code documentation — with full Lens definitions and edge wiring.
---

# Coding Workflows

This page shows three complete Workflows for software development teams. Each one defines every Lens node, the exact template body to write, the parameters to add, and how to wire the edges so outputs flow from one step to the next.

## Workflow 1 — Feature Implementation Pipeline

**Goal:** Turn a GitHub issue or feature spec into a reviewed, tested, and documented pull request package.

**Who it is for:** Solo developers and small engineering teams who want structured output for each phase of feature delivery.

### Pipeline overview

```
[1. Requirements Clarifier]
        ↓ structured requirements
[2. Implementation Planner]
        ↓ step-by-step plan
[3. Code Generator]
        ↓ code output
[4. Test Case Generator]
        ↓ test suite
[5. PR Description Writer]
        ↓ final PR package (leaf output)
```

---

### Lens 1 — Requirements Clarifier

**Purpose:** Convert a loose feature request into a structured, unambiguous requirements list.

**Template body:**

```
You are a senior engineering lead reviewing a feature request before implementation begins.

Feature request:
[[feature_request]]

Technology context (language, framework, existing patterns):
[[tech_context]]

Produce a structured requirements document with these sections:

## Functional Requirements
List every concrete behaviour the feature must implement. Use "The system shall..." phrasing.
Number each requirement.

## Non-functional Requirements
Performance targets, security constraints, accessibility needs, browser/runtime compatibility.

## Out of Scope
Explicitly list what this feature does NOT cover.

## Assumptions
State every assumption you are making about existing infrastructure, user permissions, data formats,
or third-party services.

## Open Questions
List anything that needs a decision from a product owner or architect before implementation can start.

Be specific. Avoid vague requirements like "should be fast" — instead write "must respond in under 200ms
at p99 for payloads under 100KB".
```

**Parameters to add:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `feature_request` | Long Text | Yes | Paste the GitHub issue, Jira ticket, or plain description |
| `tech_context` | Long Text | No | e.g. "TypeScript, React 18, Supabase, REST API" |

---

### Lens 2 — Implementation Planner

**Purpose:** Convert structured requirements into an ordered, step-by-step implementation plan.

**Template body:**

```
You are a staff engineer breaking down a feature into implementation tasks.

Structured requirements:
[[requirements]]

Produce an implementation plan with these sections:

## Task Breakdown
Number every task. For each task:
- Title (imperative: "Add X", "Refactor Y")
- Which files or modules are likely affected
- Estimated effort: S (< 2h), M (2–4h), L (> 4h)
- Dependencies on other tasks (by number)

## Suggested Order
List the tasks in the order a developer should implement them, with a one-line reason.

## Risk Flags
Identify the top 2–3 implementation risks (e.g. breaking change, performance edge case, ambiguous
requirement) and how to mitigate each.

## Definition of Done
A checklist the developer can tick off before marking the task complete.

Do not write any code. Output only the plan.
```

**Parameters to add:**

| Label | Type | Required |
|-------|------|----------|
| `requirements` | Long Text | Yes |

**Edge:** connect Lens 1 output → `requirements`

---

### Lens 3 — Code Generator

**Purpose:** Generate the implementation based on the plan and requirements.

**Template body:**

```
You are a senior software engineer implementing a feature.

Implementation plan:
[[implementation_plan]]

Requirements summary:
[[requirements_summary]]

Programming language and framework:
[[language]]

Write the complete implementation. Follow these rules:
- Match the naming conventions and patterns described in the context
- Include all necessary imports
- Add JSDoc/docstring comments to exported functions and types
- Handle errors explicitly — never swallow exceptions silently
- Prefer composition over inheritance
- Do not include any code that was marked "out of scope" in the requirements
- If a decision is ambiguous, implement the most conservative option and add a TODO comment

After the code, add a ## Implementation Notes section explaining:
1. Any tradeoffs you made
2. Anything the reviewer should look at carefully
3. Any TODOs that remain
```

**Parameters to add:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `implementation_plan` | Long Text | Yes | — |
| `requirements_summary` | Long Text | Yes | — |
| `language` | Short Text | Yes | e.g. "TypeScript / Node.js 20 / Express" |

**Edges:**
- Lens 2 output → `implementation_plan`
- Lens 1 output → `requirements_summary`

> **Note:** `language` is a root input — the user fills it when running the Workflow.

---

### Lens 4 — Test Case Generator

**Purpose:** Generate a complete test suite for the implementation.

**Template body:**

```
You are a senior QA engineer writing tests for a new feature.

Code to test:
[[code]]

Requirements the code must satisfy:
[[requirements]]

Testing framework and conventions:
[[test_framework]]

Generate a complete test suite. For every exported function or component:

1. Happy path — at least one test with typical valid input
2. Edge cases — empty arrays, zero values, maximum lengths, Unicode input
3. Error cases — invalid types, missing required fields, network failure simulation
4. Boundary values — off-by-one, min/max, null vs undefined

Each test must:
- Have a descriptive name: "should [expected behaviour] when [condition]"
- Include the arrange / act / assert structure as comments
- Use only real assertions — no expect(true).toBe(true) placeholder tests

After the tests, add a ## Coverage Notes section listing any scenarios you deliberately skipped
and the reason.
```

**Parameters to add:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `code` | Long Text | Yes | — |
| `requirements` | Long Text | Yes | — |
| `test_framework` | Short Text | No | e.g. "Vitest with @testing-library/react" |

**Edges:**
- Lens 3 output → `code`
- Lens 1 output → `requirements`

---

### Lens 5 — PR Description Writer

**Purpose:** Produce a reviewable pull request description from all the artifacts.

**Template body:**

```
You are writing a pull request description for a peer code review.

Code changes summary:
[[code_summary]]

Implementation notes from the developer:
[[implementation_notes]]

Test coverage summary:
[[test_summary]]

Write a professional PR description with these sections:

## Summary
2–3 bullets explaining WHAT changed and WHY. Focus on the business or product impact, not the
mechanics. Start each bullet with a past-tense verb (Added, Fixed, Refactored, Removed).

## How it works
A short paragraph (3–5 sentences) explaining the key design decision and any non-obvious behaviour.

## Test plan
A numbered checklist of manual steps a reviewer can follow to verify the change works.
Include at least one step that exercises the error path.

## Checklist
- [ ] Tests pass locally
- [ ] No secrets or credentials in diff
- [ ] Documented public API changes
- [ ] Backward compatible or migration path provided

## Notes for reviewer
Call out anything that needs a judgment call, a second opinion, or that you are unsure about.

Tone: direct and professional. Do not pad. Reviewers are busy.
```

**Parameters to add:**

| Label | Type | Required |
|-------|------|----------|
| `code_summary` | Long Text | Yes |
| `implementation_notes` | Long Text | No |
| `test_summary` | Long Text | No |

**Edges:**
- Lens 3 output → `code_summary`
- Lens 4 output → `test_summary`

---

### Running this Workflow

Root inputs (filled by the user at run time):
- **Lens 1:** `feature_request` (required), `tech_context` (optional)
- **Lens 3:** `language`
- **Lens 4:** `test_framework`

Everything else flows automatically through edges.

**Expected run time:** 3–5 minutes depending on model and code length.

**Leaf output:** Lens 5 produces the PR description. You can also inspect each intermediate node's output in the Run results panel.

---

## Workflow 2 — Bug Investigation Pipeline

**Goal:** Turn an error log or bug report into a root-cause analysis, a concrete fix, and a regression test.

**Who it is for:** On-call engineers, developers debugging production issues.

### Pipeline overview

```
[1. Bug Triage]
        ↓ structured diagnosis
[2. Root Cause Analyzer]
        ↓ root cause + fix plan
[3. Fix Generator]
        ↓ patched code
[4. Regression Test Writer]
        ↓ test that catches the bug (leaf output)
```

---

### Lens 1 — Bug Triage

**Template body:**

```
You are a senior engineer triaging a bug report.

Error log or stack trace:
[[error_log]]

Steps to reproduce (if known):
[[reproduction_steps]]

Environment and context:
[[environment]]

Produce a triage summary:

## Severity Assessment
Rate severity: Critical / High / Medium / Low with one-sentence justification.
Classify the type: crash, data corruption, performance regression, security issue, UX defect, or other.

## Affected Scope
What systems, users, or data are impacted?

## Initial Hypotheses
List the 3 most likely root causes, ranked by probability. For each, state:
- What evidence supports it
- What evidence would disprove it

## Immediate Mitigations
Any actions that can reduce impact while the fix is developed (feature flag, rate limit, rollback).

## Information Gaps
What additional logs, traces, or context would confirm the diagnosis?
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `error_log` | Long Text | Yes |
| `reproduction_steps` | Long Text | No |
| `environment` | Short Text | No |

---

### Lens 2 — Root Cause Analyzer

**Template body:**

```
You are debugging a software defect. Work through the evidence carefully.

Bug triage summary:
[[triage]]

Relevant source code (the file or function suspected to contain the bug):
[[source_code]]

Based on the triage and the code, identify the root cause:

## Root Cause
One clear, specific sentence naming the exact line, condition, or assumption that is wrong.
Avoid vague descriptions like "the code doesn't handle the edge case" — name the edge case.

## Why It Happens
Step-by-step explanation of the execution path that leads to the failure.

## Fix Approach
Describe the fix at the conceptual level before writing code:
- What exactly needs to change
- What must NOT change (behaviour that other code depends on)
- Any migration needed (schema, API contract, cached data)

## Similar Risks
Are there other places in the codebase that likely have the same pattern? Name them if you can infer
them from the code above.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `triage` | Long Text | Yes |
| `source_code` | Long Text | Yes |

**Edge:** Lens 1 output → `triage`

---

### Lens 3 — Fix Generator

**Template body:**

```
Apply the described fix to the code.

Root cause analysis and fix approach:
[[root_cause_analysis]]

Original source code:
[[original_code]]

Language and framework:
[[language]]

Output:
1. The corrected code — complete file or function, not a diff snippet
2. Inline comments on every changed line explaining WHY the change was made
3. A ## What Changed section listing each modification in plain English

Rules:
- Change only what is necessary to fix the bug. Do not refactor unrelated code.
- Preserve the existing public API unless the root cause requires a breaking change.
- If a breaking change is unavoidable, add a ## Breaking Change Warning section.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `root_cause_analysis` | Long Text | Yes |
| `original_code` | Long Text | Yes |
| `language` | Short Text | No |

**Edges:**
- Lens 2 output → `root_cause_analysis`

---

### Lens 4 — Regression Test Writer

**Template body:**

```
Write a regression test that proves the bug is fixed and will catch any future regression.

Bug description and root cause:
[[bug_description]]

Fixed code:
[[fixed_code]]

Testing framework:
[[test_framework]]

Requirements for the test:
- The test must FAIL on the original buggy code
- The test must PASS on the fixed code
- The test name must describe the bug, e.g. "should not throw when user_id is null"
- Include a comment block at the top explaining: what bug this catches, the original symptoms,
  and the date it was fixed (use TODAY as a placeholder)
- Cover the exact input that triggered the original bug
- Add at least one test for a closely related edge case that could regress in future
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `bug_description` | Long Text | Yes |
| `fixed_code` | Long Text | Yes |
| `test_framework` | Short Text | No |

**Edges:**
- Lens 2 output → `bug_description`
- Lens 3 output → `fixed_code`

---

### Running this Workflow

Root inputs:
- **Lens 1:** `error_log`, `reproduction_steps`, `environment`
- **Lens 2:** `source_code` (paste the suspect file or function)
- **Lens 3:** `language`
- **Lens 4:** `test_framework`

---

## Workflow 3 — Code Documentation Pipeline

**Goal:** Generate accurate, useful documentation for an existing module or API — without hallucinating behaviour that isn't in the code.

**Who it is for:** Teams that have working code but missing or outdated documentation; open-source maintainers preparing a release.

### Pipeline overview

```
[1. Code Analyzer]
        ↓ structural summary
[2. API Doc Generator]
        ↓ reference docs
[3. Usage Example Writer]
        ↓ code examples
[4. README Composer]
        ↓ final README (leaf output)
```

---

### Lens 1 — Code Analyzer

**Template body:**

```
Analyze the following source code and produce a structural summary. Do not document — only describe.

Source code:
[[source_code]]

Module name:
[[module_name]]

Produce:

## Module Purpose
One paragraph: what this module does, what problem it solves, and what it does NOT do.

## Public API Surface
List every exported function, class, type, and constant. For each:
- Name
- Signature (parameters and return type, inferred from the code)
- One-sentence description of what it does

## Internal Dependencies
List every imported module this code depends on. Mark each as: stdlib / external package / internal module.

## State and Side Effects
Does this module maintain mutable state? Does it write to disk, network, or database? List all side effects.

## Identified Gaps
List anything in the code that appears undocumented, unclear, or inconsistent (e.g. a parameter that
is sometimes null, a function that throws undocumented exceptions).
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `source_code` | Long Text | Yes |
| `module_name` | Short Text | Yes |

---

### Lens 2 — API Doc Generator

**Template body:**

```
Write reference documentation for a software module.

Structural analysis:
[[code_analysis]]

Target documentation format:
[[doc_format]]

Rules:
- Document only what the code actually does — never invent behaviour
- For each function: purpose, parameters (name, type, description, whether optional), return value,
  thrown exceptions, and a one-line usage note
- Use the exact parameter names from the code
- If a parameter type is inferred, mark it "(inferred)"
- Flag every ambiguity from the Identified Gaps section with a ⚠️ warning
- Do not include implementation details — only the contract

Output format: {{doc_format}} (e.g. JSDoc, Markdown, docstring, OpenAPI YAML)
```

**Parameters:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `code_analysis` | Long Text | Yes | — |
| `doc_format` | Short Text | No | JSDoc, Markdown, Python docstring, OpenAPI YAML |

**Edge:** Lens 1 output → `code_analysis`

---

### Lens 3 — Usage Example Writer

**Template body:**

```
Write practical code examples for a software module.

API documentation:
[[api_docs]]

Target audience:
[[audience]]

Write 3–5 complete, runnable code examples. For each example:
- Start with a one-sentence comment explaining what scenario it demonstrates
- Use realistic variable names and values (not foo, bar, test123)
- Show the complete call including imports and any required setup
- Show what the output or return value looks like as a comment
- Cover a mix of: basic usage, optional parameters, error handling

After the examples, add a ## Common Mistakes section listing the top 3 errors developers make
when using this API and how to avoid them.

All examples must work with the API as documented — do not invent methods or parameters.
```

**Parameters:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `api_docs` | Long Text | Yes | — |
| `audience` | Short Text | No | e.g. "junior developers new to the codebase" |

**Edge:** Lens 2 output → `api_docs`

---

### Lens 4 — README Composer

**Template body:**

```
Write a README for a software module or package.

Module analysis:
[[module_analysis]]

API documentation:
[[api_docs]]

Usage examples:
[[examples]]

Project context (repo name, package manager, language):
[[project_context]]

Structure the README as follows:

# [Module Name]
One-paragraph description of what this module does and why it exists.

## Installation
The install command. If this is an internal module, explain how to import it instead.

## Quick Start
The single most common use case — a minimal working example in under 10 lines.

## API Reference
Embed the API documentation here.

## Examples
Embed the usage examples here.

## Error Handling
How to handle the documented error cases.

## Contributing
One sentence pointing to CONTRIBUTING.md or equivalent.

Keep the README honest: if something is not yet supported, say so.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `module_analysis` | Long Text | Yes |
| `api_docs` | Long Text | Yes |
| `examples` | Long Text | Yes |
| `project_context` | Short Text | No |

**Edges:**
- Lens 1 output → `module_analysis`
- Lens 2 output → `api_docs`
- Lens 3 output → `examples`

---

## Common mistakes to avoid

**Pasting too much code into one Lens.**
Lens nodes work best with focused, bounded inputs. If a module is very large, split it into smaller files and run the Documentation Pipeline once per file.

**Using vague root inputs.**
The quality of every downstream step depends on the quality of your first input. "fix the bug" produces weak output. "NullPointerException on line 47 of UserService.kt when user_id is null during concurrent login" produces precise analysis.

**Skipping the planner step.**
Going directly from requirements to code generation produces inconsistent results. The planner step forces the model to commit to an approach before writing any code, which significantly improves coherence.

**Not specifying the language.**
Always set `language` and `test_framework` as root inputs. A model that doesn't know your framework will produce syntactically invalid or idiomatically wrong code.

---

*Next: [Content Creation Workflows →](./content-creation-workflow)*
