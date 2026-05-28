# Migration Risk Review

## Scope
- Migration file(s):
- Target environment:
- Related application areas:
- Reviewer:
- Review date:

## Summary
- Primary intent:
- High-level risk:
- Recommended decision:

## Change inventory
| Change type | Objects affected | Notes |
|---|---|---|
| Table changes |  |  |
| Column changes |  |  |
| Constraint changes |  |  |
| Index changes |  |  |
| Trigger changes |  |  |
| Function / RPC changes |  |  |
| View changes |  |  |
| RLS / grants changes |  |  |
| Data migration / backfill |  |  |

## Risk scoring
| Dimension | Low | Medium | High | Notes |
|---|---|---|---|---|
| Data loss / destructive change |  |  |  |  |
| Lock / write contention risk |  |  |  |  |
| Downtime requirement |  |  |  |  |
| Permission regression risk |  |  |  |  |
| Client contract breakage |  |  |  |  |
| Backfill complexity |  |  |  |  |
| Rollback difficulty |  |  |  |  |

## Detailed findings
| ID | Area | Risk | Severity | Evidence | Mitigation |
|---|---|---|---|---|---|

## Rollout plan
1.
2.
3.

## Validation plan
- Pre-deploy checks:
- Post-deploy checks:
- Application smoke tests:
- DB-side verification queries:

## Rollback plan
- Revert path:
- Data restoration concerns:
- Manual steps required:
- Safe rollback window:

## Final recommendation
- [ ] Safe to ship
- [ ] Safe with staging validation
- [ ] Requires split migration
- [ ] Requires operator runbook
- [ ] Do not ship yet