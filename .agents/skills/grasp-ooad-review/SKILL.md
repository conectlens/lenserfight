---
name: grasp-ooad-review
description: Review design decisions using GRASP, OOAD responsibility assignment, and standard refactoring rules. Use when code placement, object responsibility, coupling, cohesion, or refactoring direction is unclear.
user-invocable: false
---
# GRASP OOAD review

Use this as background guidance during design and review.

## Responsibility checks
- Who has the information needed to perform this behavior?
- Who should coordinate the use case without absorbing unrelated details?
- Which dependency is unstable and should be hidden behind indirection?
- Is this module gaining more than one reason to change?

## Default moves
- Move behavior toward the owner of the relevant data.
- Split orchestration from pure policy.
- Replace branching with polymorphism when variants are stable and named.
- Extract adapters for infrastructure.
- Collapse needless indirection when it adds no protection.

## Smell to refactoring map
- Long Method -> Extract Function, Split Phase
- Large Class -> Extract Class
- Feature Envy -> Move Function
- Divergent Change -> Extract Class or module split
- Shotgun Surgery -> Move behavior to a better center of gravity
- Primitive Obsession -> Introduce Value Object or Parameter Object
