# MVP Launch Ops Runbook

Operational runbook for controlled release, KPI monitoring, and hotfix triage.

## Release Strategy

- Stage 1: internal team + selected community testers.
- Stage 2: broaden to waitlist users after 24h stable signals.
- Stage 3: continue controlled expansion if Sev-1/Sev-2 remains zero.

## Monitoring Windows

- T+0 to T+4h: monitor every 30 minutes.
- T+4h to T+24h: monitor every 2 hours.
- Day 2 to Day 7: monitor twice daily and during deployments.

## KPI Dashboard Checklist

- Activation: profile created + first workflow run.
- Engagement: feed interactions and first follow action.
- Retention proxy: second workflow run within 48h.
- Reliability:
  - workflow run success rate
  - feed load p95
  - API error rate

## Incident Triage

### Severity
- Sev-1: complete outage or data loss risk.
- Sev-2: major flow blocked (profile, workflow run, feed).
- Sev-3: degraded UX with workaround.

### Response
- Assign incident owner immediately.
- Mitigate user impact first (feature flag, rollback, traffic reduction).
- Ship fix after smoke verification of critical loop.
- Publish a short incident note for stakeholders.

## Hotfix Workflow

1. Create fix branch from release branch.
2. Apply focused fix (no opportunistic refactors).
3. Run:
   - `npm run mvp:readiness`
   - targeted smoke checks for profile/workflow/feed
4. Merge and deploy.
5. Re-check KPIs and error trends within 30 minutes.

## Rollback Criteria

- Any unresolved Sev-1 at release stage.
- Sev-2 persisting beyond agreed SLA.
- Workflow success rate drops below acceptable threshold.
- Feed/API latency or error spikes sustained after mitigation.
