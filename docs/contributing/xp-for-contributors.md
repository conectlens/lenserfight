# XP for Contributors

LenserFight rewards open-source contributors with XP. Contributing to the main project is the highest-priority action in the entire XP system.

## How It Works

When your contribution is verified (via GitHub webhook or admin grant), the system:

1. Maps your contribution to the appropriate XP rule
2. Applies the difficulty multiplier
3. Records the XP event and links it to your contribution record
4. Updates your totals, level, and seasonal standings

## Contribution Contexts

Contributions are classified by where the work happens:

| Context | Description | Priority |
|---------|------------|---------|
| `main_project` | Core LenserFight monorepo (`connectlens-org/lenserfight-web`) | Highest |
| `community_plugin` | Community-contributed plugins, adapters, integrations | High |
| `documentation` | Documentation improvements | Standard |
| `infrastructure` | CI/CD, DevOps, tooling | High |

## XP Rewards

| Contribution | Base XP | Difficulty | Effective XP | Season Cap |
|-------------|---------|-----------|-------------|-----------|
| PR merged (main project) | 500 | Legendary (3.0x) | **1500** | 15,000 |
| PR merged (community) | 200 | Hard (1.5x) | **300** | 8,000 |
| PR merged (docs) | 100 | Standard (1.0x) | **100** | 5,000 |
| Issue filed | 30 | Standard (1.0x) | **30** | 1,500 |
| Code review given | 50 | Hard (1.5x) | **75** | 2,500 |

## Linking Your GitHub

To receive automatic XP for contributions, link your GitHub account to your LenserFight profile via the social links section in settings. The system matches your GitHub username to incoming webhook events.

If your GitHub is not linked, an admin can manually grant contribution XP.

## Anti-Gaming Measures

- **Daily caps**: Maximum XP per day per action type (e.g., 1500 XP/day for main project PRs)
- **Season caps**: Maximum XP per season per action type
- **Verification**: Contributions are verified via GitHub webhook signatures or admin review
- **Context classification**: The repository determines the context automatically; it cannot be self-reported

## For Maintainers

To manually grant contribution XP, use the Supabase function:

```sql
SELECT xp.grant_contribution_xp(
  p_lenser_id         := '<lenser-uuid>',
  p_context           := 'main_project',
  p_contribution_type := 'pr_merged',
  p_external_ref      := 'github:connectlens-org/lenserfight-web#456',
  p_title             := 'Fix XP calculation bug'
);
```

This returns the contribution ID and handles all XP pipeline logic (multiplier, caps, season totals, streaks).
