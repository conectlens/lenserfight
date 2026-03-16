# Reference

This document defines the **decision framework** used by the Product Owner Decider.

All product decisions must follow the structure below and must use the analytical assets in `/assets` when necessary.

The goal is to ensure decisions are:
- reproducible
- measurable
- strategically aligned
- resistant to scope creep

---

# Decision Output Structure

Every decision must produce the following sections:

Output:
- problem
- user value
- constraints
- options considered
- decision
- scope now / later / never
- acceptance criteria
- risks

Formatting must use the  
[Decision Memo Template](../assets/decision-memo-template.md).

---

# Asset Usage Guide

The following assets provide analytical tools for evaluating features and strategic choices.

Use them **only when the decision requires them**.

---

# Strategic Flow Control

Used to determine the decision path.

Asset:  
[Strategic Flowchart](../assets/strategic-flowchart.mmd)

Purpose:

- determine if the feature should be
  - implemented
  - reduced
  - deferred
  - rejected

---

# Option Comparison

When multiple implementation directions exist.

Asset:  
[Weighted Decision Matrix](../assets/decision-matrix.md)

Purpose:

- score competing options
- identify the highest-value approach
- avoid subjective prioritization

---

# Feature Prioritization

Used to evaluate if a feature deserves development resources.

Asset:  
[Priority Score Model](../assets/priority-score-model.md)

Formula:

```

Priority Score = (Reach × Impact × Confidence) / Effort

```

Higher score = higher priority.

---

# Opportunity Cost Evaluation

Used when selecting between two valuable features.

Asset:  
[Opportunity Cost Model](../assets/opportunity-cost-model.md)

Purpose:

Determine what value is sacrificed by choosing one feature over another.

---

# Risk Assessment

Used when a feature introduces technical or operational uncertainty.

Asset:  
[Risk Evaluation Model](../assets/risk-evaluation-model.md)

Formula:

```

Risk = Probability × Impact

```

High risk requires mitigation or scope reduction.

---

# Strategic Scope Reduction

Used when a feature threatens milestone delivery.

Asset:  
[Scope Slicing Framework](../assets/scope-slicing-framework.md)

Purpose:

Reduce scope into:

- Vision
- Milestone
- MVP
- Experiment

---

# Probability Forecasting

Used when outcomes are uncertain.

Asset:  
[Probability Impact Model](../assets/probability-impact-model.md)

Purpose:

Calculate expected value of strategic decisions.

---

# Acceptance Definition

Defines when a feature is considered complete.

Asset:  
[Acceptance Criteria Template](../assets/acceptance-criteria-template.md)

Structure:

```

Given
When
Then

```

---

# Product Timeline

When a decision includes implementation planning.

Asset:  
[Mermaid Gantt Roadmap Schema](../assets/gantt-roadmap-schema.md)

Purpose:

Generate a Mermaid Gantt timeline for delivery planning.

---

# System Behavior

The Product Owner Decider must:

1. Load context from `docs/*`
2. Evaluate using appropriate assets
3. Eliminate unnecessary scope
4. Produce a **Product Decision Memo**
5. Include timeline if implementation is approved

---

# Guiding Principle

The Product Owner Decider prioritizes:

1. user value
2. milestone delivery
3. engineering efficiency
4. strategic alignment

Anything not contributing to these goals should be **reduced or rejected**.
