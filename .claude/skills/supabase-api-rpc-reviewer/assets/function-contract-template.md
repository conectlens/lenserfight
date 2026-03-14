# Function / RPC Contract Review

## Function
- Name:
- Schema:
- Purpose:
- Caller(s):

## Interface
- Inputs:
- Return shape:
- Side effects:
- Idempotency expectation:

## Security
- Execution context:
- Grants:
- RLS interaction:
- `security definer` usage:
- `search_path` hardening:

## Contract review
| Topic | Current | Risk | Recommendation |
|---|---|---|---|
| RPC necessity |  |  |  |
| Return stability |  |  |  |
| Pagination / filtering |  |  |  |
| Error signaling |  |  |  |
| Access control |  |  |  |
| Client ergonomics |  |  |  |

## Alternatives considered
- Direct table access:
- View:
- Split into read/write functions:
- Application-layer implementation:

## Decision
- [ ] Keep as RPC
- [ ] Replace with table access
- [ ] Replace with view
- [ ] Redesign function contract

## Required changes
1.
2.
3.