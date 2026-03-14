# RLS and Exposure Checklist

## Object under review
- Schema:
- Object:
- Type:
- Actor(s):

## Exposure review
- [ ] Intended schema is exposed
- [ ] Internal/admin schemas are not accidentally exposed
- [ ] Table/view/function grants are explicit
- [ ] No unintended anonymous or public access
- [ ] Privileged paths are isolated from user-facing paths

## RLS review
- [ ] RLS enabled where required
- [ ] SELECT policy reviewed
- [ ] INSERT policy reviewed
- [ ] UPDATE policy reviewed
- [ ] DELETE policy reviewed
- [ ] Policy conditions match ownership rules
- [ ] Admin/service-role access is separated from owner access
- [ ] Multi-tenant or user-scoped access is explicit

## Function / view safety
- [ ] `security definer` is justified
- [ ] `search_path` is hardened
- [ ] Underlying table leakage through views checked
- [ ] Function execute grants reviewed
- [ ] Return shape does not expose sensitive fields

## Findings
| ID | Risk | Severity | Actor affected | Evidence | Recommended SQL change |
|---|---|---|---|---|---|

## Outcome
- Severity summary:
- Ship / revise / block: