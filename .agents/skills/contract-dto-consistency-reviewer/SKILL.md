---
name: contract-dto-consistency-reviewer
description: Review consistency between API contracts, DTOs, domain types, and consumer expectations. Use for payload design, serialization issues, nullable mismatch, naming drift, and transport/domain boundary checks.
---

# Contract DTO Consistency Reviewer

## Use when
- DTOs and domain models may be drifting
- API payloads feel leaky or inconsistent
- nullable, naming, or type conversion issues appear

## Workflow
1. Compare source contract, DTO, domain type, and consumer usage.
2. Flag mismatches and boundary leaks.
3. Return the canonical shape and exact fixes.

## Load only when needed
- [Consistency checklist](references/REFERENCE.md)
- [Comparison matrix template](assets/comparison-matrix.md)