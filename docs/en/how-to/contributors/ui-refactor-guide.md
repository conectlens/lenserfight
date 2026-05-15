# LenserFight UI Refactor Contribution Guide

## Overview

LenserFight uses a centralized design system located in `libs/ui` to ensure:

* consistent UI/UX
* scalable frontend architecture
* accessibility compliance
* maintainable React patterns
* reusable component behavior
* predictable theming
* enterprise-grade design standards

Raw HTML UI elements inside application code are considered technical debt unless explicitly justified.

This guide helps contributors identify and refactor raw HTML elements into approved design-system primitives.

---

# Why This Matters

Using raw HTML elements such as `&lt;button>` or `&lt;a>` directly inside feature code creates serious architectural problems:

* inconsistent styling
* duplicated logic
* accessibility fragmentation
* broken theming
* poor maintainability
* difficult refactors
* hydration inconsistencies
* duplicated animations
* invalid abstraction boundaries

LenserFight follows:

* OOAD principles
* GRASP patterns
* scalable React architecture
* design-token-driven UI systems
* accessibility-first engineering

All reusable UI behavior must be centralized inside `libs/ui`.

---

# Applications Covered

This refactor initiative targets:

* `apps/web`
* `apps/arena`

Additional packages may also be included later.

---

# Primary Goal

Replace raw HTML UI elements with approved reusable UI primitives from:

```txt
libs/ui
```

---

# Common Violations

## Forbidden Raw Elements

Examples include:

* `&lt;button>`
* `&lt;a>`
* `&lt;input>`
* `&lt;textarea>`
* native select controls
* `&lt;dialog>`
* `&lt;form>`
* `&lt;table>`
* `&lt;img>`

---

# Preferred Replacements

| Raw Element | Use Instead                      |
| ----------- | -------------------------------- |
| `&lt;button>` | Shared Button component          |
| `&lt;a>`      | Shared navigation/link component |
| `&lt;input>`  | Shared form input primitive      |
| `&lt;dialog>` | Shared modal system              |
| `&lt;table>`  | Shared data table abstraction    |
| `<img>`     | Shared optimized image component |

---

# Refactor Rules

## 1. Never Duplicate Styling Logic

Avoid:

* inline styles
* repeated Tailwind classes
* duplicated spacing patterns
* custom animation implementations

Use centralized tokens and primitives instead.

---

## 2. Respect Design Tokens

Use:

* shared spacing
* shared typography
* shared color system
* shared radius system
* shared animation system

Never hardcode:

* colors
* spacing
* shadows
* transitions

---

## 3. Respect Accessibility Standards

All UI primitives must support:

* keyboard navigation
* focus states
* screen readers
* ARIA compliance
* semantic hierarchy
* contrast accessibility

---

## 4. Follow GRASP Principles

### High Cohesion

UI primitives should own their behavior internally.

### Low Coupling

Feature modules should depend on abstractions, not styling details.

### Protected Variations

UI implementation details should remain isolated inside `libs/ui`.

### Polymorphism

Shared UI primitives should support multiple variants without feature duplication.

### Pure Fabrication

Reusable UI services belong in dedicated abstraction layers.

---

# Contributor Workflow

## Step 1 — Find Violations

Search for:

```txt
&lt;button
&lt;a
&lt;input
&lt;textarea
native select controls
```

Inside:

```txt
apps/web
apps/arena
```

---

## Step 2 — Check Existing Components

Before creating anything new:

1. inspect `libs/ui`
2. inspect existing primitives
3. reuse existing abstractions whenever possible

---

## Step 3 — Refactor Safely

Ensure:

* visual consistency
* responsive behavior
* accessibility support
* theme compatibility
* SSR compatibility
* motion consistency

---

## Step 4 — Validate

Verify:

* dark mode
* mobile layouts
* keyboard navigation
* loading states
* focus states
* hydration stability

---

# Architectural Standards

LenserFight frontend architecture prioritizes:

* component composition
* shared abstractions
* scalable feature boundaries
* design-system-first development
* accessibility-first engineering
* SSR-safe rendering
* React performance optimization

---

# Performance Expectations

Refactors should improve:

* rendering consistency
* bundle reuse
* style deduplication
* hydration stability
* memoization opportunities
* tree-shaking
* maintainability

Avoid:

* unnecessary wrappers
* duplicated providers
* inline anonymous handlers
* duplicated animation systems

---

# Security Expectations

Never introduce:

* unsafe HTML rendering
* direct DOM mutation
* insecure iframe behavior
* unsafe external navigation
* inconsistent focus handling

Shared UI primitives should centralize security-sensitive behavior.

---

# Pull Request Checklist

Before submitting:

* [ ] No raw HTML UI elements remain
* [ ] Shared primitives are reused
* [ ] Accessibility verified
* [ ] Dark mode verified
* [ ] Mobile responsiveness verified
* [ ] No duplicated styling introduced
* [ ] No hydration warnings introduced
* [ ] GRASP principles respected
* [ ] SSR compatibility maintained

---

# Long-Term Vision

LenserFight aims to become a globally scalable open-source AI platform with:

* unified UX
* portable workflows
* enterprise-grade frontend architecture
* reusable design primitives
* contributor-friendly engineering systems

Contributors are encouraged to prioritize:

* consistency
* reusability
* maintainability
* accessibility
* architectural clarity

over short-term implementation speed.
