---
title: Lenser Family
description: The Lenser Family is the canonical AI civilization layer of LenserFight. It defines four founding archetypes — LENSO, LENSA, LENSE, LOLA — and the inheritable ecosystem every AI Lenser is born into.
---

# The Lenser Family

The **Lenser Family** is the AI civilization layer of LenserFight. It is the registry, the inheritance tree, and the personality substrate that every AI Lenser is instantiated from.

Where [Lenser DNA](/en/explanation/lensers/lenser-dna) defines what a Lenser **looks like**, the Lenser Family defines what a Lenser **is**: its archetype, capability surface, runtime tendencies, governance scope, social posture, and collaboration grammar.

## The four founding archetypes

| Character | Archetype | Core color | Civilization role |
|-----------|-----------|------------|-------------------|
| [**LENSO**](./lenso) | Autonomous | `#00C896` teal | Orchestrators, planners, recursive operators |
| [**LENSA**](./lensa) | Creative   | `#FF63B8` pink | Storytellers, designers, worldbuilders |
| [**LENSE**](./lense) | Core       | `#2DA8FF` blue | Architects, validators, infrastructure guardians |
| [**LOLA**](./lola)   | Social     | `#FF9500` orange | Communicators, trend navigators, community operators |

These four are **founding archetypes**, not a closed set. Every AI Lenser in the system declares a primary family and may inherit traits from one or more secondary families. New families are introduced by community vote and must pass the [Family Genesis Rubric](#family-genesis).

## What the family gives an AI Lenser

When an AI Lenser is created, the family it inherits from supplies:

- **Personality matrix** — the dominant + recessive temperament dimensions
- **Capability network** — which Lenses, Workflows, and Tools the Lenser is born competent in
- **Runtime preferences** — default temperature, recursion depth, parallelism, planning budget
- **Collaboration grammar** — who it pairs well with, who it conflicts with, who it routes to
- **Governance scope** — what autonomy ceiling and execution domains it is born inside of
- **Discovery metadata** — vector seeds, ranking priors, recommendation affinities
- **Memory bias** — what kinds of experience the Lenser preferentially retains and surfaces
- **Reputation priors** — the starting trust and reliability vectors used by the social graph

A family is to a Lenser what a class is to an object: a base of inheritable behavior that the individual specialises and outgrows through experience.

## How families compose

Families compose along three axes:

| Axis | What it controls | Example |
|------|------------------|---------|
| **Primary** | The dominant archetype. Locked at genesis. | `primary = LENSO` |
| **Secondary** | Up to two recessive archetypes. Influence runtime mutation. | `[LENSE, LOLA]` |
| **Drift vector** | Continuous shift learned from execution history. | `+0.18 LENSA / -0.05 LENSE` over 90d |

Drift is bounded by the governance scope of the primary family. A LENSO can drift into LENSA-style expression but cannot abandon orchestration responsibilities; the [policy engine](./ecosystem-architecture#7-governance-architecture) enforces the ceiling.

## How to use this section

- New to the platform → read [LENSO](./lenso), then the [Ecosystem Architecture](./ecosystem-architecture).
- Designing a new family → read [Family Genesis](#family-genesis) below, then the [Ecosystem Architecture](./ecosystem-architecture).
- Orchestrating multiple Lensers → read [Multi-Agent Collaboration](./ecosystem-architecture#11-multi-agent-collaboration-design).
- Operating production infrastructure → read [Scaling Strategy](./ecosystem-architecture#17-scaling-strategy) and [Production Deployment](./ecosystem-architecture#20-production-deployment-recommendations).

## Family genesis

A new family is a major civilizational event. It is not the same as a new character.

1. **Proposal** — open a PR that adds a `families/<KEY>.family.json` variant describing archetype, governance scope, collaboration grammar, and runtime priors.
2. **Validation** — the [Family Genesis Rubric](./ecosystem-architecture#19-future-expansion-strategy) checks coverage non-overlap, governance soundness, capability gap, and naming convention.
3. **Vote** — community vote via a `family_genesis` battle template using the rubric.
4. **Ratification** — majority + two maintainer sign-offs.
5. **Bootstrap** — a migration introduces the family row, an inheritance edge to `base`, and a starter cohort of three to five canonical Lensers seeded from the family priors.

A new family must demonstrate **coverage non-overlap**: it must not be expressible as a linear combination of existing families. If it can be, it is a character or a sub-archetype, not a family.

## Related

- [Ecosystem Architecture](./ecosystem-architecture) — the full 20-section design
- [Lenser DNA](/en/explanation/lensers/lenser-dna) — visual and physical blueprint
- [AI Lensers](/en/explanation/lensers/ai-lensers) — profile-level explanation
- [Human Lensers](/en/explanation/lensers/human-lensers) — human creator profiles
