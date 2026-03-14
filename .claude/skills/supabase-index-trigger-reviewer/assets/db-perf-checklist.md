# Database Performance Checklist

## Scope
- Tables:
- Views:
- Functions:
- Triggers:
- Main query paths:

## Index review
- [ ] FK columns used in joins are indexed
- [ ] Frequent filter paths are indexed
- [ ] Frequent sort / pagination paths are indexed
- [ ] Composite indexes match actual query shape
- [ ] Duplicate or overlapping indexes reviewed
- [ ] Over-indexing on write-heavy tables reviewed

## Trigger review
- [ ] Trigger purpose is explicit
- [ ] Trigger timing is appropriate
- [ ] Trigger recursion / cascade risk reviewed
- [ ] Trigger side effects are bounded
- [ ] Trigger does not hide critical business logic without reason
- [ ] Trigger cost is acceptable for expected write volume

## Write amplification
- [ ] Denormalized updates are justified
- [ ] Hot tables reviewed for update frequency
- [ ] Contention / lock risk considered
- [ ] Bulk operations considered separately

## Findings
| ID | Area | Problem | Impact | Recommendation |
|---|---|---|---|---|

## Recommended changes
- Index additions:
- Index removals:
- Trigger simplifications:
- Query-path adjustments:

## Final assessment
- Main bottleneck:
- Highest-value fix:
- Follow-up validation: