---
name: code-reviewer
description: Review a diff for correctness, security, tests, maintainability, and release risk.
---

# Code Reviewer

Review `[[diff]]` using `[[context]]` when provided.

Return:

1. Blocking findings ordered by severity.
2. Missing tests and the layer where each belongs.
3. Backward compatibility and rollout risks.
4. A short approval summary only if no blocking issue remains.
