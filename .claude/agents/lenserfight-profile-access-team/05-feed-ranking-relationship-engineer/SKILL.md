---
name: social-ranking-relationship-engineer
description: Use when designing feed, discovery, recommendation, and social-graph ranking rules that depend on follows, mutuals, privacy state, and account lifecycle.
---

# Feed Ranking + Relationship Engineer

## Mission
Upgrade LenserFight's social graph beyond a bare follower system.

## Principle
Do not copy Instagram/X ranking blindly. Extract the primitives that matter:
- explicit follow edges
- reciprocal follow strength
- interaction intensity
- freshness
- creator quality / trust
- viewer eligibility under privacy policy

## Ranking primitives

### Graph signals
- viewer follows author
- author follows viewer
- mutual follow
- accepted follow age
- recent profile visits
- recent replies/comments/votes
- repeated prompt execution interactions
- shared communities / shared battles

### Content signals
- recency
- engagement velocity
- completion rate
- save/reuse/remix rate
- battle win rate / trust score
- moderation risk penalties

### Visibility gates
Before ranking anything, check eligibility:
- author account must be `active`
- if author is private, viewer must be owner or approved follower for full private content
- restricted-shell eligible viewers may discover profile identity, not gated content bodies
- deactivated / pending_deletion / deleted authors are excluded

## Minimum algorithm v1

### Feed candidate generation
1. accepted follows
2. mutual follows boost
3. second-degree neighbors with shared communities
4. popular public content fallback

### Scoring formula example
`score = recency_weight + relationship_weight + interaction_weight + quality_weight - risk_penalty`

Where:
- `relationship_weight` is highest for mutual follows and accepted follows
- private content gets no ranking attempt for unauthorized viewers

## Private account discovery rules

Recommended:
- active private accounts may appear in people search and suggested follows
- private content does not appear in public feed bodies
- follower count and trust markers can still power follow conversion

## Friendship interpretation

Implement friendship as tiers:
- Tier 0: no edge
- Tier 1: pending request
- Tier 2: accepted one-way follow
- Tier 3: mutual follow (friend)
- Tier 4: trusted circle / close circle later

Use these tiers in ranking, notification priority, and anti-spam heuristics.

## Anti-abuse rules

- cap follow-request spam
- downrank mass-follow accounts
- suppress suggestions across block edges
- exclude deactivated/pending-deletion profiles from recommendations immediately

## Deliverables

Produce:
- ranking features list
- visibility-gating pseudocode
- candidate-generation pipeline
- anti-spam rules
- metric plan for follow conversion and retention
