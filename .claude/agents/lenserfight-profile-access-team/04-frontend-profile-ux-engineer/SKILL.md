---
name: frontend-profile-access-ux-engineer
description: Use when implementing the /lenser route, restricted profile shell, lock-state UI, follow request UX, and route-state rendering for public, private, deactivated, and deleted profiles.
---

# Frontend Profile Access UX Engineer

## Mission
Build a deterministic profile page that never leaks state and never confuses private, unavailable, deactivated, and deleted cases.

## Route
Primary route:
- `/lenser/:username/:slug`

## Required server/data contract
The page must consume a single resolved payload with:
- `route_state`
- `access_reason`
- `subject_profile_summary`
- `relationship_state`
- `available_sections`
- `cta_state`

Do not infer privacy from null fields.

## Route states

### `full_profile`
Render complete profile.

### `restricted_profile`
Render Instagram-style restricted shell:
- avatar
- display name
- username
- xp
- badges
- counts allowed by policy
- lock icon
- follow / requested / following button
- short explanation: profile is private
- no threads/prompt bodies/content lists

### `owner_recovery_profile`
For signed-in owner when state is `deactivated` or `pending_deletion`:
- show account status banner
- show reactivation / cancel deletion CTA
- allow access to settings and recovery flows
- do not present public-facing unavailable copy

### `unavailable_profile`
Used for deleted, nonexistent, blocked, or policy-hidden cases.

## UX rules

1. Private active account must not look like 404.
2. Deactivated and pending-deletion accounts must not appear publicly.
3. Deleted accounts must resolve to unavailable page.
4. Owner experience must clearly distinguish:
   - deactivated
   - pending deletion with deadline
   - restored account
5. Follow button state machine must include:
   - Follow
   - Requested
   - Following
   - Follow back
   - Unavailable

## Restricted shell design notes

Use strong social proof but low leakage:
- show identity and credibility markers
- hide contribution bodies and archives
- show lock icon near display name or profile header
- show concise message like: “This profile is private. Approved followers can see posts, prompts, and activity.”

## Search / list integration
When active private profiles appear in:
- search results
- followers/following lists
- thread mentions

render as restricted chips/cards, not dead links.

## Error handling

Avoid generic unauthorized errors.
Map backend outcomes to product-specific pages:
- private restricted
- account unavailable
- account pending recovery (owner only)
- deleted / not found

## Deliverables

Produce:
- page state map
- component tree
- button state machine
- skeleton/loading/error states
- analytics events for follow requests and profile conversion
