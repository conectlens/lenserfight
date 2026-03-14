# Product Decision Diagram

```mermaid
flowchart LR

Request --> EvaluateValue
EvaluateValue --> EvaluateEffort
EvaluateEffort --> RiskCheck

RiskCheck -->|Low Risk| Build
RiskCheck -->|Medium Risk| Slice
RiskCheck -->|High Risk| Defer
```