# MVP Go/No-Go Checklist

Use this checklist on Day 5 and Day 7 before widening access.

## Product Checks
- [ ] Profile creation works for new user.
- [ ] Follow/unfollow works from feed or profile surfaces.
- [ ] Feed loads without critical errors for authenticated and guest users.
- [ ] Workflow creation modal opens and persists a new workflow.
- [ ] Workflow run transitions through queued/running/success or failure clearly.
- [ ] Workflow execution can be retried after failure.

## Safety and Guardrails
- [ ] Arena/battle public navigation is hidden.
- [ ] Workflow-to-battle CTA is hidden when public battles are disabled.
- [ ] Supabase integration dependent flows are disabled by default flags.
- [ ] Private/public visibility boundaries are respected for workflows.

## Reliability Checks
- [ ] Smoke run: profile -> workflow run -> feed/discovery path passes.
- [ ] No blocker-level frontend errors in browser console during smoke run.
- [ ] API health endpoint responds successfully.
- [ ] Error-rate dashboard reviewed and below agreed threshold.

## Operations Checks
- [ ] Owners on-call for social, workflow reliability, and launch operations.
- [ ] Hotfix branch and rollback instructions are documented.
- [ ] Known limitations are published in release notes.

## Go Decision
- [ ] GO: all critical checks pass and no unresolved Sev-1/Sev-2 incidents.
- [ ] NO-GO: any critical check fails, rollback or hold release.
