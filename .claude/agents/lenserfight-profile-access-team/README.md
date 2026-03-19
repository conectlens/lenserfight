# LenserFight AI Agent Team: Profile Privacy, Social Graph, and Lifecycle

This team is designed to implement:

- private profile access rules
- follower / following / friendship mechanics
- restricted-profile rendering on `/lenser/:username/:slug`
- deactivated vs deleted account behavior
- 30-day deletion grace period with automatic cancellation on sign-in
- feed and graph rules aligned with Instagram/X-style social visibility patterns

## Core product decisions

1. `visibility=private` does **not** mean the profile disappears.
   - owner can always access full profile
   - approved followers can access full profile
   - non-followers can access a **restricted profile shell** if the account is active

2. Restricted profile shell should expose only low-risk public identity metadata:
   - display name
   - username
   - avatar
   - xp summary
   - badge summary
   - follower/following counts if allowed by product policy
   - lock icon and follow-request / follow-state UX

3. Deactivated vs deleted must be separate states.
   - **deactivated**: profile hidden from others, owner can still access after signing in, deletion is not implied
   - **pending deletion**: hidden from others, owner can reactivate within 30 days by signing in
   - **deleted/purged**: all public access denied; removable content purged by scheduled jobs; legal/compliance data retained

4. Social graph must support both:
   - asymmetric follow model (Instagram/X baseline)
   - optional mutual-friend derived state for UX, moderation, and community features

5. The implementation should prefer:
   - explicit account states
   - explicit relationship states
   - deterministic RLS and helper SQL functions
   - denormalized counters updated via triggers/jobs
   - no privacy logic only in frontend

## Team structure

- `00-orchestrator/` — owns decomposition, acceptance criteria, sequencing
- `01-product-policy-architect/` — translates product rules into platform policy
- `02-supabase-social-graph-engineer/` — designs tables, constraints, graph flows
- `03-supabase-rls-lifecycle-engineer/` — designs RLS, soft-delete, grace period, cron jobs
- `04-frontend-profile-ux-engineer/` — implements routing, shells, restricted views, lock UX
- `05-feed-ranking-relationship-engineer/` — upgrades social ranking and visibility propagation
- `06-qa-migration-release-engineer/` — migration safety, tests, rollout, incident handling

## Recommended delivery order

1. Product policy and state model
2. Database schema and relationship tables
3. Account lifecycle and deletion workflow
4. RLS / RPC / SQL helper functions
5. Frontend restricted-profile rendering
6. Feed-ranking and social graph refinement
7. QA, migration verification, and release

## Strategic note

This split also matches LenserFight's broader product direction: keep core engine and community mechanics credible and extensible, while retaining differentiating social data and ranking behavior as platform leverage, consistent with the uploaded strategy memo. fileciteturn1file4L1-L13
