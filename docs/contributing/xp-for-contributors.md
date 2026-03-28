# XP for Contributors

LenserFight rewards open-source contributors with XP. Contributing to the main project is the highest-value action in the entire XP system.

## How It Works

When your contribution is verified (via GitHub webhook or admin grant), the system:

1. Maps your contribution type and repository to the appropriate XP rule
2. Applies the difficulty multiplier
3. Records an immutable XP event linked to your contribution record
4. Updates your totals, level, and seasonal standings

## Contribution Contexts

Contributions are classified by where the work happens:

| Context | Description | Rule used |
|---------|------------|----------|
| `main_project` | Core LenserFight monorepo (`connectlens-org/lenserfight-web`) | `CONTRIB_PR_MERGED_MAIN` |
| `community_plugin` | Community plugins, adapters, integrations | `CONTRIB_PR_MERGED_COMMUNITY` |
| `infrastructure` | CI/CD, DevOps, tooling | `CONTRIB_PR_MERGED_COMMUNITY` |
| `documentation` | Documentation improvements | `CONTRIB_PR_MERGED_DOCS` |

## XP Rewards

| Contribution | Base XP | Difficulty | Effective XP | Max/day | Max XP/season |
|-------------|--------|-----------|-------------|--------|--------------|
| PR merged — main project | 500 | legendary (×2.5) | **1,250** | 2 events / 1,000 XP | 3,000 |
| PR merged — community / infra | 200 | hard (×1.5) | **300** | 3 events / 600 XP | 2,000 |
| PR merged — documentation | 100 | standard (×1.0) | **100** | 5 events / 400 XP | 1,500 |
| Issue filed | 30 | easy (×0.75) | **23** | 5 events / 100 XP | 500 |
| Code review given | 40 | standard (×1.0) | **40** | 5 events / 150 XP | 600 |

## Linking Your GitHub

To receive automatic XP for contributions, link your GitHub account in your LenserFight profile settings (social links section). The system matches your GitHub username to incoming webhook events.

If your GitHub is not linked, an admin can manually grant contribution XP.

## Anti-Gaming Measures

| Control | Detail |
|---------|--------|
| Daily event caps | Prevents a single day of mass-merging from dominating the leaderboard |
| Season caps | 3,000 XP max per season for main project PRs |
| Verification | Contributions verified via GitHub webhook signatures or admin review |
| Context classification | Repository determines context automatically; it cannot be self-reported |
| Immutable events | XP events cannot be modified after creation |

## For Maintainers

To manually grant contribution XP:

```sql
SELECT xp.grant_contribution_xp(
  p_lenser_id         := '<lenser-uuid>',
  p_context           := 'main_project',   -- or 'community_plugin', 'documentation', 'infrastructure'
  p_contribution_type := 'pr_merged',      -- or 'issue_filed', 'review_given'
  p_external_ref      := 'github:connectlens-org/lenserfight-web#456',
  p_title             := 'Fix XP season cap query'
);
```

Valid `p_contribution_type` values: `pr_merged`, `issue_filed`, `review_given`.

This returns the contribution ID and handles all XP pipeline logic (multiplier, daily cap, season cap, totals, level recalculation).
