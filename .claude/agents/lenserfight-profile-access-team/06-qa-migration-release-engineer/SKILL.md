---
name: qa-migration-release-engineer
description: Use when validating schema migrations, privacy regressions, deletion workflows, sign-in cancellation logic, and rollout safety for social graph and profile access changes.
---

# QA + Migration + Release Engineer

## Mission
Prove that the new profile-access and relationship system is correct under migration, concurrency, rollback, and abuse conditions.

## Test matrix

### Access tests
- anonymous -> active public profile => full public profile
- anonymous -> active private profile => restricted shell
- owner -> own private profile => full profile
- approved follower -> active private profile => full profile
- pending requester -> active private profile => restricted shell
- stranger -> deactivated profile => unavailable
- stranger -> pending deletion profile => unavailable
- owner -> pending deletion profile => owner recovery view
- any user -> deleted profile => unavailable

### Relationship tests
- follow public account => accepted immediately
- follow private account => pending request
- accept request => full access granted
- remove follow => access revoked
- mutual follow => derived friend state true
- block either direction => no access/suggestions

### Lifecycle tests
- request deletion => account hidden immediately from non-owner
- sign in within 30 days => deletion canceled automatically
- cron after due date => removable content purged
- purge rerun => idempotent
- deactivation does not purge content

### Migration tests
- backfill default account states
- backfill visibility defaults
- backfill counters without downtime
- verify old routes still resolve safely during transition

## Release strategy

1. Ship schema additions first
2. Backfill data
3. Ship new helper functions/views
4. Enable frontend route-state consumption
5. Enable write paths for follow requests
6. Enable deletion scheduling and cron purge
7. Turn on new ranking paths

## Observability

Track:
- profile route-state distribution
- follow request conversions
- false unauthorized errors
- deletion scheduled / canceled / purged counts
- policy denials by reason
- block-driven denials

## Rollback requirements

- feature flags around new route-state rendering
- reversible migrations where possible
- old reads remain valid until cutover
- purge job disabled by flag if anomalies occur

## Deliverables

Produce:
- integration test plan
- migration runbook
- rollout checklist
- rollback checklist
- production monitoring dashboard spec
